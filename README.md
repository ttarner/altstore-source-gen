# AltStore & SideStore Source Generator 🚀

A modern, standalone, client-only single-file web application (`index.html`) designed to generate valid `source.json` repository files for **AltStore** and **SideStore** from heterogeneous data sources.

---

## ✨ Key Features

- **100% Client-Side:** No backend, database, or Node/npm build step required to run. Open `index.html` in any modern web browser or deploy directly to GitHub Pages, Netlify, or Vercel.
- **Provider Registry & Adapter Pattern:** Decoupled architecture separating data fetching (`Providers`), the core transformation engine (`AltStoreNormalizer`), and the user interface (`AppController`).
- **GitHub Releases Provider (Active):**
  - Flexible input parsing: full URLs (`https://github.com/owner/repo`) or shorthand notation (`owner/repo`).
  - Automatic filtering to isolate only releases containing `.ipa` assets.
  - Smart version tag normalization (strips leading `v` prefix).
  - Complete mapping: version string, ISO timestamp, file size in bytes, direct download URL, and release notes / changelog.
  - Coherent reverse-DNS identifier fallback (`com.{cleanOwner}.{cleanRepo}`).
- **Future-Ready Architecture:** Disabled options with *"Coming soon"* badges for alternate providers (*GitLab Releases*, *Direct Manifest*), easily extensible by adding a key to the `Providers` registry.
- **UI / UX Inspired by Linear, Raycast, and Vercel:**
  - Modern deep dark theme (`#080c14` / `#0e1626`) with subtle ambient radial glow and high-contrast borders.
  - Segmented pills component for source selection.
  - One-click sample buttons (*utmapp/UTM*, *LiveContainer/LiveContainer*, *Enmity-Mod/Enmity*).
  - Expandable advanced configuration (custom source name, bundle ID, icon URL, and optional **GitHub Personal Access Token** to bypass unauthenticated API rate limits or access private repositories).
  - Live visual app overview card (icon, latest version, package size, total IPA versions found).
  - Code preview with syntax highlighting, copy button with animated confirmation, and instant `source.json` download via Blob.

---

## 🏛️ Code Architecture

The application is structured into three clean layers inside `index.html`:

```
┌────────────────────────────────────────────────────────┐
│                   AppController (UI)                   │
│   - Form handling, loading/error states                │
│   - Metadata summary and JSON code preview             │
│   - Clipboard interactions and Blob download           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              Provider Registry & Adapters              │
│   - Providers.github (active)                          │
│   - Providers.gitlab (stubbed / coming soon)           │
│   - Providers.manifest (stubbed / coming soon)         │
└───────────────────────────┬────────────────────────────┘
                            │ NormalizedSourcePayload
┌───────────────────────────▼────────────────────────────┐
│          AltStoreNormalizer (Core Engine)              │
│   - Converts normalized payload into AltStore format   │
│   - Sorts versions in descending chronological order   │
│   - Applies user overrides and schema cleanup          │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Method 1: Direct File Opening
Double-click `index.html` to open it immediately in your browser (Chrome, Safari, Firefox, Edge).

### Method 2: Local Static Server
```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx serve .
```
Navigate to `http://localhost:8000` in your web browser.

### Method 3: From VS Code (Tasks & Debugging)
- **Keyboard Shortcut:** Press `Ctrl+Shift+B` to run the default task: *"Start Local Server and Open Browser"*.
- **Tasks Menu:** Press `Ctrl+Shift+P` $\rightarrow$ select `Tasks: Run Task` $\rightarrow$ choose Python, Node.js, or Direct browser launch.
- **Debug / Run (F5):** Press `F5` to launch an active browser session with debugging in Microsoft Edge or Google Chrome.

---

## 🔑 GitHub API Rate Limits

Unauthenticated requests to the public GitHub API (`api.github.com`) are limited to **60 requests per hour** per IP address.
If you encounter a rate limit notice:
1. Expand the **"Advanced Configuration & Token"** section in the page.
2. Enter a **GitHub Personal Access Token** (no special scopes required for public repositories).
3. The rate limit is immediately raised to **5,000 requests per hour**.
*(The token is stored exclusively in your browser's volatile memory and is never transmitted to third-party servers).*
