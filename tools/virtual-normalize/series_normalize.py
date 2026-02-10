#!/usr/bin/env python3
import argparse
import os
from pathlib import Path

from virtual_normalize import (
    VirtualNormalizer,
    NormalizationConfig,
    ask_chatgpt_for_original_name,
    collect_existing_series,
    get_openai_client,
    _chat_completion,
    parse_json_response,
    normalize_season_episode,
    sanitize_relative_path,
    sanitize_name_component,
    sanitize_human_filename,
)


def ask_series_details(src_path: Path, rel_src: str, model: str, known_series, original_title: str) -> dict:
    client = get_openai_client()
    trimmed_series = list(known_series)[:200]
    messages = [
        {
            "role": "system",
            "content": (
                "Сен телехикая туралы ақпаратты анықтайтын көмекшісің.\n"
                "Талаптар: тек жарамды JSON қайтар. Кілттер: series_title, season_episode, confidence, notes.\n"
                "series_title міндетті түрде тек қазақ тілінде (Kazakh) болуы керек. Латын әріптері болмасын.\n"
                "season_episode форматы: 'S01E01'.\n"
                "ЕШҚАШАН толық немесе салыстырмалы файл жолын қайтарма. ТЕК атауларды ғана қайтар."
            ),
        },
        {
            "role": "user",
            "content": (
                "Мына деректерге сүйеніп телехикаяны анықта: \n"
                + (
                    __import__('json').dumps(
                        {
                            "rel_src": rel_src,
                            "filename": src_path.name,
                            "original_title": original_title,
                            "known_series": trimmed_series,
                        },
                        ensure_ascii=False,
                    )
                )
            ),
        },
    ]
    resp = _chat_completion(client, model, messages, response_format={"type": "json_object"})
    raw = resp.choices[0].message.content
    data = parse_json_response(raw)
    if "series_title" not in data or "season_episode" not in data:
        raise ValueError("ChatGPT response missing required fields")
    data["season_episode"] = normalize_season_episode(data["season_episode"])
    return data


def compute_series_path(src_path: Path, rel_src: str, output_dir: Path, model: str) -> str:
    # Default behavior: Kazakh-only naming without transliteration
    original_title = ask_chatgpt_for_original_name(src_path, rel_src, model=model)
    known_series = collect_existing_series(output_dir)
    details = ask_series_details(src_path, rel_src, model, known_series, original_title)
    season_episode = details["season_episode"]
    ext = Path(rel_src).suffix
    # Prefer the original_title if it's in Kazakh; otherwise use series_title from details
    def is_kazakh(s: str) -> bool:
        # Treat as Kazakh if contains any Cyrillic letters typical for Kazakh
        return bool(__import__('re').search(r"[А-Яа-яӘәҒғҚқҢңӨөҰұҮүІіҺһ]", s))

    title_kz = original_title.strip() if is_kazakh(original_title) else details["series_title"].strip()
    folder = sanitize_name_component(title_kz)
    # Parse season/episode numbers
    m = __import__('re').search(r"S(\d{1,2})E(\d{1,2})", season_episode)
    season_num = int(m.group(1)) if m else 0
    episode_num = int(m.group(2)) if m else 0
    # Build human-readable filename: "Название сериала. <season> - маусым. <episode> - бөлім.ext"
    human_stem = f"{title_kz}. {season_num} - маусым. {episode_num} - бөлім"
    file_name = sanitize_human_filename(human_stem) + ext
    return f"{folder}/{file_name}"


def main():
    parser = argparse.ArgumentParser(description="Series virtual normalization (configuration on top of core engine)")
    parser.add_argument('--input-dir', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--once', action='store_true', help='Process a single file then exit')
    parser.add_argument('--model', default=os.environ.get('OPENAI_MODEL', 'gpt-4o'))
    parser.add_argument('--debug', action='store_true', help='Enable verbose debug logging')
    # Transliteration removed; filenames remain in Kazakh. Flag deprecated intentionally.
    args = parser.parse_args()

    normalizer = VirtualNormalizer(Path(args.input_dir), Path(args.output_dir), args.model, debug=args.debug)
    def compute_fn(src_path: Path, rel_src: str, output_dir: Path, model: str) -> str:
        original_title = ask_chatgpt_for_original_name(src_path, rel_src, model=model)
        known_series = collect_existing_series(output_dir)
        details = ask_series_details(src_path, rel_src, model, known_series, original_title)
        season_episode = details["season_episode"]
        ext = Path(rel_src).suffix
        title_kz = details["series_title"].strip()
        safe_title = sanitize_relative_path(title_kz)
        return f"{safe_title}/{safe_title}_{season_episode}{ext}"
    config = NormalizationConfig('series', compute_fn)
    normalizer.run(config, once=bool(args.once))


if __name__ == '__main__':
    main()


