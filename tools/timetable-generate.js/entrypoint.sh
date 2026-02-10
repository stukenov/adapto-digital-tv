#!/usr/bin/env bash
set -euo pipefail

# --- Сетевые лимиты (tc). Нужен cap NET_ADMIN ---
apply_tc() {
  command -v tc >/dev/null 2>&1 || return 0
  local dev="${NET_DEV:-eth0}"
  local up="${UP_KBIT:-0}"
  local down="${DOWN_KBIT:-0}"

  tc qdisc del dev "$dev" root 2>/dev/null || true
  tc qdisc del dev "$dev" ingress 2>/dev/null || true

  if [[ -n "$up" && "$up" != "0" ]]; then
    tc qdisc add dev "$dev" root tbf rate "${up}kbit" burst 32k latency 400ms
  fi

  if [[ -n "$down" && "$down" != "0" ]]; then
    tc qdisc add dev "$dev" handle ffff: ingress
    tc filter add dev "$dev" parent ffff: protocol all prio 49 u32 match u32 0 0 \
      police rate "${down}kbit" burst 32k drop flowid :1
  fi
}

if [[ ! -x "${BIN}" ]]; then
  echo "ERROR: не найден исполняемый файл '${BIN}'." >&2
  exit 1
fi

apply_tc || true

mkdir -p "${OUT_DIR}"

# Общие флаги для генератора
common_args=(
  -c "${CHANNEL}"
  -lang "${LANG}"
)

[[ "${RECURSIVE}" == "true" ]] && common_args+=( -r )
[[ "${NO_ABS}" == "true" ]] && common_args+=( -no-abs )
if [[ -n "${HOST_MEDIA_PREFIX:-}" ]]; then
  common_args+=( -map-from "${BASE_DIR}" -map-to "${HOST_MEDIA_PREFIX}" )
fi
[[ "${SERIES}" == "true" ]] && common_args+=( -series )
[[ "${TIMESLOTS}" == "false" ]] && common_args+=( -timeslots=false )

if [[ -n "${EPISODES}" ]]; then
  common_args+=( -episodes "${EPISODES}" )
fi

if [[ -n "${PERIOD}" ]]; then
  common_args+=( -p "${PERIOD}" )
fi

  # Поддержка возрастных файлов (6+ и 16+) с привязкой к папкам
  # Переменные окружения:
  #   AGE_RATING_6   — путь к файлу плашки 6+
  #   AGE_RATING_16  — путь к файлу плашки 16+
  #   AGE_RATING_DEFAULT — значение по умолчанию для всех папок ("6" или "16")
  #   AGE_RATING_MAP — сопоставление папки->возраст, формат: "1=6,2=16,3=6"
  age6="${AGE_RATING_6:-}"
  age16="${AGE_RATING_16:-}"
  default_age="${AGE_RATING_DEFAULT:-}"

  declare -A AGE_MAP=()
  if [[ -n "${AGE_RATING_MAP:-}" ]]; then
    IFS=',' read -ra __pairs <<< "${AGE_RATING_MAP}"
    for __pair in "${__pairs[@]}"; do
      __key="${__pair%%=*}"
      __val="${__pair#*=}"
      if [[ -n "${__key}" && -n "${__val}" ]]; then
        AGE_MAP["${__key}"]="${__val}"
      fi
    done
  fi

# Если выбран недельный режим, пробрасываем номер недели и год (если заданы)
if [[ "${PERIOD}" == "week" ]]; then
  if [[ -n "${WEEK}" ]]; then
    common_args+=( -w "${WEEK}" )
  fi
  if [[ -n "${YEAR}" ]]; then
    common_args+=( -y "${YEAR}" )
  fi
fi

echo "== Start: $(date) =="
for n in $(seq "${START}" "${END}"); do
  in_dir="${BASE_DIR}/${n}/"
  out_dir="${OUT_DIR}/${n}/"
  mkdir -p "${out_dir}"
  echo "[ $(date) ] Processing: ${in_dir} -> ${out_dir}"

    # Определяем плашку возраста для текущей папки n
    age_for_folder="${default_age}"
    if [[ -n "${AGE_MAP[${n}]:-}" ]]; then
      age_for_folder="${AGE_MAP[${n}]}"
    fi

    age_file=""
    if [[ "${age_for_folder}" == "6" ]]; then
      age_file="${age6}"
    elif [[ "${age_for_folder}" == "16" ]]; then
      age_file="${age16}"
    fi

    # Преобразуем путь плашки из хостового префикса в контейнерный, чтобы ffprobe увидел файл
    if [[ -n "${age_file}" && -n "${HOST_MEDIA_PREFIX:-}" && -n "${BASE_DIR:-}" ]]; then
      # Нормализуем (убираем завершающий слэш у префиксов)
      host_prefix="${HOST_MEDIA_PREFIX%/}"
      container_prefix="${BASE_DIR%/}"
      case "${age_file}" in
        ${host_prefix}/*)
          age_file="${container_prefix}${age_file#${host_prefix}}"
          ;;
      esac
    fi

    run_args=( "${common_args[@]}" )
    if [[ -n "${age_file}" ]]; then
      run_args+=( -age-rating "${age_file}" )
    fi

  # Если PERIOD=week, то результов может быть несколько файлов за неделю в папках YYYY/MM
  # В остальных режимах один файл.
    "${BIN}" -dir "${in_dir}" -o "${out_dir}" "${run_args[@]}"

  echo "[ $(date) ] Done:       ${in_dir}"
done
echo "== Finish: $(date) =="


