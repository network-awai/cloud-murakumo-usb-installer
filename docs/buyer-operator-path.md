# Murakumo Node buyer and operator path

This records what the current code supports after an operator installs NixOS.
It is not a claim that retail units are preconfigured. The ISO does not install
a model, expose a buyer chat UI, pair a Kotoba account or enroll a node.

| Stage | Current action | Completion evidence |
| --- | --- | --- |
| Purchase and delivery | Retail ordering and physical fulfillment happen outside this installer. | A delivered, configured unit is inspected against the sold specification. |
| OS install | Operator boots the USB, selects and installs a target disk using the NixOS manual. | Installed host boots from its own disk and remote access works. |
| Local AI | Operator supplies an OpenAI-compatible model server and reviewed model. | `node /etc/murakumo/node-readiness.mjs --model MODEL_ID --local-url http://127.0.0.1:11434/v1` returns success from that exact model. |
| Account and device | Kotoba Passkey and any device claim are separate services. The current ISO has no pairing UI. | The authority shows a linked device with a device-bound receipt; a local inference check alone is not a claim. |
| Optional community participation | Operator installs Murakumo CLI, runs `murakumo node init`, `doctor`, then `check`; `join` runs in the foreground. | Admission and fresh heartbeat are visible. They do not prove job placement. |
| Rewards | Inference credits and reward accounting are separate from CLI join. | A completed, accepted job and an actual reward ledger entry are needed. No automatic reward or cash redemption is implemented by this installer. |

The supported command sequence for the CLI is documented in
[`kotoba-lang/murakumo`](https://github.com/kotoba-lang/murakumo). The local
readiness check does not mutate the model server or contact the community. It
accepts only a loopback HTTP `/v1` URL, verifies that the exact model ID is
listed, and requests a short chat completion. It does not establish GPU
acceleration, throughput, restart recovery or hardware suitability.

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
