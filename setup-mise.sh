#!/bin/bash

# Picks the mise data directory based on location (school vs home).
# Run automatically by `mise run start`.

if [ -d "$HOME/goinfre" ]; then
  # At school: copy the template to root so mise uses the goinfre data dir
  cp dev/mise.local.toml mise.local.toml
  echo "✓ Using school setup (goinfre)"
else
  # Elsewhere: remove the root copy (the template stays in dev/)
  rm -f mise.local.toml
  echo "✓ Using home setup"
fi
