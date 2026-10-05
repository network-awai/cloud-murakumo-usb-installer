#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo"
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/murakumo-config-test.XXXXXX")
trap 'rm -rf "$test_dir"' EXIT
node --input-type=module - "$repo" "$test_dir" <<'EOF'
import {targetConfiguration} from './scripts/install-disk.mjs';
import {mkdirSync, writeFileSync, copyFileSync} from 'node:fs';
import {join} from 'node:path';
const [repo, dir] = process.argv.slice(2);
for (const mode of ['bios', 'uefi']) {
  const destination = join(dir, mode);
  mkdirSync(destination);
  writeFileSync(join(destination, 'hardware-configuration.nix'), '{ ... }: { boot.initrd.availableKernelModules = [ "virtio_pci" "virtio_blk" "nvme" ]; }\n');
  for (const name of ['node-base.nix', 'account-link.mjs']) copyFileSync(join(repo, 'nixos', name), join(destination, name));
  writeFileSync(join(destination, 'configuration.nix'), targetConfiguration({uefi: mode === 'uefi', disk: '/dev/nvme0n1', rootUuid: '01010101-0202-0303-0404-050505050505', bootUuid: '1234-ABCD'}));
}
EOF
for mode in bios uefi; do
  config="$test_dir/$mode/configuration.nix"
  nix-instantiate --parse "$config" >/dev/null
  MURAKUMO_TEST_CONFIG="$config" nix-instantiate --eval --strict --expr 'let s = import <nixpkgs/nixos> { configuration = builtins.toPath (builtins.getEnv "MURAKUMO_TEST_CONFIG"); system = "x86_64-linux"; }; in s.config.system.build.toplevel.drvPath'
done
