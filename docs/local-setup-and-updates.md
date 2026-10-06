# Murakumo Node setup, account linking, language and AiueOS updates

## Current implementation

The OS is named **AiueOS**; the device is a **Murakumo Node**. Murakumo Server
can describe its serving role when a serving process is actually configured.
This installer contains an offline, prebuilt AiueOS system based on NixOS. It has no OS update
agent or timer: neither `system.autoUpgrade` nor a Murakumo release updater is
enabled. Changing source or flashing the USB does not update an already-installed
PC. CPU microcode options include firmware in an OS build; they are not an OS
updater. No automatic reboot or new release deployment is added here.

At startup the graphical installer and installed setup guide offer Japanese and
English. The preferred language is saved privately in `/var/lib/murakumo/ui-language`,
copied into the installation, and offered first on subsequent boots. The choice
sets both controller text and graphical headings/buttons. Console fallback uses
an equivalent language menu. Language selection never authorizes a disk erase.

Installed setup begins with an explicit use choice:

1. **Complete setup on this device** creates or reuses its Ed25519 device identity
   and X25519 encryption key, writes a private local completion record, and shows
   its public `did:key`. It performs no HTTP request and creates no account receipt.
2. **Link a Murakumo account** opens connection settings, then the existing bound
   approval protocol. A phone can scan the QR; another computer can open the
   displayed approval URL. Both still require the published account service and
   a supported authenticated Passkey session.
3. **Wi-Fi / Ethernet settings** configures the network without starting a claim.

Local completion survives reboot. Network settings and later account linking remain
available. Private keys are not displayed or exported. Unreadable or mismatched
saved state stops replacement enrollment. An account-link failure preserves the
OS, network profiles and device identity and offers local completion. Local completion
is not proof of inference readiness, public job admission, settlement or a serving
process: those components are not supplied by this installer configuration.

## Current public account-link blocker

On 2026-10-06, an empty, non-enrolling POST to
`https://murakumo.cloud/api/devices/link/start` returned HTTP 404 with
`{"error":"unknown devices route"}`. The client currently pins this authority.
The error is before QR generation; reinstalling or changing Wi-Fi/phone settings
cannot publish the missing route. The client now identifies this specific failure.

A production handoff must integrate and publish the reviewed start/poll/status
routes and authenticated approval UI together, including authorization/receipt
binding, expiry, refusal, cancellation and revocation checks, then verify a real
Passkey account linking ceremony. Local fixture approval is not that proof. No
production deployment is performed by this change.

## Proposed decentralized workflow (not an implemented peer stack)

Local identity and setup completion are independent of a centralized account.
Keep local services usable without account registration. A subsequent **Join a
network** flow should accept an operator-signed invitation by file/USB or a typed
content address, display network identity and permissions, and require a local
choice to trust it. Never auto-claim ownership from an unauthenticated LAN peer.

The invitation binds the device DID, network trust roots, authorized roles,
expiry and replay nonce. Peer discovery may use configured peers, local discovery
and content-addressed documents; transport reachability confers no admission.
Validate signatures and device binding, persist admission separately from local
setup and cloud accounts, then establish encrypted peer channels. Show discovery,
trust, admission and execution readiness as separate observable states. Offline
setup remains complete when all peers are unavailable. None of peer discovery,
invitation admission, model execution or rewards is newly implemented here.

## Proposed OS release/update contract (not enabled)

- **Trust before transport:** provision release verification keys and a policy
  locally. Release signatures (optionally a quorum chosen by the operator) bind
  architecture, schema, monotonic release number, closure digest/content address,
  system path and compatibility constraints. Key changes require the previous
  policy's authorization or explicit local recovery. A download cannot replace
  its own trusted verification key.
- **Multiple delivery paths:** peers, IPFS/content-addressed mirrors and USB carry
  identical signed artifacts. Signed discovery pointers may advertise a release;
  the artifact's digest and signatures remain authoritative. No mandatory hosted
  controller or arbitrary remote script. Outdated advertisements cannot silently
  downgrade the installed release.
- **Prebuilt closure:** fetch all dependencies, verify every object and release
  binding, and check architecture, free space and compatibility before activation.
  No `nixpkgs` branch fetch or on-device Internet build is needed. Missing objects
  retain the current running generation and show a retryable state.
- **Preserve the host:** retain the selected disk's root/boot UUID parameters for
  every new boot entry, Wi-Fi profiles, language, device keys, account receipts,
  admission records and user data. Updates do not repartition or format a disk.
- **Stage then activate:** use Nix generations with a durable update journal and
  lock. At initial setup select a durable update policy: automatic stable updates
  (recommended) or manual activation. Automatic mode applies only releases
  admitted by the preconfigured signature policy, in a maintenance window after
  draining jobs; it needs no repeated password prompt. Manual mode stages verified
  artifacts and waits for a local apply action. A local pause keeps the current
  generation. Power loss must leave a bootable previous generation.
- **Health and rollback:** boot-counted trial activation, watchdog/health gate and
  rollback to a retained generation after bounded boot failures. Local boot/storage
  health must be independent of Internet/account availability. Network outages
  alone must not cause endless rollback. Show version, update progress, validation
  failure, reboot scheduling and rollback clearly in the setup/status UI.
- **Recovery and evidence:** retain an offline rollback entry and signed USB update
  path. Verify power loss at each journal step, wrong key/digest/architecture,
  replay/downgrade, key rotation, two competing announcements, failed boot and
  unchanged device identity before enabling automatic activation on real PCs.

No updater executable, trusted release key, peer-distributed release artifact or
health rollback service is shipped by this change. This is the implementation
contract for a subsequent update release, not an automatic-update completion claim.
