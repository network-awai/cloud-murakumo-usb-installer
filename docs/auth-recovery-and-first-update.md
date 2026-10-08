# Authentication recovery and first physical update

## Confirmed outage, 2026-10-08

The separate Worker cleanup receipt records deletion of `kotobase-authn` and its `kotobase-authn_AuthnStore` on 2026-10-08. Live API checks return 404 for the script, versions and service. No matching Durable Object namespace is listed in the three accessible accounts. All three former authentication hosts (`auth.murakumo.cloud`, `auth.kotoba.cloud`, `auth.kotobase.net`) fail DNS resolution. This is an authentication infrastructure outage, not a Node installation failure.

The original `AUTHN_CREDENTIALS` KV namespace remains in cloud-kotoba and contains 135 listed records. This is a record count, not an account or Passkey count. No credential bodies or private values were retrieved. `kotoba-identity-authority` is a separate closed private authority and has no storage bindings; it is not the missing authentication service.

The five known Keychain service names inspected did not resolve to stored items; this is not an exhaustive Keychain search. The connected 1Password account has no Environments. Neither result proves that no backup exists elsewhere.

Do not create replacement wrapping/signing keys, new account mappings, or a replacement AuthnStore and claim existing accounts were restored. Recover the original AUTHN_KEK (including any rotation slots), Biscuit root, and account/controller/revocation state from the designated backup. The canonical implementation is `cloud-kotoba/kotobase-control-plane/authn`. Preserve the RP hosts and DID/credential relationships. The owner must supply backup custody/location, not secret values in chat.

Once custody is identified: validate unwrap in a private operator process without outputting key material; restore the account state and original signing authority; rebuild and test the canonical source in an isolated worktree; restore authentication service bindings and domains; verify existing-account login, one-use challenges, revocation and device approval. Fresh fixture credentials alone do not establish restoration of existing accounts.

Setup remains available at `https://setup.murakumo.cloud/health`. Its sign-in bridge intentionally returns 503 until the original authentication endpoint is healthy, without approving a device or discarding installed OS/network settings.

## How to update the physical Node

1. Start the installed AiueOS with Wi-Fi or Ethernet connected. Use **Node details** to identify the host. Supply its reachable Tailscale hostname/IP to the operator. The previously inspected `6600hs-2` was Ubuntu; it is not an identified AiueOS update target.
2. The operator inspects `/run/current-system`, the installed update units, the owner configuration/journal, UEFI/root and ESP UUIDs, available space, and real watchdog/fallback qualification. Preserve existing journal/high-water marks. Provision the owner's production trust and policy only after qualification; never set `watchdogQualified` merely to bypass a hold.
3. Once configuration exists, use `sudo systemctl start aiueos-update.service` for a check, and `sudo systemctl status aiueos-update.timer --no-pager` plus the redacted Node details status to observe it. A successful start alone does not mean an image was installed; the status must show the release decision and later the committed generation. The normal automatic timer is already included in installed systems. If disabled, the operator can enable it with `sudo systemctl enable --now aiueos-update.timer` after provisioning.
4. Automatic stable checks run every 15 minutes plus up to two minutes jitter. Normal application waits for the local 03:00–05:00 window and all safety gates. Signature/hash verification and retained boot recovery precede trial boot. Success is recorded after health checks on the expected generation.

At this inspection, public stable sequence 4 remains the published image. It predates the setup-domain and Escape navigation source changes. Rebuild and publish a new signed release for those changes; neither a restart nor checking sequence 4 obtains newer source code.

The current production closure is 7,488,473,952 bytes. The provider reserves roughly three archive lengths (22,465,421,856 bytes, about 20.9 GiB) for staging; it can hold an update for insufficient space. Never erase or reinstall the internal disk to resolve an update hold. USB is installer media, not an in-place updater: its current installer can erase the selected disk and is not the recommended update path.

Physical activation and a successful update remain pending the actual AiueOS target. Authentication restoration remains pending the original custody and account-store backup.
