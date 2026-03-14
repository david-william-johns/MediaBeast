# MediaBeast

A high-performance, fully self-contained music discovery and audio analysis suite for Windows.

## Overview

MediaBeast is a complete rebuild of the ArtistDiscography project, redesigned from the ground up using a modern, production-grade tech stack. It unifies three previously separate applications into a single, integrated desktop experience.

## Features

### Discography
- Search an artist's full discography via the MusicBrainz API
- "Song Title" mode — find every artist who recorded a specific song
- Fetch YouTube URLs and detect available video quality (480p, 720p, 1080p, 4K)
- Download up to 3 tracks concurrently with real-time per-track progress
- Rip audio to MP3 via bundled ffmpeg — no external install needed
- Per-row kill buttons, status tracking, and quality colour-coding
- Search history (per-mode, persistent), previous results with waveform previews
- Export selected YouTube URLs to timestamped `.txt` files
- Configurable output folder paths and folder management dialog

### Player
- Full audio playback with playlist sidebar
- 10-band parametric equalizer (62 Hz – 16 kHz, ±12 dB)
- EQ presets (Flat, Rock, Pop, Jazz, Classical) and custom save/load profiles
- Album art downloaded and cached from YouTube thumbnails
- Smooth crossfade transitions (300 ms fade-out/in) on track skip
- Seek bar with drag support, volume control, auto-advance

### Wave Analyser
- Dual-channel (L/R) stereo waveform visualisation via WaveSurfer.js
- Timeline ruler with clickable seeking
- Independent horizontal (zoom in/out/reset, mousewheel, keyboard shortcuts) and vertical zoom
- Click-and-drag region selection with start/end time display
- Real-time playhead, loop toggle, transport controls
- Waveform cache (pre-decoded by Rust backend) for instant reload
- Edit toolbar (Cut, Copy, Paste, Silence, Fade In/Out, Normalize, Reverse)

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2.0 |
| Backend | Rust (tokio, reqwest, symphonia) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State management | Zustand + Immer |
| Audio playback & EQ | Web Audio API (BiquadFilterNode chain) |
| Waveform visualisation | WaveSurfer.js v7 (Regions + Timeline plugins) |
| Table virtualisation | TanStack Table v8 + TanStack Virtual |
| Bundled tools | yt-dlp, ffmpeg, ffprobe (no user install required) |
| Installer | NSIS — Desktop + Start Menu shortcuts, no admin required |

## Architecture Highlights

- **Unified shell** — all three tools live in one window; audio continues playing when switching between tabs (panels are CSS-hidden, never unmounted)
- **Concurrent downloads** — Rust `tokio::sync::Semaphore` (3 permits) replaces Python's `ThreadPoolExecutor`; real-time progress streamed via Tauri IPC channels
- **EQ** — 10 `BiquadFilterNode`s chained in the Web Audio API graph; `setTargetAtTime()` for click-free gain changes
- **Waveform** — Rust decodes MP3 → downsampled peaks JSON (symphonia); WaveSurfer renders from peaks with no in-browser audio decode overhead
- **Self-contained** — yt-dlp, ffmpeg, and ffprobe are bundled as Tauri sidecars; no PATH dependencies

## Prerequisites (Development)

- [Rust](https://rustup.rs) (1.80+) with the `x86_64-pc-windows-msvc` target
- [Node.js LTS](https://nodejs.org) (20.x or 22.x)
- Visual Studio C++ Build Tools (Desktop development with C++)
- WebView2 Runtime (pre-installed on Windows 10/11)

## Development

```bash
# Install dependencies
npm install

# Start dev server (hot-reload)
npm run tauri dev

# Build production installer
npm run tauri build
```

The NSIS installer is output to `src-tauri/target/release/bundle/nsis/`.

## Project Structure

```
MediaBeast/
├── src-tauri/          # Rust backend (Tauri commands, audio decode, downloads)
│   └── src/
│       ├── discography/    # MusicBrainz, yt-dlp, download manager
│       ├── player/         # EQ profiles, thumbnail cache
│       ├── analyser/       # Waveform decode + peaks cache
│       └── fs/             # Folder management
├── src/                # React + TypeScript frontend
│   ├── store/          # Zustand state slices
│   ├── hooks/          # usePlayerAudio, useWaveSurfer, useDownloadEvents
│   ├── lib/            # audioEngine, eqChain, tauriCommands
│   └── components/     # shell, discography, player, analyser
└── binaries/           # Bundled yt-dlp, ffmpeg, ffprobe sidecars
```

## Data & Compatibility

MediaBeast is compatible with data created by the original ArtistDiscography Python app:
- `search_history.json`, `previous_results.json`, `eq_profiles.json` — identical schema, auto-migrated on first launch
- Audio files (`Raw_Audio/`, `Raw_Video/`) — point Settings to your existing folders
- Album art cache (`Music_Library/thumbnails/`) — JPEG files work as-is
- Waveform cache — `.npy` format not compatible; cache is rebuilt automatically on first access

## License

MIT
