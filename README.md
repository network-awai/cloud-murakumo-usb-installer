# cloud-murakumo-usb-installer

NixOS installation media definition and target-host configuration for Murakumo
nodes. This repository owns the OS installation boundary: boot media, disk
selection, target configuration, recovery and rollback. The ISO opens a guided
installer on boot: choose Wi-Fi, Ethernet or offline continuation, then select
and approve the internal disk. The bundled OS
is copied and installed without Internet or host-side compilation. Registration
opens the same network guide after the installed PC boots. See
[network onboarding](docs/network-onboarding.md).
See [the guided installation procedure](docs/automatic-install.md). Initial
password entry is no longer required; see [password-free verification](docs/verification-passwordless-2026-10-05.md).

Status: guided disk installation was added on 2026-10-05. See
[the network UI verification record](docs/verification-network-ui-2026-10-05.md) for the
reviewed source, ISO hash and VM checks. Physical PC installation, real phone
Passkey linking and inference still require separate verification. The
[2026-09-26 record](docs/verification-2026-09-26.md) describes the earlier manual
installation image.

## Build the bootable ISO

On a NixOS or Linux machine with Nix, use a reviewed nixpkgs checkout at an
explicit commit, or the immutable store path behind a pinned NixOS channel:

```sh
./scripts/build-iso.sh /absolute/path/to/nixpkgs
```

The script prints the nixpkgs commit and produces `result/iso/*.iso`. Review
that commit and record the ISO SHA-256 before writing a USB stick. Use the
[official NixOS installation manual](https://nixos.org/manual/nixos/stable/#sec-installation)
for USB writing, partitioning, mounting and `nixos-install`. The ISO includes
the read-only preflight script and target templates under `/etc/murakumo/`,
and the guided installer. Previously written USB sticks must be rewritten with
the new ISO separately, after confirming and approving the USB's erasure.

## Install a target host

The normal path is now [guided installation](docs/automatic-install.md).
The steps below are the manual recovery/custom configuration path.

1. Boot the USB media. Run `sh /etc/murakumo/preflight.sh` to inspect boot
   mode, disks, network interfaces and GPU devices.
2. Identify the intended disk and a recovery path. Partition and mount it
   following the official manual. A wrong disk choice destroys data.
3. Run `nixos-generate-config --root /mnt`. Keep the generated
   `hardware-configuration.nix` for this host.
4. Copy `node-base.nix`, `console-ui.nix`, `network-setup.mjs`, `setup-ui.mjs`,
   `registration-ui.mjs` and `account-link.mjs` from `/etc/murakumo/` to `/mnt/etc/nixos/`, along with
   an edited `configuration.example.nix` renamed to `configuration.nix`. For
   the guided network screen, set `networking.networkmanager.enable = true`
   and `networking.useDHCP = false` in that edited configuration. Set a real
   SSH public key, confirm UEFI or replace the boot loader settings, and review
   the network and filesystem configuration before `nixos-install`.
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

## Passwordless account registration

The example enables `services.murakumoAccountLink.enable`. On the installed system,
TTY1 shows a five-minute QR/device code and the public Device ID. Scan it with a phone,
compare the full Device ID, and approve using the existing Murakumo Passkey sign-in.
The node does not request an account ID/password. Administrative SSH access is configured
separately with the operator's public key; account linking does not grant remote shell access.

The node keeps a local signing key with mode 0600 and a public registration receipt.
On reboot it verifies registration online. Revocation fails closed; an intentional local
relink uses `node /etc/murakumo/account-link.mjs --relink`, preserving the device key.
No model service or fleet worker is enabled by account linking.

This requires the matching Portal/Worker registration routes and database migration to be
published. The local integration tests use an explicitly labelled authentication verdict
fixture; they do not verify a real Passkey ceremony. The registration module
comes from frozen local review commit `bf6e9adc`; installer changes do not
publish its Worker/Portal dependencies.

Run `node --test test/*.test.mjs` for registration and offline/disk safety tests.
On Linux with the pinned NixOS channel, run `bash scripts/check-install-config.sh`
to parse and evaluate both generated boot configurations with Nix.
