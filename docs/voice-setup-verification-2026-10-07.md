# Voice setup qualification — 2026-10-07

Implementation source: `3d186d1`. Product naming: AiueOS operating system; Murakumo Node service.

## Verified locally

- 57 Node tests pass, including stale screen/model response refusal, deduplication, model action bounds, local password spelling, fresh serial-bound erasure consent, VAD and audio-control consent invalidation.
- Actual GTK4/GJS frontend with VoiceControl and a dedicated installer-backend fixture completes Japanese language selection, Wi-Fi choice, secret input, serial-bound confirmation and Continue. `actualDiskErased=false`; this is a binding/flow test, not a physical disk installation.
- Official whisper.cpp 1.8.4 with immutable `ggml-base.bin` recognizes the Japanese PCM fixture as `Wi-Fiに、接続したいです。`. Actual Qwen3 1.7B Q8_0 selects Wi-Fi, smartphone-free local completion and English wired networking. It distinguishes unlinked status from an explicit linked-status fixture. Five cases took 11229ms on Mac native CPU, two threads; this is a combined test duration, not a per-turn speed guarantee.
- Japanese OpenJTalk synthesizes the actual model reply as an unprivileged user in the network-disconnected x86_64 VM. The final voice runtime package builds from the cached immutable model and Nix dependencies without network access.
- BIOS and UEFI retained install configurations parse and evaluate. Source retention includes all voice modules and license notices.

## Negative findings and limits

Qwen3 0.6B incorrectly selected an operation when asked a status question; it is not the default. The 1.7B model passed the corresponding actual-model test. x86_64 inference under Mac TCG emulation was too slow for conversation qualification; the real dialogue test uses native Mac CPU and the same pinned model/runtime version. No claim of physical target-PC latency follows from that result.

This version is half duplex. It suppresses its own speech/BGM while listening; full duplex and acoustic echo cancellation are not qualified. Physical microphone/speaker, actual Wi-Fi hardware and a real phone Passkey ceremony remain separate acceptance gates. Speaking a command, QR or FSK decoding, and speaker similarity cannot establish account ownership. The real registration server must authenticate the owner and issue the signed bound receipt.

## Restartable evidence

Evidence directory: `/Users/junkawasaki/github/murakumo-usb-auto-install-qa/`.

- `voice-native-final-result.json`, `voice-native-final.log`: actual recognition and dialogue.
- `voice-ui-result.json`, `voice-ui-integration.log`: real GTK/controller fixture flow.
- `voice-final-package.log`: offline runtime build.
- `voice-final-eval.log`: BIOS/UEFI evaluation.
- `voice-reply-tts.log`, `voice-ai-reply.wav`: actual model reply synthesized offline.
- `voice-iso-build.log`: frozen-source ISO build; completion must be checked before using the image.

No USB overwrite or physical disk operation has been performed for this voice candidate. Old prototype ISOs were preserved. App/Worker production release remains a separate reviewed change.
