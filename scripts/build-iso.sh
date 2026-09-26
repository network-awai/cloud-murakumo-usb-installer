#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/pinned-nixpkgs-tree" >&2
  exit 2
fi
nixpkgs=$(cd "$1" && pwd -P)
test -f "$nixpkgs/nixos/default.nix" || { echo "Not a nixpkgs tree: $nixpkgs" >&2; exit 2; }
command -v nix-build >/dev/null 2>&1 || { echo 'nix-build is required.' >&2; exit 2; }
if [ -f "$nixpkgs/.git-revision" ]; then
  revision=$(cat "$nixpkgs/.git-revision")
elif [ -d "$nixpkgs/.git" ]; then
  test -z "$(git -C "$nixpkgs" status --porcelain)" || {
    echo 'nixpkgs checkout is dirty; review and commit it first.' >&2; exit 2;
  }
  revision=$(git -C "$nixpkgs" rev-parse HEAD)
else
  echo 'nixpkgs must be a Git checkout or an immutable Nix channel store path.' >&2
  exit 2
fi
printf '%s\n' "$revision" | grep -Eq '^[0-9a-f]{40}$' || {
  echo 'nixpkgs revision is not a full commit SHA.' >&2; exit 2;
}
echo "nixpkgs revision: $revision"
repo=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo"
nix-build "$nixpkgs/nixos" -A config.system.build.isoImage \
  -I "nixpkgs=$nixpkgs" -I "nixos-config=$repo/nixos/iso.nix"
