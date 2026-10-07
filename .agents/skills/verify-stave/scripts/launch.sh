#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: launch.sh <port> <state-dir>" >&2
  exit 64
fi

port="$1"
state_dir="$2"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"
user_home="$(cd && pwd -P)"

if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
  echo "port must be an integer from 1024 through 65535" >&2
  exit 64
fi

if [[ -e "$state_dir" ]]; then
  echo "state directory already exists: $state_dir" >&2
  exit 1
fi

state_parent="$(cd "$(dirname "$state_dir")" && pwd -P)"
state_name="$(basename "$state_dir")"
canonical_state_dir="$state_parent/$state_name"

if [[ "$canonical_state_dir" == "/" || "$canonical_state_dir" == "$user_home" || "$canonical_state_dir" == "$repo_root" ]]; then
  echo "refusing unsafe state directory: $canonical_state_dir" >&2
  exit 1
fi

if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "port is already in use: $port" >&2
  exit 1
fi

mkdir -p "$state_dir/profile"
printf 'stave-verification-v1\n%s\n%s\n' "$canonical_state_dir" "$port" >"$state_dir/.stave-verification-owner"

(
  cd "$repo_root"
  export STAVE_DATA_DIR="${STAVE_DATA_DIR:-$state_dir/data}"
  exec pnpm --filter @stave/desktop exec electron-forge start -- \
    "--remote-debugging-port=$port" \
    "--user-data-dir=$state_dir/profile"
) >"$state_dir/launcher.log" 2>&1 &
launcher_pid="$!"
printf '%s\n' "$launcher_pid" >"$state_dir/launcher.pid"
printf '%s\n' "$launcher_pid" >>"$state_dir/.stave-verification-owner"

cleanup_launched_instance() {
  if kill -0 "$launcher_pid" 2>/dev/null; then
    kill "$launcher_pid" 2>/dev/null || true
  fi
}
trap cleanup_launched_instance EXIT INT TERM

for _ in {1..120}; do
  if ! kill -0 "$launcher_pid" 2>/dev/null; then
    echo "Electron Forge exited before Stave became ready" >&2
    tail -80 "$state_dir/launcher.log" >&2 || true
    exit 1
  fi

  if curl --fail --silent --max-time 1 "http://127.0.0.1:$port/json/list" >"$state_dir/cdp-pages.json" 2>/dev/null && \
    grep -q '"title": "Stave"' "$state_dir/cdp-pages.json"; then
    electron_pid="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)"
    if [[ -n "$electron_pid" ]]; then
      printf '%s\n' "$electron_pid" >"$state_dir/electron.pid"
      printf '%s\n' "$port" >"$state_dir/port"
      echo "Stave verification instance ready on CDP port $port"
      wait "$launcher_pid"
      exit $?
    fi
  fi

  sleep 0.25
done

echo "Timed out waiting for Stave on CDP port $port" >&2
tail -80 "$state_dir/launcher.log" >&2 || true
exit 1
