#!/bin/bash

# Uses goinfre for mise data when it is available; otherwise uses the default.
# Run automatically by `mise run setup`.

set -euo pipefail

project_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
template="$project_dir/dev/mise.local.toml"
override="$project_dir/mise.local.toml"

# If goinfre exists, use it for mise data.
if [ -d "$HOME/goinfre" ]; then
  if [ ! -e "$override" ]; then
    cp "$template" "$override"
    echo "mise data dir: ~/goinfre/mise (Codam)"
  elif cmp -s "$template" "$override"; then
    echo "mise data dir already set: ~/goinfre/mise (Codam)"
  else
    echo "error: $override already exists and is not the project template; leaving it untouched" >&2
    exit 1
  fi
# Without goinfre, remove only the generated override and keep custom overrides.
else
  if [ ! -e "$override" ]; then
    echo "mise data dir: default"
  elif cmp -s "$template" "$override"; then
    rm "$override"
    echo "mise data dir: default"
  else
    echo "warning: keeping custom $override; mise data dir was not changed" >&2
  fi
fi
