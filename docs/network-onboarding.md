# Network onboarding flow

The installation medium opens the network screen before disk selection. The
installed OS opens the same screen before phone registration. No console
switch or command entry is needed for ordinary Wi-Fi or Ethernet onboarding.

1. An already connected Ethernet or saved Wi-Fi connection goes straight to
   connection confirmation. Otherwise choose Wi-Fi, Ethernet, or continue offline.
2. Wi-Fi lists nearby networks by signal strength, deduplicating repeated SSIDs.
   Select a network, enter its Wi-Fi password with masked characters, and connect.
   The entered secret is passed to NetworkManager via stdin, not process arguments,
   shell history, service logs, the Nix store, or source control. Persistent profiles
   remain in NetworkManager's private system-connections directory.
3. Ethernet activation waits up to 15 seconds for the connection. Wi-Fi activation
   waits up to 25 seconds. Cancellation and failures return to the available choices.
4. The confirmation screen separates local connection, Internet access and HTTPS
   reachability of Murakumo. Internet probing uses Google's HTTPS 204 endpoint;
   Murakumo HTTPS reachability can also confirm Internet access when that probe is
   filtered. Reachability does not claim the registration API is deployed or the
   account is linked. HTTPS redirects are refused and probes have 5-second limits.
5. Offline continuation does not block OS installation. Its saved Wi-Fi profiles
   are copied into the installed OS. At first boot, “register later” displays a
   completed-installation screen with reconnect/register and shutdown choices.
6. Online continuation enters the [QR/Passkey account-linking flow](account-onboarding.md).
   Registration errors return to an actionable screen. The protocol's identity,
   approval binding and public receipt validation remain unchanged. Registration
   completion does not configure a model server or establish fleet inference.

The setup uses arrows and Enter. A framebuffer terminal with bundled Japanese
fonts renders the Japanese UI; framebuffer-less consoles get an English fallback
with identical choices. Alt+F2 remains the local maintenance console. It is
not required for normal onboarding. The framebuffer renderer launches once.
English fallback is allowed only if its child never started; a started installer
is never run a second time automatically.

Enterprise 802.1X networks require advanced maintenance configuration. Hidden
networks accept an explicitly entered SSID and password. If no Wi-Fi adapter is
visible, the UI explains that and offers Ethernet or offline continuation.
Actual adapter/driver compatibility must be checked on the physical PC.

Disk selection, pre-erasure closure checks, explicit whole-disk erase confirmation,
USB exclusion and offline system copying retain their existing safety checks.
No production API deployment is included in this UI change.
