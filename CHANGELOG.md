# Changelog

All notable changes to the StanClip project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc1] - 2026-11-27

### Added
- **Modern Glassmorphic Interface**: Complete React 18 frontend with liquid glass navigation, responsive preview dialogs, and interactive pixel cursor trail animation.
- **Manual Layout Studio**: Drag-and-drop 9:16 layout builder with custom region sizing (gameplay, facecam), border stylings, and circular masks.
- **10 Caption Presets**: SubStation Alpha (.ass) generator supporting Bounce, Hype, Clean, Cinema, Speaker Card, Marker, Word Build, Pulse, Sweep, and Focus Line with word-level micro-typography.
- **Active Speaker Detection**: Integrated Light-ASD and OpenCV frontal face detection for automated podcast speaker framing.
- **Enhanced Gaming Heuristics**: Detection and viral prompt tailoring for 23+ mainstream titles (GTA VI, Fortnite, Valorant, Minecraft, etc.) with automatic tag injection.
- **Creator Workspaces**: Multi-creator management with dedicated channels, post rules, activity logs, and analytics.
- **Multi-Platform Publishing**: Direct automated publishing to YouTube Shorts, Instagram Reels (via tunnel relay), and TikTok.
- **Automated Developer Scripts**: Cross-platform startup and environment configuration scripts.
- **Local Speech-to-Text**: Offline transcription via `sherpa-onnx` and NeMo Parakeet RNN-T models.

### Fixed
- Fixed echoed index numbers in AI caption generation.
- Fixed "+ New" creator modal trigger across non-intake page routes.
- Fixed Windows 260-character path limit handling for native Sherpa DLL loading.
- Cleaned and organized development test scripts and build asset pruning.
