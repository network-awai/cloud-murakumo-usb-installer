# KIOXIA-only recurring USB writer

One administrator setup installs a root-owned compiled Swift helper and a sudoers
rule for junkawasaki. The rule permits only the exact helper binary digest, with
no arguments; it does not permit dd, Python, a shell, diskutil, or arbitrary root
commands. The fixed target is KIOXIA TransMemory serial 0022CFF6B899CA205987CBC4,
61949214720 bytes. The current disk number is discovered through its IOKit USB
parent rather than assuming disk6. Internal, non-USB, duplicate, missing, partition,
and changed targets fail closed.

The fixed request is ../murakumo-usb-auto-install-qa/usb-write-request.json (outside
this repo). It contains action check/write, ISO path, length, and expected SHA256.
ISO input must be a regular file owned by uid 501, inside the configured QA folder,
with ISO9660 magic, a sector-aligned 1 MiB–8 GiB length, and the expected SHA256.
The helper drops effective user/group privileges before opening user input. It
snapshots and verifies the image in a root-private temporary directory before any
USB write. No caller-controlled file receives root output; events use stdout.
Only one writer runs at once. The target is rechecked before and after raw-device
open and before ejection. The complete image length is read back and hashed before
ejecting. Temporary staging data is removed even when a failure occurs.

Open KIOXIA-Initial-Setup.command once and enter the Mac administrator password.
It installs the checked binary and validates sudoers, tests no-password execution
with cached credentials deliberately ignored, and refuses extra arguments. It then writes the prepared ISO without another
administrator prompt. Later updates use KIOXIA-Update.command.
The update action overwrites this specific USB. No password is stored.

A future ISO needs only a freshly prepared request with its exact path, bytes, and
SHA256. Replacing the helper itself requires administrator approval again. The
helper uses Apple system tools and CryptoKit, not a user-writable root interpreter.
Build: xcrun swiftc -O USBWriter.swift -o <QA>/murakumo-usb-writer. Test build uses
-D USB_WRITER_TEST. After rebuilding, update the installer binary digest.

macOS removable-volume/TCC access is separate from sudo authentication. The prior
AppleScript privileged write failed with Operation not permitted. A no-password
sudo rule alone does not establish disk access. This environment's CUA connector
refused Terminal access, so one-time user launch is required; no attempt is made
to bypass that restriction or automatically grant Full Disk Access.

To remove the capability, an administrator removes only
/private/etc/sudoers.d/murakumo-kioxia-writer and
/Library/PrivilegedHelperTools/cloud.murakumo.kioxia-writer.

Status on 2026-10-06: helper built and target selection tests passed; setup and
password-free real USB write remain unverified until the user executes setup.
No new ISO was successfully written to the physical USB by this preparation.
