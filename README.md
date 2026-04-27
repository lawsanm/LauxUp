# LauxUp — The Modern Moodle Experience

Transform your university learning environment into a premium, state-of-the-art dashboard. LauxUp is a high-end browser extension designed to eliminate clutter and provide a professional workspace inspired by the world's best productivity tools.

---

## 💎 The Experience

LauxUp isn't just a theme; it's a complete architectural overhaul of the Moodle interface. We've stripped away the noise and rebuilt the user experience from the ground up to focus on what matters: your learning.

### Key Features

- 🌙 **Deep Dark Mode** — Zero white flash experience, pre-injected at `document_start` for instant dark paint.
- 📌 **Notion-style Sidebar** — A persistent, collapsible navigation system with your courses and assignments always one click away.
- 📊 **Intelligent Dashboard** — Redesigned greeting, progress tracking, and beautiful course cards with integrated progress rings.
- 📚 **Modernized Course View** — Clean reading experience with collapsible sections and activity-specific iconography.
- 📋 **Unified Assignment Tracker** — A centralized panel for all your tasks, featuring status coding, relative dates, and smart filters.
- 🧹 **Clutter-Free Environment** — Automatically hides legacy blocks and redundant UI elements for a distraction-free experience.
- ⚡ **Master Toggle Simplicity** — A beautiful, minimalist power button to instantly toggle the entire experience.

---

## ⌨️ Power Shortcuts

Navigate like a pro with built-in hotkeys:

- `D` — Jump to Dashboard
- `C` — Open Courses List
- `A` — View Assignment Tracker
- `[` — Toggle Sidebar visibility

---

## 🚀 Quick Start: How to Install

Since LauxUp is a custom experience, you can install it manually in just a few seconds:

### Step 1: Download the Code
- **Option A (GitHub Desktop):** Clone this repository to your local machine.
- **Option B (Direct Download):** Click the green **Code** button at the top of this page and select **Download ZIP**. Extract the ZIP file to a folder on your computer.

### Step 2: Open Chrome Extensions
- Open Google Chrome and type `chrome://extensions` in the address bar, or go to **Settings > Extensions**.

### Step 3: Enable Developer Mode
- In the top right corner of the Extensions page, toggle the **Developer mode** switch to **ON**.

### Step 4: Load the Extension
- Click the **Load unpacked** button that appears in the top left.
- Select the folder where you extracted/cloned the LauxUp code (the folder containing `manifest.json`).

### Step 5: Pin & Enjoy
- Click the **Puzzle icon** in your Chrome toolbar and **Pin** LauxUp for easy access.
- Visit [ugvle.ucsc.cmb.ac.lk](https://ugvle.ucsc.cmb.ac.lk/) to see your new dashboard!

### How to Uninstall
If you ever need to remove the extension:
1. Go back to `chrome://extensions`.
2. Find the **LauxUp** card.
3. Click the **Remove** button.

---

## 🏗️ Architecture

The extension is built with a modular, performance-first approach:

```bash
├── manifest.json           # Extension Manifest (V3)
├── popup.html/css/js       # Minimalist Settings Popup
├── icons/                  # Premium Branding Assets
├── content/
│   ├── bundle.js           # Production-ready entry point
│   ├── styles/             # Modular CSS Design System
│   │   ├── tokens.css      # Design tokens (colors, motion, spacing)
│   │   ├── reset.css       # Core Moodle override
│   │   ├── sidebar.css     # Navigation architecture
│   │   └── dashboard.css   # Workspace layout
│   ├── ui/                 # UI Manipulation Modules
│   └── features/           # Functional enhancements
```

---

## 📄 License

Proprietary © 2026 LauxUp Team. All Rights Reserved.
