#!/usr/bin/env bash
set -euo pipefail

# --- Сетевые лимиты (tc). Нужен cap NET_ADMIN ---
apply_tc() {
  command -v tc >/dev/null 2>&1 || return 0
  local dev="${NET_DEV:-eth0}"
  local up="${UP_KBIT:-0}"
  local down="${DOWN_KBIT:-0}"

  # Снимаем прежние qdisc (если есть)
  tc qdisc del dev "$dev" root 2>/dev/null || true
  tc qdisc del dev "$dev" ingress 2>/dev/null || true

  # Ограничение исходящего (upload)
  if [[ -n "$up" && "$up" != "0" ]]; then
    tc qdisc add dev "$dev" root tbf rate "${up}kbit" burst 32k latency 400ms
  fi

  # Ограничение входящего (download)
  if [[ -n "$down" && "$down" != "0" ]]; then
    tc qdisc add dev "$dev" handle ffff: ingress
    tc filter add dev "$dev" parent ffff: protocol all prio 49 u32 match u32 0 0 \
      police rate "${down}kbit" burst 32k drop flowid :1
  fi
}

# --- Получаем API ключ: через переменную или секрет-файл ---
API_KEY="${API_KEY:-}"
if [[ -z "${API_KEY}" && -f /run/secrets/openai_api_key ]]; then
  API_KEY="$(cat /run/secrets/openai_api_key)"
fi
if [[ -z "${API_KEY}" ]]; then
  echo "ERROR: API_KEY не задан. Передайте через env API_KEY или смонтируйте /run/secrets/openai_api_key." >&2
  exit 1
fi

# Проверка бинарника
if [[ ! -x "${BIN}" ]]; then
  echo "ERROR: не найден исполняемый файл '${BIN}'." >&2
  exit 1
fi

# Применяем лимиты tc (если заданы)
apply_tc || true

common_args=(
  -json-field program.source
  -preserve-json
  -new-field program.title
  -in-place
  -lang "${LANG}"
  -prompt "${PROMPT}"
  -model "${MODEL}"
  -api-key "${API_KEY}"
  -individual
  -r
  -skip-existing
)

echo "== Start: $(date) =="
for n in $(seq "${START}" "${END}"); do
  in_dir="${BASE_DIR}/${n}/"
  echo "[ $(date) ] Processing: ${in_dir}"
  "${BIN}" -i "${in_dir}" "${common_args[@]}"
  echo "[ $(date) ] Done:       ${in_dir}"
done
echo "== Finish: $(date) =="
