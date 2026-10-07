#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: cleanup.sh <port> <state-dir>" >&2
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

if [[ ! -d "$state_dir" ]]; then
  echo "state directory does not exist: $state_dir" >&2
  exit 1
fi

canonical_state_dir="$(cd "$state_dir" && pwd -P)"
owner_file="$canonical_state_dir/.stave-verification-owner"

if [[ "$canonical_state_dir" == "/" || "$canonical_state_dir" == "$user_home" || "$canonical_state_dir" == "$repo_root" ]]; then
  echo "refusing unsafe state directory: $canonical_state_dir" >&2
  exit 1
fi

if [[ ! -f "$owner_file" ]]; then
  echo "refusing unmarked state directory: $canonical_state_dir" >&2
  exit 1
fi

owner_line_count="$(wc -l <"$owner_file" | tr -d ' ')"
owner_version="$(sed -n '1p' "$owner_file")"
owner_path="$(sed -n '2p' "$owner_file")"
owner_port="$(sed -n '3p' "$owner_file")"
owner_launcher_pid="$(sed -n '4p' "$owner_file")"
if [[ "$owner_line_count" != "4" || "$owner_version" != "stave-verification-v1" || "$owner_path" != "$canonical_state_dir" || "$owner_port" != "$port" || ! "$owner_launcher_pid" =~ ^[0-9]+$ ]]; then
  echo "refusing state directory with invalid ownership marker: $canonical_state_dir" >&2
  exit 1
fi

if [[ ! -f "$canonical_state_dir/launcher.pid" || "$(<"$canonical_state_dir/launcher.pid")" != "$owner_launcher_pid" ]]; then
  echo "refusing state directory with mismatched launcher identity: $canonical_state_dir" >&2
  exit 1
fi

state_dir="$canonical_state_dir"

declare -a process_tree=()

collect_process_tree() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null || return 0
  process_tree+=("$pid")

  local child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    collect_process_tree "$child"
  done
}

process_tree_contains() {
  local sought="$1"
  local existing
  for existing in "${process_tree[@]-}"; do
    [[ "$existing" == "$sought" ]] && return 0
  done
  return 1
}

if [[ -f "$state_dir/launcher.pid" ]]; then
  launcher_pid="$(<"$state_dir/launcher.pid")"
  if [[ "$launcher_pid" =~ ^[0-9]+$ ]]; then
    collect_process_tree "$launcher_pid"
  fi
fi

if [[ -f "$state_dir/electron.pid" ]]; then
  electron_pid="$(<"$state_dir/electron.pid")"
  if [[ "$electron_pid" =~ ^[0-9]+$ ]] && kill -0 "$electron_pid" 2>/dev/null; then
    if ! process_tree_contains "$electron_pid"; then
      process_tree+=("$electron_pid")
    fi
  fi
fi

port_owners="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
for owner in $port_owners; do
  if ! process_tree_contains "$owner"; then
    echo "refusing cleanup because unrecorded PID $owner owns port $port" >&2
    exit 1
  fi
done

for pid in "${process_tree[@]-}"; do
  kill "$pid" 2>/dev/null || true
done

for _ in {1..40}; do
  any_alive=false
  for pid in "${process_tree[@]-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      any_alive=true
      break
    fi
  done
  [[ "$any_alive" == false ]] && break
  sleep 0.1
done

for pid in "${process_tree[@]-}"; do
  kill -KILL "$pid" 2>/dev/null || true
done

if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "recorded process tree did not release port $port" >&2
  exit 1
fi

rm -rf -- "$state_dir"
echo "Stave verification instance cleaned up"
