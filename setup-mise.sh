#!/bin/bash

# Picks the mise data directory: goinfre at Codam, mise default elsewhere.
# Run automatically by `mise run frontend` (via the `setup` task).

if [ -d "$HOME/goinfre" ]; then
  # At Codam: copy the template to root so mise uses the goinfre data dir
  cp dev/mise.local.toml mise.local.toml
  echo "✓ mise data dir: ~/goinfre/mise (Codam)"
else
  # Elsewhere: remove the root copy (the template stays in dev/)
  rm -f mise.local.toml
  echo "✓ mise data dir: default"
fi
