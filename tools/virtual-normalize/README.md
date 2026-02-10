### virtual-normalize

Minimal CLI to create a virtual, resumable, ChatGPT-assisted rename view of a directory.

- Scans an input directory recursively and enqueues all files in a local SQLite queue.
- For each file, asks ChatGPT for a sanitized relative path (keeps original extension),
  then creates a symlink in the output directory pointing to the original file
  (with hardlink/copy fallback on platforms without symlink privileges).
- Safe to stop anytime; on the next run it resumes from the last successful file.

### Usage

```bash
yarn run -s python tools/virtual-normalize/virtual_normalize.py \
  --input-dir "<path-to-input>" \
  --output-dir "<path-to-output>" \
  --debug
```

Environment variables:
- `OPENAI_API_KEY` – required for ChatGPT rename.
- `OPENAI_MODEL` – optional; defaults to `gpt-4o-mini`.

Notes:
- The tool maintains a queue database at `<output-dir>/.virtual_normalize.db`.
- If symlinks are not supported (e.g., Windows without Developer Mode/admin),
  it will attempt a hardlink, and if that fails, it will copy the file.

Process control:
- Add `--once` to process a single file and exit (useful for cron/batches).
- Add `--debug` to print verbose progress and API steps to stderr.


