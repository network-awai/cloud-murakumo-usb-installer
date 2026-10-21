# NixOS and Murakumo product names

The current installer delivers NixOS and configures Murakumo Client. AiueOS is
an unfinished future replacement for NixOS; it is not a NixOS distribution name.

| Role | Name |
| --- | --- |
| Current operating system | NixOS |
| Installed software suite | Murakumo Client |
| Resident participation process, when supplied | Murakumo Daemon |
| Command interface | Murakumo CLI |
| User-facing application | Murakumo App |
| Running network participant / host | Murakumo Node |
| Future operating system | AiueOS |

Installation is **Install NixOS → Set up Murakumo Client → Participate as a
Murakumo Node**. Node details describe the host and participation status. Local
setup or account approval does not establish running inference or fleet admission.
The Daemon name describes a role; this naming change does not add a daemon binary.

## Compatibility and delivery

Existing `aiueos.*` signed schemas, service/unit names, paths, boot entry IDs,
release endpoints, signing-key IDs and Nix options remain compatibility identifiers.
Renaming them would require a separately qualified migration; their spelling does
not identify the current OS as AiueOS. Boot-menu titles and current UI text say
NixOS. Historical evidence, hashes and release receipts retain their original text.

This source change does not rewrite already delivered USB media, change a
published signed release or update an installed host. Those need a new built and
qualified release. Existing disk labels and ownership/update policy remain intact.
