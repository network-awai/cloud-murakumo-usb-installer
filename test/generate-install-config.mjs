import {targetConfiguration} from '../scripts/install-disk.mjs';
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
