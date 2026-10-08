# Production delivery preparation

The dedicated `distribution/worker.mjs` provides read-only GET/HEAD access to
signed channel manifests and SHA256-addressed ISO/NAR exports in an R2 bucket.
It never creates trust roots or accepts uploaded commands. Node verification
is independent of TLS, a gateway or the Worker. Distribution dry-run and route,
range, HEAD, missing-object and cache tests qualify the transport source only.

The native macOS signing adapter stores Ed25519 private bytes in the login
Keychain. `init KEY_ID` refuses an existing key. `public KEY_ID` prints only the
raw public key. `sign KEY_ID` signs bounded stdin bytes without exporting private
bytes. This is software key custody under the local operator, not Secure Enclave
Ed25519 support or an independently operated quorum. Separate operator approval
and signing custody are still required for independent-authority claims.

Production activation needs: integrated source commits; explicit signing root
provisioning; successful Cloudflare authorization; uploaded complete closure;
verified published manifest/hash; owner configuration; qualified local watchdog
and rollback. Nothing named QA becomes production by changing its filename.
The current installer ships update services but no owner configuration or
production signing roots. Installing it alone does not activate remote updates.

The existing serial-bound KIOXIA helper validates ISO length/hash before writing,
reidentifies external media, reads back exactly the ISO length and ejects only
on a hash match. A USB write requires the configured KIOXIA to be attached; an
old disk number is never an identity.

To keep signing keys off the Linux builder, export with
`scripts/publish-update.mjs SPEC --unsigned OUTPUT`; this writes
`manifest.pending.json`, never an unsigned channel manifest. On Mac, invoke
`scripts/sign-keychain-release.mjs MANIFEST KEY_ID COMPILED_SIGNER` for each
approved signer. It verifies the returned signature against the public key
before appending it to the unchanged payload and writing atomically. Promote
only after the provisioned quorum verifies; source tests do not prove that a
production Keychain key has been created or a live file published.

## Prepared installer media, 2026-10-08

Full offline installer ISO: 5,248,696,320 bytes; SHA256
`8f671359a2fec6dcd88b5e5242531adaaabd1cf231d2ceea66e6fbe19449aed3`.
The Linux builder and Mac streaming hashes match. A dedicated no-network UEFI
VM booted this ISO to the graphical Japanese/English language selector; no disk
approval or formatting was issued. The ISO's offline system manifest identifies
UEFI `rh66qxk7wy88pavi6vnxllcranq21c1c` and BIOS
`05h4l5l146bbd4khnnh32mxdkr759fg6`. Source tests pass 86/86 and distribution
Worker dry-run succeeds. Full recovery qualification remains the preceding
committed update VM evidence; this media boot alone is not a new recovery test.

Still pending: both source PRs are open; production signing authority has not
been provisioned; Cloudflare authorization has expired; no KIOXIA external disk
was detected. No production deployment, manifest publication or USB write is
claimed. The prepared USB request is `action: check`, never `write`.

Read-only inspection of the ISO squashfs confirms both UEFI and BIOS installed
systems contain `aiueos-update.service`, `aiueos-update-recover.service` and the
update timer. Recovery is conditioned on the durable journal, independently of
owner config availability. The unit-referenced runtime SHA256 is
`42a494666687d730d3a7005cce0c8483c77623a0ed528a7d1fb002906dd3d475`, matching
the reviewed `nixos/update-linux.mjs`. The offline SCI/nbb policy runtime is
included. Unit inspection and the language-screen image are stored under
`docs/evidence/updates-20261008`. Dedicated media QA and builder VMs were
normally powered down; other user VMs were left running. Trimming only the
builder's unallocated ext4 blocks restored approximately 5.3 GiB of Mac capacity;
the generated ISO and retained build closures were preserved.

## Production publishing tools

The distribution Worker accepts channel-relative immutable archive URLs as well
as root-level URLs: the Node resolves an archive relative to `/stable/`, and
both map to the same SHA256-named R2 object. A regression test uses the actual
Node URL resolver. Cloudflare account selection is explicit in Wrangler config.

`distribution/upload-worker.mjs` is a temporary operator publishing tool, not
the read-only Node transport. Deploy it only with an exact `ALLOWED_KEYS` JSON
list and the operator Ed25519 `PUBLIC_KEY`. Each request verifies a short-lived
`aiueos.upload.v1` ticket binding operation, object, upload ID, part number,
body length and SHA256. Parts are at most 32 MiB. It has no unsigned upload or
command path. `scripts/upload-release-r2.mjs` signs tickets through the approved
Keychain helper and checkpoints multipart receipts for resumption. Supply HTTPS
URL, FILE, HASH_KEY, SIGNER_BINARY, KEY_ID and CHECKPOINT arguments. Never pass
private key bytes to the Worker. After upload, verify the full object length and
SHA256 through the read-only production transport before promoting the signed
channel manifest, and delete the temporary publishing Worker.

The real `aiueos-6600hs-2` at `100.84.134.120` was checked over Tailscale SSH on
2026-10-08: Ubuntu 24.04.4, UEFI, no AiueOS update timer and no `/dev/watchdog0`.
The AiueOS provider must not be installed/enabled there as an Ubuntu replacement.
Physical automatic activation awaits the actual installed AiueOS target and
qualified watchdog/fallback evidence; an online hostname alone is insufficient.
