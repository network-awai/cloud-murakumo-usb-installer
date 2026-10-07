# cloud-murakumo-usb-installer

AiueOS installation media definition and target-host configuration for Murakumo
Nodes. AiueOS is the OS, built on NixOS; Murakumo Node names the device and its
Murakumo role. This repository owns the OS installation boundary: boot media, disk
selection, target configuration, recovery and rollback. The ISO opens a guided
installer on boot: choose Wi-Fi, Ethernet or offline continuation, then select
and approve the internal disk. The bundled OS
is copied and installed without Internet or host-side compilation. Registration
opens the same network guide after the installed PC boots. See
[network onboarding](docs/network-onboarding.md).
The [account-linking guide](docs/account-onboarding.md) continues through a phone
QR, Passkey approval, cancellation/retry and saved versus online-verified status.
The [native graphical guide](docs/graphical-setup.md) describes the new disk cards,
selected-disk confirmation and UUID-based boot routing.
See [the guided installation procedure](docs/automatic-install.md). Initial
password entry is no longer required; see [password-free verification](docs/verification-passwordless-2026-10-05.md).

Status: guided disk installation and account onboarding were added on 2026-10-05. See
[the account onboarding verification record](docs/verification-account-onboarding-2026-10-05.md) for the
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
4. Copy `node-base.nix`, `console-ui.nix`, `offline-base.nix`, `offline-uefi.nix`,
   `offline-bios.nix`, `network-setup.mjs`, `setup-ui.mjs`, `registration-ui.mjs`,
   `account-link.mjs`, `local-setup.mjs`, `language.mjs`, `graphical-ui.js`,
   `graphical-dialog.mjs`, `murakumo-logo.svg`, `acoustic-code.mjs`,
   `setup-sound.mjs` and `sound-link.html` from `/etc/murakumo/` to
   `/mnt/etc/nixos/`, along with
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

## Local setup and startup language

Startup offers Japanese and English. The installed guide can complete local setup
without a phone, an account or Internet, preserving its device identity across boots.
Account linking remains an explicit later choice. See
[local setup and the proposed OS update contract](docs/local-setup-and-updates.md).
OS automatic updates are not currently enabled; updating a USB does not update an
already installed PC.

## Setup audio

The startup language page plays a quiet, original ambient piece with a visible
stop/replay control. The QR page can send the same expiring approval code by sound.
See [sound linking](docs/sound-linking.md) for the included companion reader,
Passkey approval boundary and public-release/physical-phone qualification gaps.

## Bluetooth Wi-Fi provisioning

The network chooser offers Bluetooth when a controller is present. Opening it
creates a ten-minute, one-use secret shown locally as a QR code or a masked key.
The companion encrypts Wi-Fi credentials with HKDF/AES-GCM before sending
fragmented GATT writes; expired, modified and replayed messages are refused.
Closing the page stops advertising. This transfers Wi-Fi settings only; account
ownership still requires the separate Passkey flow.

`nixos/ble-setup.nix` integrates the services into the next installer build.
`scripts/install-ble-host.sh` installs the Ubuntu adapter on the explicitly
selected existing node. Its services start at boot but do not advertise until
a setup window is opened. `scripts/serve-ble-client.mjs` provides a localhost
companion for Mac Chrome testing; it is not a published phone application.

On 2026-10-07, 6600hs-2 registered the GATT service and started/stopped its
advertisement. The live controller accepted WebCrypto-encrypted, fragmented
settings, reconnected its existing Wi-Fi, refused replay and removed its consumed
secret. That test uses private local IPC, not a Bluetooth radio transfer.
The Mac Bluetooth chooser did not discover the node, so radio transfer and
physical-phone setup remain unverified. An iPhone native companion, public
HTTPS companion deployment, Nix runtime evaluation and USB rewrite are not
included in this host verification. See the machine-readable evidence under
`docs/evidence/ble-setup-2026-10-07/`.
