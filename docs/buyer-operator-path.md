# Murakumo Node buyer and operator path

This records what the current code supports after an operator installs NixOS.
It is not a claim that retail units are preconfigured. The ISO does not install
a model, expose a buyer chat UI, or pair a Kotoba authority account. Current
source adds a `murakumo.cloud` factory claim responder to the installed NixOS
node, but no new ISO or physical unit has been verified with it.

| Stage | Current action | Completion evidence |
| --- | --- | --- |
| Purchase and delivery | Retail ordering and physical fulfillment happen outside this installer. | A delivered, configured unit is inspected against the sold specification. |
| OS install | Operator boots the USB, selects and installs a target disk using the NixOS manual. | Installed host boots from its own disk and remote access works. |
| Local AI | Operator supplies an OpenAI-compatible model server and reviewed model. | `node /etc/murakumo/node-readiness.mjs --model MODEL_ID --local-url http://127.0.0.1:11434/v1` returns success from that exact model. |
| Factory identity | On each installed unit, the operator provisions a unique Ed25519 device key and label, then registers the factory DID and token with the operator-only `murakumo.cloud` API near dispatch. | The private key stays on the device; a distinct printed label and a factory row exist for that unit. |
| Buyer device claim | The buyer signs in at `murakumo.cloud`, scans the label, and the powered-on node signs the pending challenge. The node then sends signed heartbeats. | The site records a single claimed owner and a fresh signed heartbeat. This is a site device claim, separate from `auth.kotoba.cloud` authority pairing. |
| Optional community participation | Operator installs Murakumo CLI, runs `murakumo node init`, `doctor`, then `check`; `join` runs in the foreground. | Admission and fresh heartbeat are visible. They do not prove job placement. |
| Rewards | Inference credits and reward accounting are separate from CLI join. | A completed, accepted job and an actual reward ledger entry are needed. No automatic reward or cash redemption is implemented by this installer. |

The supported command sequence for the CLI is documented in
[`kotoba-lang/murakumo`](https://github.com/kotoba-lang/murakumo). The local
readiness check does not mutate the model server or contact the community. It
accepts only a loopback HTTP `/v1` URL, verifies that the exact model ID is
listed, and requests a short chat completion. It does not establish GPU
acceleration, throughput, restart recovery or hardware suitability.

After installing a reviewed NixOS configuration that imports `node-base.nix`,
the operator runs the following on each unit. `provision` refuses to replace an
existing identity. The file containing the device private key and factory token
is root-readable only; keep the printed registration JSON and QR URL private
until the unit is prepared for its buyer.

```sh
sudo node /etc/murakumo/device-claim.mjs provision --model 'Murakumo 2609'
sudo systemctl start murakumo-device-claim
sudo systemctl status murakumo-device-claim
```

The operator sends the returned `registration` JSON to
`POST https://murakumo.cloud/api/devices/register` using the site admin token
from a trusted operator environment, never from the node. The factory claim
window is 30 days from registration, so register near dispatch. The printed
`labelUrl` is the QR content. If a label must be reprinted, run
`sudo node /etc/murakumo/device-claim.mjs label` on that same unit. The buyer
opens that URL, signs in with the site's Passkey flow, scans/submits the label,
and keeps the node powered and online while it answers the five-minute
challenge. A successful claim changes the site device row to `claimed`; a
subsequent signed heartbeat confirms that the same key is online. A heartbeat
reports identity/liveness only, not model readiness or inference capability.

The site claim and the Community inference provider are separate identities
today. A claimed buyer unit is not automatically a paid provider. Joining
Community still needs its own admission, an accepted completed inference job,
and a reward ledger entry before any reward can be asserted.

Once that check passes, a user on the node can call the same local API. For
example, with a server on port 11434:

```sh
curl -fsS http://127.0.0.1:11434/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"YOUR_MODEL_ID","messages":[{"role":"user","content":"こんにちは"}],"stream":false}'
```

This is a local API call, not an account-backed Murakumo chat experience.
Access from a phone or browser needs a separately designed authenticated
interface; do not expose the loopback model server directly to the Internet.

The `murakumo.cloud/onprem` standard retail specification and the separate
24 GB/256 GB Murakumo 2609 listing must be qualified independently. A model
tested on one hardware configuration is not automatically qualified on the
other. Before advertising a turn-key buyer flow, validate the shipped unit's
image, model license and digest, local endpoint, account linking, recovery and
support path on physical hardware.
