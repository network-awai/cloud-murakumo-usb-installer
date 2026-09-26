#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/reviewed-nixpkgs-checkout" >&2
  exit 2
fi
nixpkgs=$(cd "$1" && pwd)
test -f "$nixpkgs/nixos/default.nix" || { echo "Not a nixpkgs checkout: $nixpkgs" >&2; exit 2; }
command -v nix-build >/dev/null 2>&1 || { echo 'nix-build is required.' >&2; exit 2; }
git -C "$nixpkgs" rev-parse HEAD
repo=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo"
nix-build "$nixpkgs/nixos" -A config.system.build.isoImage \
  -I "nixpkgs=$nixpkgs" -I "nixos-config=$repo/nixos/iso.nix"
