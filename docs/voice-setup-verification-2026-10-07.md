# Voice setup qualification — 2026-10-07

Implementation source: `3d186d1`. Product naming: AiueOS operating system; Murakumo Node service.

## Verified locally

- 59 Node tests pass, including stale screen/model response refusal, deduplication, model action bounds, local password spelling, fresh serial-bound erasure consent, VAD and audio-control consent invalidation.
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

## ASR controls follow-up

Actual Whisper base misrecognized short Japanese secret characters and both tested serial-confirmation phrases. It is not the shipping recognizer. Immutable official Whisper small (487601967 bytes, SHA256 `1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b`) correctly recognized language selection, `小文字のBを入力`, `数字の7を入力`, `入力完了` and `番号1234のディスクを消してインストール`. The actual recognizer fed VoiceControl; secret `b7` reached only the fixture callback and the serial-bound erase callback targeted `/dev/voice-fixture`. No disk was erased. Empty secret completion is refused. Evidence: `voice-asr-controls-small-result.json`, `voice-asr-controls-small.log`.

The service now creates both UI and voice runtime directories through systemd. The root-owned voice parent permits traversal (0711); each private session remains0700 and owned by the unprivileged runtime. This avoids the installed service's strict filesystem protection preventing startup or the runtime from reading its own0600 model key/audio.

The first full ISO build without network failed because system dependencies were not all cached. Package creation is permitted to fetch trusted immutable build dependencies; offline installation is qualified separately. No image from that failed build was distributed.

Final small-model dialogue run passed all five cases in9507ms. Actual English small-model recognition also passed `lowercase B`, `digit seven`, `done` and the exact serial-bound erase phrase. Named symbols and NATO letters are parsed locally; sentence punctuation cannot silently add password characters. Physical microphone=false and actualDiskErased=false.

The protected runtime-directory test passed under actual systemd with `ProtectSystem=strict`, `NoNewPrivileges=yes`, a0700 session and a0600 file read as the dedicated unprivileged voice user. The updated GTK flow passed again. Selected results are committed under `docs/evidence/voice-setup-2026-10-07/`.

## Acoustic playback coordination

The real GTK approval view now sends playback state to the voice agent. Recognition pauses while BGM/FSK plays, pending erase consent is cleared, and listening-state notifications cannot terminate the code player. A new native GTK test sends the existing public FSK code by voice, injects the listening notification immediately after player startup, and verifies the player completes before returning. The code generator/QR renderer are real; the one-second player is an explicit fixture, not a physical speaker. Results: `voice-ui-playback-final.log` and the committed `voice-ui-result.json`. Each run now uses unique result/transport paths so old files cannot establish success.

The native GTK voice action produced real QR PNG and16000Hz FSK WAV. Independent macOS Vision QR decoding and the acoustic decoder both returned `https://murakumo.cloud/portal/#device-link?code=ABCD123456`. This is a fixture public code, not a live approval.

Final playback binding tests also confirm requested BGM is allowed to finish. Only the initial startup BGM is stopped when dialogue becomes ready; manual BGM and FSK use the shared playback pause/resume protocol. Initial automatic language detection recognized Japanese and English correctly and selected both languages through the real controller. Evidence: `voice-ui-audio-final.log`, committed `voice-auto-language-result.json`.
