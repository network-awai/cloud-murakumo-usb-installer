# Password-free installer verification — 2026-10-05 (Asia/Tokyo)

Runtime source `e6433e6` removes the two password dialogs, length requirement,
mkpasswd dependency and target password-hash file. Generated targets lock root's
password, enable local console root autologin and explicitly disable SSH.
Disk selection, pre-erasure preparation, exact erase phrase and disk identity
recheck are preserved. Phone Passkey registration is unchanged.

## Final artifact

- ISO: `murakumo-auto-install-e6433e6.iso`, 1,662,976,000 bytes.
- SHA-256: `5057f97a19a4e3dee8ea3fd34b29232cb2b21a4acf3e0b8b2d36c6d783067a8f`.
- Script SHA-256 (host and actual booted ISO match):
  `a004267317fbf0dfe58df12225356f18ca0aa229ab4a81291974db669c1b5d7a`.
- Same pinned nixpkgs `f5c082a40f7571c266e74e80ae2e68aadd8a9fc7` and zstd
  compression level 1 as the previous artifact. Build ends `AUTO_BUILD_EXIT=0`.
- Host and Linux builder independently matched the ISO hash.
- Artifact directory: `/Users/junkawasaki/github/murakumo-usb-auto-install-qa`.

## Verification

All 12 Node protocol and disk-safety tests passed. Generated BIOS and UEFI
configurations parsed and fully evaluated (`passwordless-config-check.log`,
`CHECK_EXIT=0`).

The final unmodified ISO booted via UEFI with a fresh QA-only 24 GiB NVMe.
Selecting the disk proceeded immediately to OS preparation with no password
input. Exact `ERASE /dev/nvme0n1` approval then installed successfully.
Screenshots: `passwordless-menu.png`, `passwordless-preparation.png`,
`passwordless-approval.png`, `passwordless-install-completed.png`.

The VM rebooted; the same NVMe and UEFI variables were restarted with no ISO.
NixOS booted from NVMe. Ctrl+Alt+F2 logged in as root automatically without any
username or password entry (`passwordless-maintenance.png`). Runtime checks:

- `/` is `/dev/nvme0n1p2`, `/boot` is `/dev/nvme0n1p1`.
- `id -un` is `root`; `passwd -S root` reports `L` (locked).
- `/etc/murakumo-root-password` does not exist.
- `sshd.service` is not found; TCP port 22 has no listener.
- `passwordless-node-checks.log` records these checks. Its final service dump
  entered the pager; earlier checks completed, and no full service dump is
  claimed. The VM subsequently powered off.

No task-owned VM remains running. No unrelated VM/app was stopped. No push, PR,
merge, production deployment or physical PC installation occurred.

## USB handoff

KIOXIA TransMemory 61,949,214,720 bytes, external physical USB disk6, was
re-identified. A guarded, executable `usb-write-passwordless-20261005/`
`Murakumo-USB.command` is prepared with the new ISO hash and complete read-back
verification, but has not run. Automatic approval review rejected the new
payload's USB write pending explicit user approval. The USB remains on the
previous `71723c1` artifact; no new physical write is claimed.

## Remaining acceptance

Registration still returns `invalid registration flow` against the unpublished
matching production integration. No real phone Passkey account link or actual
fleet inference is established. Anyone with physical console access can
administer the installed node; SSH is disabled and no empty password is set.
