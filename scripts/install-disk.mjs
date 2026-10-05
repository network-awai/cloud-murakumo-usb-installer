#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, copyFileSync, writeFileSync, realpathSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const MIN_SIZE = 16 * 1024 ** 3;
const truth = x => x === true || x === 1 || x === '1';
const tree = disk => [disk, ...(disk.children || []).flatMap(tree)];
export function diskReason(disk, {uefi = true} = {}) {
  if (disk.type !== 'disk' || !/^\/dev\/(nvme\d+n\d+|sd[a-z]+|vd[a-z]+|mmcblk\d+)$/.test(disk.path || '')) return 'unsupported device';
  if (!uefi && disk.path.startsWith('/dev/nvme')) return 'NVMe installation requires UEFI boot';
  if (truth(disk.ro)) return 'read only';
  if (disk.tran === 'usb' || truth(disk.rm) || truth(disk.hotplug)) return 'USB/removable/hotplug';
  if (Number(disk.size) < MIN_SIZE || !Number.isSafeInteger(Number(disk.size))) return 'requires at least 16 GiB';
  if (tree(disk).some(d => (d.mountpoints || []).some(Boolean) || !['disk', 'part'].includes(d.type))) return 'mounted, swap, or mapped device';
  return null;
}
export function fingerprint(disk) {
  return JSON.stringify(['path', 'maj:min', 'size', 'model', 'serial', 'wwn', 'tran', 'rm', 'hotplug', 'ro'].map(k => disk[k] ?? null));
}
export function verifyDisk(disks, selected, identity, options) {
  const disk = disks.find(d => d.path === selected);
  if (!disk || diskReason(disk, options) || fingerprint(disk) !== identity) throw Error('Target disk changed or is now in use. Nothing will be erased.');
  return disk;
}
export function partitionPath(disk, number) { return `${disk}${/\d$/.test(disk) ? 'p' : ''}${number}`; }
export const ROOT_LABEL = 'MURAKUMO_ROOT';
export const BOOT_LABEL = 'MURA_BOOT';
export function verifyLabels(disks, selected) {
  if (disks.some(d => d.path !== selected && tree(d).some(p => [ROOT_LABEL, BOOT_LABEL].includes(p.label)))) {
    throw Error('Another disk uses Murakumo installation labels. Disconnect it before installing. Nothing erased.');
  }
}
export function offlineSystem(manifest, uefi) {
  const system = manifest[uefi ? 'uefi' : 'bios'];
  if (manifest.version !== 1 || manifest.rootLabel !== ROOT_LABEL || manifest.bootLabel !== BOOT_LABEL ||
      !/^\/nix\/store\/[a-z0-9]{32}-nixos-system-[A-Za-z0-9._+-]+$/.test(system || '')) {
    throw Error('Invalid offline OS manifest. Nothing erased.');
  }
  return system;
}
export function targetConfiguration({uefi}) {
  return `{ ... }: { imports = [ ./offline-${uefi ? 'uefi' : 'bios'}.nix ]; }\n`;
}

function run(program, args, options = {}) {
  const result = spawnSync(program, args, {stdio: 'inherit', ...options});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${program} failed (${result.status}).`);
  return result.stdout?.toString().trim();
}
function capture(program, args, options = {}) { return run(program, args, {...options, stdio: ['pipe', 'pipe', 'inherit']}); }
function inventory() {
  return JSON.parse(capture('lsblk', ['--json', '--bytes', '--paths', '--output', 'PATH,MAJ:MIN,SIZE,MODEL,SERIAL,WWN,TRAN,RM,HOTPLUG,RO,TYPE,MOUNTPOINTS,LABEL'])).blockdevices;
}
function dialog(args) {
  const result = spawnSync('dialog', ['--clear', '--stdout', '--title', 'Murakumo installation', ...args], {stdio: ['inherit', 'pipe', 'inherit']});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error('Cancelled. No further installation steps will run.');
  return result.stdout.toString();
}
async function main() {
  if (process.getuid() !== 0) throw Error('Run as root.');
  // The launcher is deliberately available only on the installation medium.
  if (!existsSync('/etc/murakumo/installation-media')) throw Error('This is not Murakumo installation media.');
  const uefi = existsSync('/sys/firmware/efi');
  const disks = inventory(), eligible = disks.filter(d => !diskReason(d, {uefi}));
  if (!eligible.length) throw Error('No unused internal disk of at least 16 GiB. NVMe requires restarting with the UEFI USB entry. Use the recovery console to inspect disks.');
  const selected = dialog(['--menu', `Boot mode: ${uefi ? 'UEFI' : 'BIOS (NVMe requires the UEFI USB entry)'}. Select the internal disk to REPLACE. All its partitions, including Windows, will be erased. The USB is excluded. Installation works offline. AC power is required.`, '0', '0', '8', ...eligible.flatMap(d => [d.path, `${String(d.model || '').trim()} | ${(Number(d.size) / 1024 ** 3).toFixed(1)} GiB | ${d.serial || d.wwn || 'no serial'}`])]);
  const target = eligible.find(d => d.path === selected);
  if (!target || realpathSync(selected) !== selected) throw Error('Invalid target selection.');
  const identity = fingerprint(target);
  verifyLabels(disks, selected);
  const system = offlineSystem(JSON.parse(readFileSync('/etc/murakumo/offline-systems.json', 'utf8')), uefi);
  console.log('Checking the complete offline OS on the USB before erasing...');
  const closure = capture('nix-store', ['--query', '--requisites', system]).split('\n').filter(Boolean);
  if (!closure.length || closure.some(p => !existsSync(p))) throw Error('Offline OS is incomplete. Nothing erased.');
  run('nix-store', ['--check-validity', ...closure]);
  const directory = mkdtempSync(join(tmpdir(), 'murakumo-install-'));
  const configFiles = ['node-base.nix', 'account-link.mjs', 'offline-base.nix', 'offline-uefi.nix', 'offline-bios.nix'];
  for (const name of configFiles) copyFileSync(`/etc/murakumo/${name}`, join(directory, name));
  const rootUuid = randomUUID(), bootUuid = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  run('nixos-generate-config', ['--no-filesystems', '--dir', directory]);
  // Retain hardware detection for later review; the shipped system is generic.
  run('mv', [join(directory, 'hardware-configuration.nix'), join(directory, 'detected-hardware.nix')]);
  writeFileSync(join(directory, 'configuration.nix'), targetConfiguration({uefi}));
  const phrase = `ERASE ${selected}`;
  const approval = dialog(['--inputbox', `Ready to replace ${selected}\nModel: ${String(target.model || '').trim()}\nSize: ${(Number(target.size) / 1024 ** 3).toFixed(1)} GiB\nSerial: ${target.serial || target.wwn || 'not available'}\nALL DATA, INCLUDING WINDOWS, WILL BE LOST.\nType exactly: ${phrase}`, '0', '0']);
  if (approval !== phrase) throw Error('Erase confirmation did not match. Nothing erased.');
  run('udevadm', ['settle']);
  const current = inventory();
  verifyDisk(current, selected, identity, {uefi});
  verifyLabels(current, selected);
  // No shell interpolation and no device auto-selection beyond this boundary.
  run('parted', ['--script', selected, 'mklabel', 'gpt', ...(uefi
    ? ['mkpart', 'ESP', 'fat32', '1MiB', '513MiB', 'set', '1', 'esp', 'on', 'mkpart', 'root', 'ext4', '513MiB', '100%']
    : ['mkpart', 'biosboot', '1MiB', '3MiB', 'set', '1', 'bios_grub', 'on', 'mkpart', 'root', 'ext4', '3MiB', '100%'])]);
  run('partprobe', [selected]);
  run('udevadm', ['settle']);
  const root = partitionPath(selected, 2), boot = partitionPath(selected, 1);
  run('mkfs.ext4', ['-F', '-U', rootUuid, '-L', ROOT_LABEL, root]);
  if (uefi) run('mkfs.fat', ['-F', '32', '-i', bootUuid, '-n', BOOT_LABEL, boot]);
  run('udevadm', ['trigger', '--subsystem-match=block']);
  run('udevadm', ['settle']);
  const mount = mkdtempSync('/mnt/murakumo-install-');
  let mounted = false;
  try {
    run('mount', [root, mount]); mounted = true;
    run('mkdir', ['-p', `${mount}/etc/nixos`, `${mount}/etc/NetworkManager`, `${mount}/boot`]);
    if (uefi) run('mount', [boot, `${mount}/boot`]);
    for (const name of ['configuration.nix', 'detected-hardware.nix', ...configFiles]) copyFileSync(join(directory, name), `${mount}/etc/nixos/${name}`);
    // Copy persistent Wi-Fi profiles, never print them or put them in the Nix store.
    if (existsSync('/etc/NetworkManager/system-connections')) run('cp', ['-a', '/etc/NetworkManager/system-connections', `${mount}/etc/NetworkManager/`]);
    run('nixos-install', ['--root', mount, '--system', system, '--no-root-passwd', '--no-channel-copy'], {env: {...process.env, NIX_CONFIG: 'substituters =\nfallback = false\nconnect-timeout = 1\n'}});
    if (!uefi) run('grub-install', ['--target=i386-pc', `--boot-directory=${mount}/boot`, selected]);
    run('sync', []);
  } finally {
    if (mounted) run('umount', ['--recursive', mount]);
  }
  dialog(['--msgbox', 'Installation completed. Press OK to restart. Remove the USB as the PC restarts, then boot the internal disk. OS installation is complete without Internet. Connect networking later for the Murakumo QR and matching production service. Model inference is a separate step.', '0', '0']);
  run('systemctl', ['reboot']);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  main().catch(error => { console.error(`\nInstallation stopped: ${error.message}\nDo not repeat an erase if installation failed after formatting. Use Ctrl+Alt+F2 for recovery and logs.`); process.exitCode = 1; });
}
