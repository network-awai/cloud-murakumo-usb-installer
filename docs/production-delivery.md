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
