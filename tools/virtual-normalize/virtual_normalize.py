#!/usr/bin/env python3
import argparse
import base64
import json
import os
import re
import shutil
import sqlite3
import sys
import time
from pathlib import Path
from typing import List, Optional

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  src_path TEXT NOT NULL,
  rel_src TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','processing','done','error')) DEFAULT 'pending',
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_rel_src ON jobs(rel_src);
"""

DEBUG = False

def debug_log(*parts):
    if not DEBUG:
        return
    try:
        msg = " ".join(str(p) for p in parts)
    except Exception:
        msg = " ".join(parts)
    print(f"[virtual-normalize] {msg}", file=sys.stderr)


def ensure_db(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.executescript(DB_SCHEMA)
    debug_log("DB initialized at", db_path)
    return conn


def scan_and_enqueue(conn: sqlite3.Connection, input_dir: Path) -> int:
    now = int(time.time())
    inserted = 0
    for root, dirs, files in os.walk(input_dir):
        for name in files:
            src_path = Path(root) / name
            if not src_path.is_file():
                continue
            rel_src = str(src_path.relative_to(input_dir))
            try:
                conn.execute(
                    "INSERT INTO jobs(src_path, rel_src, status, created_at, updated_at) VALUES(?,?,?,?,?)",
                    (str(src_path), rel_src, 'pending', now, now),
                )
                inserted += 1
            except sqlite3.IntegrityError:
                # Already present
                pass
    conn.commit()
    debug_log("Scan complete. Newly enqueued:", inserted)
    return inserted


def sanitize_relative_path(path_str: str) -> str:
    # Normalize separators
    path_str = path_str.replace('\\', '/').strip()
    # Remove leading slashes
    path_str = re.sub(r"^/+", "", path_str)
    # Prevent path traversal
    parts = []
    for part in path_str.split('/'):
        if part in ('', '.', '..'):
            continue
        # Strip illegal filesystem characters conservatively (also remove quotes/backticks)
        part = re.sub(r"[<>:\\|?*\0'" + "\"]", "_", part)
        part = part.strip()
        if part:
            parts.append(part)
    safe = "/".join(parts)
    if not safe:
        safe = "unnamed"
    return safe


# Strictly sanitize a single filename/folder component (no slashes)
def sanitize_name_component(name: str) -> str:
    name = (name or "").strip()
    # Replace slashes and backslashes with underscore
    name = name.replace('/', '_').replace('\\', '_')
    # Remove problematic characters including quotes/backticks and control chars
    name = re.sub(r"[<>:\\|?*\0'\"`]+", "_", name)
    # Collapse whitespace to single spaces then convert spaces to underscores
    name = re.sub(r"\s+", " ", name).strip()
    name = name.replace(" ", "_")
    # Collapse multiple underscores
    name = re.sub(r"_+", "_", name).strip('_')
    return name or "unnamed"


def sanitize_human_filename(name: str) -> str:
    # Remove illegal characters but keep spaces, dots, dashes, parentheses, Kazakh/Cyrillic letters
    name = (name or "").strip()
    # Replace illegal characters with space
    name = re.sub(r"[<>:\\/|?*\0'\"`]+", " ", name)
    # Collapse whitespace to single spaces
    name = re.sub(r"\s+", " ", name).strip()
    # Windows: avoid trailing space or dot
    name = name.rstrip(" .")
    return name or "unnamed"


# Note: All filenames will be produced in Kazakh; no transliteration by default


def normalize_season_episode(value: str) -> str:
    value = (value or "").strip().upper()
    match = re.search(r"S(?P<season>\d{1,2})E(?P<episode>\d{1,2})", value)
    if not match:
        alt = re.search(r"(?P<season>\d{1,2})[X](?P<episode>\d{1,2})", value)
        match = alt
    if not match:
        raise ValueError(f"Unable to parse season/episode from '{value}'")
    season = int(match.group('season'))
    episode = int(match.group('episode'))
    return f"S{season:02d}E{episode:02d}"


def collect_existing_series(output_dir: Path) -> List[str]:
    if not output_dir.exists():
        return []
    names = []
    for entry in sorted(output_dir.iterdir()):
        if entry.is_dir():
            names.append(entry.name)
    return names


def prepare_video_payload(src_path: Path, max_bytes: int = 262144) -> Optional[dict]:
    try:
        total_size = src_path.stat().st_size
        with open(src_path, 'rb') as fh:
            chunk = fh.read(max_bytes)
    except Exception as exc:
        debug_log("Failed to read video payload", exc)
        return None
    encoded = base64.b64encode(chunk).decode('ascii')
    return {
        "bytes_sampled": len(chunk),
        "total_bytes": total_size,
        "truncated": total_size > len(chunk),
        "base64": encoded,
    }


def parse_json_response(raw: str) -> dict:
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def get_openai_client():
    # Lazy import to avoid dependency when listing help
    try:
        from openai import OpenAI
    except ImportError:
        print("Please install dependencies: pip install -r tools/virtual-normalize/requirements.txt", file=sys.stderr)
        sys.exit(1)
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("OPENAI_API_KEY is required", file=sys.stderr)
        sys.exit(2)
    debug_log("OpenAI client ready")
    return OpenAI(api_key=api_key)


def _chat_completion(client, model: str, messages: List[dict], response_format: Optional[dict] = None):
    kwargs = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 1000,
    }
    if response_format:
        kwargs["response_format"] = response_format
    return client.chat.completions.create(**kwargs)


class NormalizationConfig:
    def __init__(self, name: str, compute_new_relative_path):
        self.name = name
        self.compute_new_relative_path = compute_new_relative_path


class VirtualNormalizer:
    def __init__(self, input_dir: Path, output_dir: Path, model: str, debug: bool = False):
        global DEBUG
        DEBUG = bool(debug)
        self.input_dir = input_dir.resolve()
        self.output_dir = output_dir.resolve()
        self.model = model
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.output_dir / '.virtual_normalize.db'
        self.conn = ensure_db(self.db_path)

    def enqueue_all(self) -> int:
        return scan_and_enqueue(self.conn, self.input_dir)

    def run_once(self, config: NormalizationConfig) -> bool:
        reserved = reserve_next_job(self.conn)
        if not reserved:
            return False
        job_id, src_path, rel_src = reserved
        try:
            if not src_path.exists():
                raise FileNotFoundError(f"Missing source: {src_path}")
            new_rel = config.compute_new_relative_path(src_path, rel_src, self.output_dir, self.model)
            dest_path = self.output_dir / new_rel
            debug_log("Linking ->", dest_path, "from", src_path)
            create_link_with_fallback(src_path, dest_path)
            complete_job(self.conn, job_id)
        except Exception as e:
            fail_job(self.conn, job_id, str(e))
        return True

    def run(self, config: NormalizationConfig, once: bool = False):
        enq = self.enqueue_all()
        debug_log("Input dir:", self.input_dir, "Output dir:", self.output_dir, "Model:", self.model, "Enqueued:", enq)
        if once:
            self.run_once(config)
            return
        while True:
            progressed = self.run_once(config)
            if not progressed:
                break


@retry(reraise=True, stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8), retry=retry_if_exception_type(Exception))
def ask_chatgpt_for_path_basic(src_path: Path, rel_src: str, model: str) -> str:
    client = get_openai_client()
    name = src_path.name
    ext = src_path.suffix
    messages = [
        {"role": "system", "content": "You are an assistant that outputs only file paths."},
        {
            "role": "user",
            "content": (
                "You are renaming files to a clean, readable, structured relative path for a TV channel.\n"
                "Rules:\n"
                "- Return only the new RELATIVE PATH using forward slashes. No extra text.\n"
                "- Keep the original file extension.\n"
                "- Avoid special characters; use letters, numbers, dashes, and slashes.\n"
                "- Video file names should not contain technical designations, except for the episode and season number, and remove numbers at the end if they are not justified.\n"
                "- Base your decision on the file name and its relative source path.\n\n"
                f"Source relative path: {rel_src}\nFilename: {name}\nKeep extension: {ext}"
            ),
        },
    ]
    debug_log("ChatGPT basic path request model=", model, "rel_src=", rel_src)
    resp = _chat_completion(client, model, messages)
    text = resp.choices[0].message.content.strip()
    debug_log("ChatGPT basic path response=", text)
    return sanitize_relative_path(text)


@retry(reraise=True, stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8), retry=retry_if_exception_type(Exception))
def ask_chatgpt_for_original_name(src_path: Path, rel_src: str, model: str) -> str:
    client = get_openai_client()
    messages = [
        {
            "role": "system",
            "content": (
                "Сен телехикаяның түпнұсқа атауын анықтауға көмектесетін көмекшісің."
                " Тек ресми түпнұсқа атауды қайтар."
                " ЖАУАП: атау тек қазақ тілінде (Kazakh) болуы керек."
            ),
        },
        {
            "role": "user",
            "content": (
                "We have a video file that likely belongs to a TV series."
                f" Relative path: {rel_src}."
                f" File name: {src_path.name}."
                " Reply with the official original series title in Kazakh only."
            ),
        },
    ]
    debug_log("ChatGPT original name request model=", model, "rel_src=", rel_src)
    resp = _chat_completion(client, model, messages)
    text = resp.choices[0].message.content.strip()
    debug_log("ChatGPT original name response=", text)
    return text


@retry(reraise=True, stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8), retry=retry_if_exception_type(Exception))
def ask_chatgpt_for_details(
    src_path: Path,
    rel_src: str,
    model: str,
    known_series: List[str],
    original_title: str,
    original_title_transliterated: str,
) -> dict:
    client = get_openai_client()
    # Limit size of known_series to prevent context overflow
    limit = int(os.environ.get("VN_KNOWN_SERIES_LIMIT", "200"))
    trimmed_series = list(known_series)[:max(0, limit)]
    messages = [
        {
            "role": "system",
            "content": (
                "You identify TV series information given a filename, relative path,"
                " an optional original title, and a short list of existing series names."
                " Respond in valid JSON with keys: series_title, season_episode, confidence, notes."
                " season_episode must be like 'S01E01'."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "rel_src": rel_src,
                    "filename": src_path.name,
                    "original_title": original_title,
                    "original_title_transliterated": original_title_transliterated,
                    "known_series": trimmed_series,
                },
                ensure_ascii=False,
            ),
        },
    ]
    debug_log("ChatGPT details request (no video payload), known_series=", len(trimmed_series), "model=", model)
    resp = _chat_completion(
        client,
        model,
        messages,
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content
    debug_log("ChatGPT details response=", raw)
    data = parse_json_response(raw)
    if "series_title" not in data or "season_episode" not in data:
        raise ValueError("ChatGPT response missing required fields")
    data["season_episode"] = normalize_season_episode(data["season_episode"])
    return data


def ensure_parent_dir(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)


def _unique_dest_path(link_path: Path) -> Path:
    if not link_path.exists():
        return link_path
    parent = link_path.parent
    stem = link_path.stem
    suffix = link_path.suffix
    counter = 1
    while True:
        candidate = parent / f"{stem} ({counter}){suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def create_link_with_fallback(target: Path, link_path: Path):
    if link_path.exists() or link_path.is_symlink():
        link_path = _unique_dest_path(link_path)
    ensure_parent_dir(link_path)
    try:
        link_path.symlink_to(target)
        debug_log("Created symlink ->", link_path, "=>", target)
        return
    except Exception:
        pass
    # Try hardlink
    try:
        os.link(str(target), str(link_path))
        debug_log("Created hardlink ->", link_path, "=>", target)
        return
    except Exception:
        pass
    # Fallback to copy
    shutil.copy2(str(target), str(link_path))
    debug_log("Copied file ->", link_path, "<=", target)


def reserve_next_job(conn: sqlite3.Connection):
    now = int(time.time())
    cur = conn.execute(
        "SELECT id, src_path, rel_src FROM jobs WHERE status IN ('pending','error') ORDER BY id LIMIT 1"
    )
    row = cur.fetchone()
    if not row:
        debug_log("No jobs to reserve")
        return None
    job_id, src_path, rel_src = row
    conn.execute("UPDATE jobs SET status='processing', updated_at=? WHERE id=?", (now, job_id))
    conn.commit()
    debug_log("Reserved job", job_id, "rel_src=", rel_src)
    return job_id, Path(src_path), rel_src


def complete_job(conn: sqlite3.Connection, job_id: int):
    now = int(time.time())
    conn.execute("UPDATE jobs SET status='done', error=NULL, updated_at=? WHERE id=?", (now, job_id))
    conn.commit()
    debug_log("Completed job", job_id)


def fail_job(conn: sqlite3.Connection, job_id: int, error_msg: str):
    now = int(time.time())
    conn.execute("UPDATE jobs SET status='error', error=?, updated_at=? WHERE id=?", (error_msg[:500], now, job_id))
    conn.commit()
    debug_log("Failed job", job_id, "error=", error_msg)


def run_once(conn: sqlite3.Connection, input_dir: Path, output_dir: Path, model: str, config: NormalizationConfig):
    # Backward-compatible thin wrapper to the class method
    normalizer = VirtualNormalizer(input_dir, output_dir, model, debug=DEBUG)
    return normalizer.run_once(config)


def main():
    parser = argparse.ArgumentParser(description="Virtual normalize: create virtual renamed view with ChatGPT")
    parser.add_argument('--input-dir', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--once', action='store_true', help='Process a single file then exit')
    parser.add_argument('--model', default=os.environ.get('OPENAI_MODEL', 'gpt-4o'))
    parser.add_argument('--debug', action='store_true', help='Enable verbose debug logging')
    args = parser.parse_args()

    normalizer = VirtualNormalizer(Path(args.input_dir), Path(args.output_dir), args.model, debug=args.debug)

    def compute_basic(src_path: Path, rel_src: str, output_dir: Path, model: str) -> str:
        new_rel = ask_chatgpt_for_path_basic(src_path, rel_src, model=model)
        if not Path(new_rel).suffix and Path(rel_src).suffix:
            new_rel = new_rel + Path(rel_src).suffix
        return new_rel
    config = NormalizationConfig('basic', compute_basic)

    normalizer.run(config, once=bool(args.once))


if __name__ == '__main__':
    main()


