# Update integration verification — 2026-10-08

Implemented: exact-byte Ed25519 quorum envelope verifier; closure hash/length;
manifest/channel/architecture/expiry/high-water compatibility checks; pending
release resumption; provider journal/controller; real shared CLJK JSON port;
normal, manual and deadline semi-mandatory decision; failed-trial blocking.

Observed on Mac:
- grant lifecycle: 4 tests / 36 assertions, zero failures.
- installer existing + release tests: 77 tests, zero failures (normal macOS API
  access needed for existing uptime test).
- cross-repository bridge: actual kbb CLJK policy invocation from signed release
  to verified stage, trial request and health commit; simulated host providers.
- JSON trial port returns commit for measured fixture local-health pass.

Not qualified: new Nix evaluation/ISO build, Linux real closure import, bootloader
one-shot/fallback, watchdog, power-loss VM scenarios, real signing authority,
current owner policy UI, fleet enforcement, production rollout or USB rewrite.
No running Node, production or USB was changed. References in node-base.nix are
source integration only; disabled defaults install no executable updater service.

Reproduce pure tests in the grant checkout:
`kbb --classpath src:test -e '(require (quote grant.update-lifecycle-test) (quote kotoba.test)) (kotoba.test/run-tests (quote grant.update-lifecycle-test))'`

Run installer tests normally with `node --test test/*.test.mjs`. For bridge set
`AIUEOS_GRANT_CHECKOUT` to the matching grant checkout then run
`node --test test/update-policy-bridge.test.mjs`. Without that variable the bridge
explicitly skips; it is never counted as a tested production provider.
