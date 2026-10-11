# Installation SSH through Kekkai

The installer and installed NixOS client offer **8-digit pairing / Kekkai SSH**
before any account or Passkey registration. The code is a pairing credential;
it is not an SSH password. The Node owner approves the computer and then its
Ed25519 SSH key and X25519 Kekkai machine key on the physical Node screen.
This grants administrative `murakumo-admin` access, including sudo.

1. Connect the Node and manager computer to the same LAN (Ethernet or Wi-Fi).
2. On the installer choose **Connect another PC / Kekkai SSH with 8 digits**.
   After installation choose **Set up from another PC / SSH**.
3. Open the displayed `https://IP:8443/`, compare the certificate SHA256 with
   the Node screen, and download/extract `kekkai-client.tar.gz`. Download
   happens before browser pairing; choose either the Kekkai client or the
   existing browser/LAN SSH path, not both with the same one-use code.
4. Use Node.js 22+ on the manager. The client creates a local Ed25519 SSH key
   if it does not already exist; an existing key is preserved:

```sh
node ./setup-client.mjs --runtime "$PWD" --url https://NODE_IP:8443 \
  --fingerprint NODE_CERTIFICATE_SHA256 --identity "$HOME/.ssh/murakumo"
```

Enter the eight digits when prompted. Select **Refresh connection status** on
the Node to see the pending computer. Approve the computer, refresh to see
both key fingerprints, compare them with the manager terminal, and approve
administrative SSH. OpenSSH performs its usual host-key confirmation. The
client prints the command for subsequent connections using its saved profile;
no additional Passkey or pairing code is required until the key is revoked.

The code expires after five minutes and five attempts; the HTTPS pairing
session expires after ten minutes. Approval persists until the owner removes
it. Only one current management key/overlay peer is retained. Replacement
removes the previous key and restarts the overlay. **Remove SSH key** removes
both the SSH grant and the Kekkai service configuration. Existing plain LAN SSH
sessions are not forcibly terminated; stopping the overlay closes its transport.
If activation fails, the new keys are removed and both services stop.

The control channel pins the certificate before sending the code. It issues a
locally signed Kekkai netmap with an independently pinned Ed25519 authority,
separate Noise keys for the relay and the Node, and an SSH-only port-22 grant.
The actual Kekkai agent, encrypted UDP relay and userspace TCP stream feed
OpenSSH. No cloud login, npm fetch at boot, TUN privilege, or account vault is
needed. LAN browser SSH remains a separate option.

The approved SSH key, TLS identity, Kekkai identity and SSH host identity are
copied privately to the installed disk so the same profile can reconnect after
installation and reboot. They are not included in the ISO or Nix store.
The public runtime is frozen with source SHA256s and licenses in
`nixos/kekkai-runtime-sources.json`; `scripts/package-kekkai-runtime.py` rebuilds
that bundle from reviewed Kekkai/SCI namespaces.

This bootstrap uses a Node-local relay on UDP 41642 and agent on UDP 41643.
It supports the local network, not an Internet/NAT traversal deployment. If the
Node's LAN address changes, issue a new code and pair using its current URL.
Public cloud relay provisioning remains separate.

The release VM gate includes `nixos/tests/kekkai-setup.nix`: two real NixOS VMs,
HTTPS certificate pin refusal before code transmission, physical-approval API
bound to both keys, real Noise/UDP/OpenSSH with a pinned host key, account-free
connection, same-disk reboot, and revocation. Local approval is scripted through
the root-only control socket in this test, not performed by a human. It does
not establish physical Node, Mac, mobile Passkey, or Internet relay qualification.
