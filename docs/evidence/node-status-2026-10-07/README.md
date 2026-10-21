# Node details qualification — 2026-10-07

The installed setup guide now offers Node details both before local/account setup
and from the completion/recovery screen. It displays timestamped host, OS,
uptime, CPU count/load, available memory, root filesystem usage, NetworkManager
interface states and fixed service states. Refresh recollects data; Back returns
to the guide without enrollment, network changes, disk writes or reinstallation.
No Wi-Fi connection secrets or Tailscale tokens are read. Saved account data is
explicitly unverified; distributed execution/inference/rewards remain unverified.

Validation: 69 installer unit tests passed on macOS. A dedicated QEMU x86_64
Linux VM booted using the previous builder kernel/ISO and an overlay of
builder.qcow2. The base QA disk was preserved. Latest tests and status collection
ran from a readonly source share, using the existing local Node 22 closure.
The attached log records 9 tests passed and VM_NODE_STATUS_RUNTIME_PASS, actual
2 CPUs, Ethernet connected and NetworkManager active. Missing Murakumo/Tailscale
services were shown as inactive; they were not silently labelled ready.

Limits: this VM is the existing NixOS builder environment, NOT a freshly installed
AiueOS Node image. No new ISO or USB was written, no physical disk altered. The
new module is wired into console-ui.nix, but a complete image build and GTK
first-boot screen qualification remain before distributing it as installer media.
Production account/storage connection and actual fleet execution are not proven
by this status test.
