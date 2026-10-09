# User-rooted Node linking

Status: design and integration gates, not implemented or deployed. Authority:
[root PR #3529](https://github.com/com-junkawasaki/root/pull/3529), merged as
`3ab11be9f8c86def4967a397784fb164fc5a4e7d`; ADR-2610091510 and ADR-2610091640.
These supersede restoring the retired kotobase-authn service as the default plan.

## User journey

1. Install AiueOS offline. Reuse connected Ethernet or saved Wi-Fi automatically.
   Preserve the Node's existing did:key identity, network profiles and data.
   Local setup can finish before an account is linked.
2. Open setup.murakumo.cloud from the Node QR or on another computer. The code
   identifies a pending request; possession of a QR, acoustic code or 8-digit remote
   code never grants ownership. Display the Node identity, requested capabilities,
   request origin and expiry before approval.
3. Choose **Passkey / Base account** or **Connect an external wallet**. Keep both
   entry buttons available without Privy. Privy may supply the external-wallet
   connection modal only; a connected address is not authenticated.
4. For Passkey, a user click opens a top-level auth.kotoba.cloud signing window.
   Preserve that RP ID. Do not call the root Passkey from a Murakumo iframe or
   enable related-origin root signing. The signing page must show the exact Node,
   requesting origin, capabilities and expiry. Use content-addressed builds, SRI
   and CSP, with exact popup origin/source checks.
5. Delegate narrowly to the browser's non-exportable session key and the specific
   Node key. Bind approval to the immutable request CID, Node DID, fresh single-use
   challenge, audience, chain and expiry. Prove control of the Base smart account
   with ERC-1271, or ERC-6492 for an undeployed account. An external EOA uses the
   admitted SIWE/ERC-191 path with the same nonce/origin/chain/expiry checks.
6. The registration boundary verifies the user-rooted capability chain, current
   account/registry authority, attenuation, revocation and request binding before
   accepting the claim. The Node verifies its bound receipt before persisting it.
   A cookie, Privy user/JWT or server response asserting valid=true is insufficient.
7. Show the linked account and Node status. Offer a second owner credential as a
   separate explicit action. Linking a Node does not authorize payments, restore
   another identity, establish fleet inference or disclose saved Wi-Fi secrets.

## Integration order and acceptance gates

- Implement the canonical signing page and EIP-1193/EIP-6963 provider first.
  Announce the provider before Privy mounts; qualify popup discovery on real
  browsers. Keep direct Passkey and direct external-wallet entry if Privy fails.
- Privy Dashboard permits wallet only. No login, loginOrLink,
  connectOrCreateWallet, embedded wallets, JWT authority or server signer.
  Verify source, built artifact and browser traffic, rather than trusting config.
- Qualify user-rooted delegation on Base Sepolia before mainnet. Reject a wrong
  Node, altered CID, wrong popup origin/source, reused challenge, expired grant,
  changed/revoked owner, Privy JWT and legacy-cookie-only claim. Refuse when chain
  authority cannot be checked. Fixtures are not real-phone Passkey qualification.
- Switch the setup Worker and Node protocol together; never change the QR URL
  alone and claim authentication repaired. Record the old wire format as legacy
  until migration is qualified. Do not implicitly merge old DID accounts with a
  new wallet address or mint new server-held root keys.
- Keep spend permission and account recovery separate. No payment permission is
  requested just to link a Node. Recovery-module mainnet activation requires its
  own audit; Privy and operators are not guardians.

## Current evidence boundary

The accepted ADR says its implementation is still absent. The current setup
Worker's health endpoint is reachable, while the retired auth.murakumo.cloud
endpoint does not resolve. The new signing window and user-rooted claim verifier
have not been deployed or exercised on a real phone in this task. Old signed
receipt checks and VM fixture approval remain legacy evidence only.

The network-skip implementation passed 123 installer tests. A built ISO completed
an offline update on the dedicated VM, preserving fixture hashes, sequence floor,
previous GC roots and boot entries. That ISO predates the network-skip source;
neither the latest USB delivery nor physical Node account linking is complete.

## Legacy registration recovery

A matching version-1 record is retained as migration evidence, not accepted as
user-root authority. Setup offers explicit account linking again with the same
Node identity and saved network configuration. Cancellation, service failure or
an unsigned server response leaves the old record intact. Only a freshly
verified user receipt replaces it atomically with version 2. A mismatched or
unreadable record remains blocked for maintenance; boot does not start a claim.

Recovery checks: account-link, setup-flow and registration-ui tests: 27 passed.
