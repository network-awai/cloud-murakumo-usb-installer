# cloud-murakumo-usb-installer

NixOS installation media definition and target-host configuration for Murakumo
nodes. This repository owns the OS installation boundary: boot media, disk
selection, target configuration, recovery and rollback. It never chooses or
formats a disk automatically.

Status: the customized NixOS 26.05 ISO was built and booted in a BIOS/KVM VM
on 2026-09-26. The bundled preflight script and target templates were checked
in the live image. See [the verification record](docs/verification-2026-09-26.md)
for the source revision, image hash and remaining hardware checks. Physical
USB boot, target-disk installation and recovery have not been tested; do not
replace a serving host until those checks succeed.

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
but does not run an install automatically.

## Install a target host

1. Boot the USB media. Run `sh /etc/murakumo/preflight.sh` to inspect boot
   mode, disks, network interfaces and GPU devices.
2. Identify the intended disk and a recovery path. Partition and mount it
   following the official manual. A wrong disk choice destroys data.
3. Run `nixos-generate-config --root /mnt`. Keep the generated
   `hardware-configuration.nix` for this host.
4. Copy `/etc/murakumo/node-base.nix`, `/etc/murakumo/node-provider.nix`,
   and `/etc/murakumo/node-claim.nix`
   and an edited copy of
   `/etc/murakumo/configuration.example.nix` to `/mnt/etc/nixos/` (rename the
   latter to `configuration.nix`). Set a real SSH public
   key, confirm UEFI or replace its boot loader settings, and review the
   network and filesystem configuration before `nixos-install`.
5. Reboot from the installed disk. Confirm remote access, RADV/Vulkan and
   the chosen model server on physical hardware. Then install the node CLI
   from [cloud-murakumo-installer](https://github.com/network-awai/cloud-murakumo-installer).

## Opt in to idle inference after buyer claim

The base profile leaves both the claim responder and provider service disabled.
Before shipping, provision each physical device with its own DID and Ed25519
private key, register that DID and its matching claim token with the site, and
put the claim URL or QR code on that device's label. The factory key must never
appear on the label or in the Nix store. The registered DID and device identity
must match. This process still requires a real device and site registration;
installing the OS alone cannot produce a claimable unit.

Once the CLI release is published, install its verified launcher outside home
directories so the restricted service can run it:

```sh
sudo env MURAKUMO_INSTALL_DIR=/opt/murakumo-cli \
  MURAKUMO_BIN_DIR=/opt/murakumo-bin sh install.sh
sudo test -f /var/lib/murakumo/device-identity.json
sudo env MURAKUMO_NODE_IDENTITY_FILE=/var/lib/murakumo/device-identity.json \
  /opt/murakumo-bin/murakumo node doctor \
  --model YOUR_EXACT_MODEL_ID --local-url http://127.0.0.1:11434/v1
```

The factory identity file must be private (mode `0600`) and match the DID
registered for this physical device. Never replace it with another identity
after the buyer claim. To let the device answer the buyer's short-lived claim
challenge, enable the responder on the target after the published CLI is
installed:

```nix
services.murakumoClaimResponder.enable = true;
```

Run `sudo nixos-rebuild switch` and check
`systemctl status murakumo-claim-responder.timer`. The timer calls
`murakumo node claim-once` every 15 seconds and signs only the pending
challenge for this DID. It uses systemd's private credentials and does not
require a model server or buyer password. The buyer must still complete the
claim in their browser. A local `claim-once` success only proves that the
device responded to a challenge; it does not prove that ownership changed.

After the buyer claim and a local `doctor` check, an exact model must be
running locally before idle inference can be enabled. Add this to the target's
`configuration.nix`:

```nix
services.murakumoProvider = {
  enable = true;
  name = "murakumo-node";
  model = "YOUR_EXACT_MODEL_ID";
  localUrl = "http://127.0.0.1:11434/v1";
  idleOnly = true;
};
```

Run `sudo nixos-rebuild switch`, then inspect
`systemctl status murakumo-provider` and
`journalctl -u murakumo-provider -b`. The unit waits for the network, restarts
after a failure and reads the identity through systemd's private credentials.
It does not download a model, bypass admission or guarantee a paid job. If the
model server needs a private API token, configure that separately before
enabling the service; this template does not embed one in the Nix store.

The 2026-09-26 NixOS 26.05 VM pilot booted and ran Murakumo CLI help, but its
GPU was llvmpipe. Bare-metal Radeon 680M, Prism Vulkan, model throughput,
concurrency and restart recovery remain unverified. Keep the serving Ubuntu
installation until those checks and a recovery plan succeed.

`cloud-murakumo-installer` owns the macOS/Linux CLI installation script;
`cloud-murakumo-usb-installer` owns NixOS boot media and OS installation.
Windows node installation is a separate future platform path and is not
advertised as supported by the current CLI script.
