# Guided automatic internal-disk installation

1. Connect AC power and preferably wired Ethernet, then boot the new ISO.
   For an NVMe target, select the **UEFI USB** entry in the firmware boot menu.
   BIOS-mode NVMe installation is refused before erasure; SATA/virtio disks
   remain supported in BIOS mode. The installer displays the current boot mode.
   TTY1 opens the disk selection screen. USB, removable, hotplug, read-only,
   mounted, swap and mapped disks are excluded; disks must be at least 16 GiB.
   No disk is installed without explicit approval, even with one candidate.
2. Select the disk by its path, model, capacity and serial. This replaces the
   whole disk, including Windows and recovery partitions. No maintenance
   password is requested.
3. The installer detects UEFI/BIOS, generates hardware configuration and builds
   NixOS before erasing. Network/cache/build failures at this stage leave the
   disk untouched. Internet and sufficient RAM for the live Nix store are
   required; this is not an offline installation image.
4. Review the disk again and type `ERASE /dev/<chosen-disk>` exactly. Disk
   identity and usage are rechecked. GPT partitioning, formatting, configuration
   copying and installation of the prepared system then run automatically.
   UEFI uses systemd-boot's fallback path without changing firmware variables;
   BIOS uses GRUB. Persistent Wi-Fi profiles are copied without printing
   credentials.
5. On success, press OK to reboot and remove the USB as the PC restarts. With networking and matching published registration services, the installed
   system displays the Murakumo QR. Scan it with a phone,
   compare the full Device ID, and approve with your Murakumo Passkey.

Maintenance is available on Ctrl+Alt+F2 with automatic local `root` login.
Anyone with physical console access can administer this node. The root password
is locked and SSH is disabled; no blank-password remote login is enabled. For Wi-Fi on the live ISO, use Ctrl+Alt+F2
and `sudo nmtui`, then restart with `sudo systemctl start murakumo-install`.

Cancellation does not trigger another install. A failure after formatting may
leave a partial installation: do not blindly repeat erasure. Use the live
recovery console, `journalctl -u murakumo-install`, and
`sh /etc/murakumo/preflight.sh`. Firmware may still select another Windows disk;
use its boot menu to select the installed disk.

Registration needs matching published Worker/Portal routes and migrations.
This change does not publish those dependencies or qualify a real phone
Passkey ceremony. Account linking enables no model server or fleet worker;
physical networking, GPU/model performance and actual inference remain separate
acceptance checks.
