# Nextera Paste

<p align="center">
  <img src="images/logo.png" alt="Nextera Paste logo" width="120" />
</p>

<p align="center">
  <strong>Paste text on websites that have disabled pasting.</strong><br/>
  Bypasses paste restrictions by simulating real keyboard input, character by character.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#development">Development</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-blue" />
  <img alt="Chrome" src="https://img.shields.io/badge/Chrome-121%2B-green" />
  <img alt="Firefox" src="https://img.shields.io/badge/Firefox-121%2B-orange" />
  <img alt="Edge" src="https://img.shields.io/badge/Edge-121%2B-blue" />
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

---

## ✨ Features

- 🚀 **Bypass paste restrictions** on sites that block the `paste` event
- ⌨️ **Simulates real keyboard input** — character by character, like a human
- 🎯 **Preserves exact formatting** — spaces, tabs, and newlines stay intact
- ⚛️ **Framework-friendly** — dispatches proper `input`, `keydown`, `keypress`, and `keyup` events for React, Vue, Angular, Svelte, and others
- 🧠 **Smart element detection** — behaves differently for `<input>`, `<textarea>`, and `contentEditable` (including code editors like Monaco and CodeMirror)
- ⏱️ **2-second grace period** — click the target input field before typing begins
- 🔒 **No data collection** — everything runs locally in your browser
- 🌐 **Cross-browser** — works on Chrome, Edge, and Firefox (Manifest V3)
- 🪶 **Lightweight** — no dependencies, no tracking, no external connections

---

## 📦 Installation

### From the Browser Store

> Store links coming soon. In the meantime, install from source below.

### From Source (Developer Mode)

#### Chrome

1. Download or clone this repository:
   ```bash
   git clone https://github.com/jatin3735/Nextera-Paste.git
   cd Nextera-Paste