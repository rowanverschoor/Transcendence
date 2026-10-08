#!/usr/bin/env bash
# Docker needs root on some machines and runs rootless on others, so pick
# the invocation that works here instead of hardcoding sudo.
#
# Usage: compose.sh [compose args...]   e.g. compose.sh up --build -d

set -euo pipefail

if docker version >/dev/null 2>&1; then
	exec docker compose "$@"
fi

# Docker present but daemon unreachable => needs root via sudo.
if command -v docker >/dev/null 2>&1; then
	exec sudo docker compose "$@"
fi

echo "no docker CLI on PATH; install docker (dnf install docker) first" >&2
exit 1
