#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: cleanup.sh <port> <state-dir>" >&2
  exit 64
fi

port="$1"
state_dir="$2"

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
