# Revised ISO build and VM boot verification — 2026-09-30 JST

## Image identity

- Installer PR: [#1](https://github.com/network-awai/cloud-murakumo-usb-installer/pull/1), source head `b93a8e8bb26ad24e3942fc18950eafa727e8449f`.
- GitHub Actions [run 36590510532](https://github.com/network-awai/cloud-murakumo-usb-installer/actions/runs/36590510532): `build-iso` succeeded. The pull-request checkout recorded merge revision `db0897acc353102e394ffb8089a8b72683d5e195`; this is the exact build input, rather than the branch head alone.
- Pinned nixpkgs revision: `f5c082a40f7571c266e74e80ae2e68aadd8a9fc7`.
- Image: `nixos-minimal-26.05pre-git-x86_64-linux.iso`, 1,535,967,232 bytes.
- SHA-256: `762c179f92a15f9456d6272600878daf1bfe706eb04029ccfbb0bc158ccabcad`.
- The run uploaded the ISO and identity files as artifact `murakumo-installer-db0897acc353102e394ffb8089a8b72683d5e195` (three-day retention). After downloading, the local image hash and size matched the uploaded `iso.sha256` and `iso-size.txt` files.

## Boot checks

The downloaded image booted from its own El Torito/ISOLINUX path in a QEMU x86-64 BIOS guest and from its EFI boot path in a separate QEMU/EDK2 guest. Both reached the NixOS 26.05pre-git automatic-login shell. These VMs used software CPU emulation on macOS, 3 GiB RAM and two vCPUs. The screenshots are retained in the local verification directory alongside the downloaded image.

For an interactive serial-console check, the same image was mounted as a QEMU CD-ROM and its own serial boot kernel/initrd arguments were used. `systemctl is-system-running` returned `running`; `systemctl --failed` listed zero failed units. `/etc/murakumo/` contained `community.nix`, `node-base.nix`, `configuration.example.nix`, `device-claim.mjs`, `node-readiness.mjs` and `preflight.sh`. Both `.mjs` files passed Node 22 `--check`. The bundled `preflight.sh` completed, listed the CD-ROM, network and emulated GPU, and reported that no disk was modified. No target disk was attached to any VM.

The source's Node 22 factory-claim and local-model-readiness tests passed 8/8 before this build. The VM boot proves the revised ISO starts and carries the required module; it does not prove that a target-disk NixOS installation, Wi-Fi phone setup, a real model, an owner claim, Community admission, GPU inference or payout works. Physical USB boot on the Murakumo 2609/6600HS hardware remains unverified. Keep the serving Ubuntu installation and any customer disk unchanged until those checks and a recovery path succeed.
