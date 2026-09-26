# cloud-murakumo-usb-installer

NixOS installation media definition and target-host configuration for Murakumo
nodes. This repository owns the OS installation boundary: boot media, disk
selection, target configuration, recovery and rollback. It never chooses or
formats a disk automatically.

Status: the ISO definition and build script are prepared, but this customized
image has not yet been built or USB-booted. Do not replace a serving host from
it until the image, hardware and recovery path are tested.

## Build the bootable ISO

On a NixOS or Linux machine with Nix, use a reviewed nixpkgs checkout at an
explicit commit:

```sh
./scripts/build-iso.sh /absolute/path/to/nixpkgs
```

The script prints the nixpkgs commit and produces `result/iso/*.iso`. Review
that commit and record the ISO SHA-256 before writing a USB stick. Use the
[official NixOS installation manual](https://nixos.org/manual/nixos/stable/#sec-installation)
for USB writing, partitioning, mounting and `nixos-install`. The ISO includes
the read-only preflight script and target templates under `/etc/murakumo/`,
but does not run an install automatically.

## Install a target host

1. Boot the USB media. Run `sh /etc/murakumo/preflight.sh` to inspect boot
   mode, disks, network interfaces and GPU devices.
2. Identify the intended disk and a recovery path. Partition and mount it
   following the official manual. A wrong disk choice destroys data.
3. Run `nixos-generate-config --root /mnt`. Keep the generated
   `hardware-configuration.nix` for this host.
4. Copy `/etc/murakumo/node-base.nix` and an edited copy of
   `/etc/murakumo/configuration.example.nix` to `/mnt/etc/nixos/` (rename the
   latter to `configuration.nix`). Set a real SSH public
   key, confirm UEFI or replace its boot loader settings, and review the
   network and filesystem configuration before `nixos-install`.
5. Reboot from the installed disk. Confirm remote access, RADV/Vulkan and
   the chosen model server on physical hardware. Then install the node CLI
   from [cloud-murakumo-installer](https://github.com/network-awai/cloud-murakumo-installer).

The 2026-09-26 NixOS 26.05 VM pilot booted and ran Murakumo CLI help, but its
GPU was llvmpipe. Bare-metal Radeon 680M, Prism Vulkan, model throughput,
concurrency and restart recovery remain unverified. Keep the serving Ubuntu
installation until those checks and a recovery plan succeed.

`cloud-murakumo-installer` owns the macOS/Linux CLI installation script;
`cloud-murakumo-usb-installer` owns NixOS boot media and OS installation.
Windows node installation is a separate future platform path and is not
advertised as supported by the current CLI script.
