import test from 'node:test';
import assert from 'node:assert/strict';
import {diskReason, fingerprint, verifyDisk, partitionPath, targetConfiguration} from '../scripts/install-disk.mjs';
const nvme = {path:'/dev/nvme0n1', 'maj:min':'259:0', type:'disk', size:512*1024**3, model:'Internal SSD', serial:'NVME-A', wwn:'id-a', tran:'nvme', rm:false, hotplug:false, ro:false, mountpoints:[null], children:[{path:'/dev/nvme0n1p1',type:'part',mountpoints:[null],fstype:'ntfs'}]};
test('unmounted Windows disk is eligible, boot USB is never eligible', () => {
  assert.equal(diskReason(nvme), null);
  for (const extra of [{tran:'usb'},{rm:true},{hotplug:1},{ro:true},{size:8*1024**3},{size:null},{path:'/dev/loop0',type:'loop'}]) assert.ok(diskReason({...nvme,...extra}));
});
test('every mounted child, swap, mapper or installer backing disk is refused', () => {
  for (const child of [{type:'part',mountpoints:['/iso']},{type:'part',mountpoints:['/nix/.ro-store']},{type:'part',mountpoints:['[SWAP]']},{type:'part',children:[{type:'crypt',mountpoints:[null]}]},{type:'lvm',mountpoints:[null]}]) assert.ok(diskReason({...nvme,children:[child]}));
  assert.ok(diskReason({...nvme,mountpoints:['/']}));
});
test('a changed or newly mounted disk is refused after approval', () => {
  const id = fingerprint(nvme);
  assert.equal(verifyDisk([nvme],nvme.path,id),nvme);
  for (const extra of [{serial:'NVME-B'},{wwn:'id-b'},{size:nvme.size/2},{'maj:min':'259:3'},{ro:1},{children:[{type:'part',mountpoints:['/mnt']}]}]) assert.throws(()=>verifyDisk([{...nvme,...extra}],nvme.path,id));
  assert.throws(()=>verifyDisk([],nvme.path,id));
});
test('NVMe/eMMC and SATA/virtio partition paths are correct', () => {
  for (const [disk,path] of [['/dev/nvme0n1','/dev/nvme0n1p2'],['/dev/mmcblk0','/dev/mmcblk0p2'],['/dev/sda','/dev/sda2'],['/dev/vda','/dev/vda2']]) assert.equal(partitionPath(disk,2),path);
});
test('installed configuration enables registration and supports both boot modes', () => {
  const options={disk:nvme.path,rootUuid:'root-id',bootUuid:'ABCD-1234'};
  const uefi=targetConfiguration({...options,uefi:true}),bios=targetConfiguration({...options,uefi:false});
  assert.match(uefi,/murakumoAccountLink.enable = true/);
  assert.match(uefi,/systemd-boot.enable = true/);
  assert.match(uefi,/canTouchEfiVariables = false/);
  assert.match(uefi,/ABCD-1234/);
  assert.match(bios,/grub.device = "\/dev\/nvme0n1"/);
  assert.doesNotMatch(bios,/systemd-boot|ABCD-1234/);
  assert.match(bios,/hashedPasswordFile/);
  assert.doesNotMatch(bios,/initialPassword|hashedPassword =|REPLACE_WITH/);
});
