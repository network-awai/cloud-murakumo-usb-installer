# Murakumo NixOS native workspace preview

Tracking: [JUN-379](https://linear.app/kotobalabs/issue/JUN-379).
The owner selected **VM validation first; physical hardware later**.

`nixos/murakumo-nixos.nix` is an x86_64 NixOS profile with a native host
observer, static localhost delivery and a Cage/Chromium Itonami workspace.
It is separate from the older guided installer and its Node.js tools.
The build pins NixOS 26.05, an Amu selfhost-built compiler, the canonical
browser runtime and the owning dapp sources by revision and SHA-256.

## What works

- Native `.kotoba` monitor under a restricted systemd user; bounded samples,
  per-sample arena release, atomic file replacement and automatic restart.
- UI for app launch, node observation and local-data recovery, including
  keyboard navigation and a responsive six-view layout.
- Kaikei's first journal validation slice ported from the owning repository's
  existing typed source. Unbalanced entries are refused. Balanced entries
  remain in browser storage across reloads. This is not the complete accounting
  product or a tax/payment service.
- Dandori's existing canonical judgment core in a browser Worker. Local task
  creation, start, completion and reopening; no bot/shared-board activation.
- Core SHA-256 checks before Wasm compilation and self-checks before readiness.
  State writes use browser locks. Recovery files are bounded and validated;
  restore refuses to replace existing work.
- The exact canonical client runtime validates the descriptor. There are no
  enabled external operations, remote inference or silent service fallback.

The app origin serves static files only. The observer writes under
`/var/lib/murakumo-observe`, outside that root. The UI imports a snapshot the
user selects; it does not silently poll an app-origin status API. The display
states its timestamp, scope and unsigned/unregistered status.

## Reproduce on an x86_64 Linux/KVM builder

```console
nix-build nixos/native-build.nix -A package --no-out-link
nix-build nixos/tests/native-workspace.nix --no-out-link
nix-build nixos/tests/native-workspace.nix --arg desktop true --no-out-link
nix-build nixos/native-build.nix -A iso --no-out-link
```

The tests boot the real profile, require successive native observations,
refuse observation delivery on the app origin, check for forbidden runtime
processes, kill/restart the monitor, power-cycle the VM, match the new service
invocation ID, and refuse invalid labels without writing a file. The desktop
gate boots Cage/Chromium as the normal user, checks snapshot readability and
uses OCR to require the browser's `Local runtime ready` after both Wasm cores
have passed their checks. It saves an actual VM screenshot.

The live ISO is a **non-destructive local preview**, not a replacement for the
existing signed guided-installer release. It does not select, format or install
a disk. Live browser data is temporary; the UI requires exporting a recovery
copy before shutdown. Never infer physical GPU or recovery qualification from
a virtual GPU/pixman desktop.

For an installed target, import the profile alongside the operator's reviewed
disk, boot-loader and hardware configuration. Remote access and model/provider
configuration require their own qualification. This work does not reimage the
existing Ubuntu/Mishima host or change production routes.

## Remaining product gates

The native observer is **not a complete participating Murakumo Node**. Signed
admission/heartbeat/peer exchange, key custody and operator governance, native
hata Cell lifecycle/calls, OCI service dispatch and kotobase/Yataverse app-state
recovery must be connected through the existing workstreams. LocalStorage is
local working state, not distributed durability. No production credentials,
model download, public service, payment or bot schedule is activated.

See JUN-287/JUN-288/JUN-296, AWAI-22 and KOTOBA-15. Broader language expansion
and review are deferred to [JUN-378](https://linear.app/kotobalabs/issue/JUN-378).
