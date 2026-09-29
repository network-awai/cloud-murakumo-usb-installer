# cloud-murakumo-usb-installer

NixOS installation media definition and target-host configuration for Murakumo
nodes. This repository owns the OS installation boundary: boot media, disk
selection, target configuration, recovery and rollback. It never chooses or
formats a disk automatically.

Status: the revised NixOS 26.05 ISO was built and booted in BIOS and UEFI
QEMU VMs on 2026-09-30. The bundled preflight script and target templates,
including `community.nix`, were checked in the live image. See [the current
verification record](docs/verification-2026-09-30.md) for the exact image hash
and remaining hardware checks. Physical
USB boot, target-disk installation and recovery have not been tested; do not
replace a serving host until those checks succeed.

Phone-only setup, Wi-Fi provisioning, Kotoba authority pairing, remote model
download and model switching are not present in this source. A read-only local
inference check and a factory device claim responder for `murakumo.cloud` are
included in the revised image. Neither component installs or starts a model server.
The target flow and qualification gates are recorded in
[headless phone setup](docs/headless-phone-setup.md).

## Build the bootable ISO

On a NixOS or Linux machine with Nix, use a reviewed nixpkgs checkout at an
explicit commit, or the immutable store path behind a pinned NixOS channel:

```sh
./scripts/build-iso.sh /absolute/path/to/nixpkgs
```

The script prints the nixpkgs commit and produces `result/iso/*.iso`. Review
that commit and record the ISO SHA-256 before writing a USB stick. Use the
[official NixOS installation manual](https://nixos.org/manual/nixos/stable/#sec-installation)
for USB writing, partitioning, mounting and `nixos-install`. An ISO built from
this source includes the read-only preflight and local-inference checks,
device claim agent and target templates under `/etc/murakumo/`,
but does not run an install automatically.

## Install a target host

1. Boot the USB media. Run `sh /etc/murakumo/preflight.sh` to inspect boot
   mode, disks, network interfaces and GPU devices.
2. Identify the intended disk and a recovery path. Partition and mount it
   following the official manual. A wrong disk choice destroys data.
3. Run `nixos-generate-config --root /mnt`. Keep the generated
   `hardware-configuration.nix` for this host.
4. Copy `/etc/murakumo/node-base.nix`,
   `/etc/murakumo/community.nix`,
   `/etc/murakumo/node-readiness.mjs`,
   `/etc/murakumo/device-claim.mjs`, and an edited copy of
   `/etc/murakumo/configuration.example.nix` to `/mnt/etc/nixos/` (rename the
   latter to `configuration.nix`). Set a real SSH public
   key, confirm UEFI or replace its boot loader settings, and review the
   network and filesystem configuration before `nixos-install`.
5. Reboot from the installed disk. Confirm remote access and RADV/Vulkan on
   physical hardware. Install and start a reviewed OpenAI-compatible model
   server and model separately. Run the local inference check with its exact
   model ID (shown by its `/v1/models` endpoint):

   ```sh
   node /etc/murakumo/node-readiness.mjs --model YOUR_MODEL_ID --local-url http://127.0.0.1:11434/v1
   ```

6. Install the node CLI from
   [cloud-murakumo-installer](https://github.com/network-awai/cloud-murakumo-installer).
   Follow the [buyer and operator path](docs/buyer-operator-path.md) for local
   AI access, optional community participation and account boundaries.

Factory provisioning is a separate operator step after installation: generate
one device key and one label per shipped unit with
`sudo node /etc/murakumo/device-claim.mjs provision --model 'Murakumo 2609'`.
The command prints a claim URL and registration JSON containing the factory
token. Keep that output private; print the URL as the unit's QR label and
register the JSON through the operator-only `murakumo.cloud` device API near
dispatch. The node must never hold that API's admin token. See the
[buyer and operator path](docs/buyer-operator-path.md) for the exact boundary.

The 2026-09-30 NixOS 26.05 VM pilot booted with an emulated GPU. Bare-metal
Radeon 680M, Prism Vulkan, model throughput,
concurrency and restart recovery remain unverified. Keep the serving Ubuntu
installation until those checks and a recovery plan succeed.

`cloud-murakumo-installer` owns the macOS/Linux CLI installation script;
`cloud-murakumo-usb-installer` owns NixOS boot media and OS installation.
Windows node installation is a separate future platform path and is not
advertised as supported by the current CLI script.
