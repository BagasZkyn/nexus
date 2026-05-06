<div align="center">

<img src="https://img.shields.io/badge/-%E2%9A%A1%20NEXUS%20PANEL-%235865F2?style=for-the-badge&labelColor=0d0d0d&color=5865F2" alt="Nexus Panel" height="40"/>

# Nexus Panel

**The command center between you and your Discord server.**

*Nexus — the point where all connections converge.*

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Auth](https://img.shields.io/badge/auth-session%20%2B%20API%20key-orange?style=flat-square)](#-security)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

---

> **Nexus** *(noun)* — a connection or series of connections linking two or more things; the central point through which all things flow.
>
> This panel is that point. One interface to rule your voice channels, moderate members, broadcast messages, and monitor everything — in real time.

---

## 🗺️ What's Inside

| Section | Jump To |
|---|---|
| ✨ Features | [Features](#-features) |
| 🤖 Slash Commands | [Slash Commands](#-slash-commands) |
| 🚀 Getting Started | [Quick Start](#-getting-started) |
| ⚙️ Configuration | [Config Reference](#️-configuration) |
| 🛠️ Tech Stack | [Stack](#️-tech-stack) |
| 📁 Project Structure | [Structure](#-project-structure) |
| 🔌 API Reference | [API & Socket Events](#-api-endpoints) |
| 🔒 Security | [Security Notes](#-security-notes) |
| 👥 Contributors | [Contributors](#-contributors) |

---

## ✨ Features

### 🖥️ Dashboard
- Live bot stats — ping, uptime, server count, user count
- Current voice channel status with live connection indicator
- Real-time updates via Socket.IO (10s interval + event-driven)

### 🎙️ Voice Control
- View all members in a voice channel with avatars and status badges
- **Per-member actions** — Mute, Deafen, Move to channel, Kick from voice
- **Bulk actions** — Mute All, Unmute All, Deafen All, Undeafen All, Kick All
- Optimistic UI — buttons respond instantly without waiting for server
- Bot controls — Connect, Reconnect, Move Bot, Disconnect

### 💬 DM Chat
- Discord-style chat UI with grouped messages and per-sender avatars
- Send and receive Direct Messages to/from any server member
- **Reply system** — hover a message and click Reply, with quoted preview
- **Emoji picker** — 5 categories (Smileys, Gestures, Hearts, Objects, Symbols)
- User presence status (Online / Idle / DnD / Offline) in sidebar and chat header
- Real-time incoming message notifications with NEW badge
- Persistent chat history saved to local JSON database

### 📢 Announce
- **Send to Text Channel** — post a message to any server text channel
- **Broadcast DM** — send a DM to all members currently in voice at once

### 📋 Activity Log
- Real-time log of all actions (voice, moderation, messages, settings, system)
- Color-coded by category with timestamps
- Stores last 100 entries, live badge notification on new events

### ⚙️ Settings
- **Bot Identity** — change bot username and avatar (via image URL) live
- **Bot Presence** — set status (Online/Idle/DnD/Invisible) and activity (Playing/Watching/Listening/Competing)
- **Voice Settings** — configure default voice channel and auto-join on startup
- **Panel Settings** — customize the browser tab title
- **Danger Zone** — clear all DM chat history from the server

### 🔒 Security
- Login page with username + password authentication
- Session-based auth (cookie, 8-hour expiry) protecting the entire panel
- Socket.IO connections require a valid session — unauthorized connections are rejected
- API key authentication for all REST endpoints via `x-api-key` header
- Rate limiting on login endpoint (max 10 attempts/IP/minute)
- All failed login attempts logged to Activity Log
- Logout button in the top bar

---

## 🤖 Slash Commands

Nexus includes 12 built-in slash commands powered by the [QasimDev API](https://api.qasimdev.dpdns.org/) for downloading media from popular platforms. Results are returned as Discord embeds with direct download links and thumbnails.

> Requires `QASIMDEV_API_KEY` in your `.env`. Get a free key at [api.qasimdev.dpdns.org](https://api.qasimdev.dpdns.org/).

| Command | Description |
|---|---|
| `/tiktok <url>` | Download TikTok video (no watermark), watermark version, audio, or photo slides |
| `/instagram <url>` | Download Instagram photo, video, or reel |
| `/facebook <url>` | Download Facebook video |
| `/twitter <url>` | Download Twitter/X media |
| `/youtube <url> [format]` | Download YouTube video (`360`, `480`, `720`, `1080`) or audio (`mp3`) |
| `/spotify <url>` | Download Spotify track as MP3 |
| `/threads <url>` | Download Threads video |
| `/pinterest <url>` | Download Pinterest video |
| `/capcut <url>` | Download CapCut template or video |
| `/mediafire <url>` | Download file from MediaFire |
| `/terabox <url>` | Download file from Terabox |
| `/soundcloud <url>` | Download SoundCloud track |

All commands use `defer` + `editReply` so Discord won't time out on slow downloads. Errors are returned as a clean red embed with the failure reason.

---

## 🚀 Getting Started

### Prerequisites

Before you begin, make sure you have:

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord bot token — create one at [discord.com/developers](https://discord.com/developers/applications)
- Bot invited to your server with these permissions:

| Permission | Why |
|---|---|
| `Manage Roles` | Role management |
| `Mute Members` | Voice moderation |
| `Deafen Members` | Voice moderation |
| `Move Members` | Voice channel control |
| `Send Messages` | DM & announcements |
| `Read Message History` | Chat history |
| `Connect` + `Speak` | Voice presence |

- Enable these **Privileged Gateway Intents** in the Developer Portal:
  - `Server Members Intent`
  - `Presence Intent`
  - `Message Content Intent`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/BagasZkyn/nexus.git
cd nexus

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your values

# 4. Start the panel
npm start
```

Then open **http://localhost:3000** in your browser and sign in.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in your values:

```env
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_server_id_here
CHANNEL_ID=default_voice_channel_id_here
PANEL_PORT=3000

# Security
PANEL_USERNAME=admin
PANEL_PASSWORD=changeme123
API_KEY=your-secret-api-key-here
SESSION_SECRET=your-random-session-secret-here

# QasimDev API (for slash commands)
QASIMDEV_API_KEY=your-qasimdev-api-key-here
```

| Variable | Description |
|---|---|
| `TOKEN` | Your Discord bot token from the Developer Portal |
| `CLIENT_ID` | Application ID (found in General Information) |
| `GUILD_ID` | The server (guild) ID the bot will manage |
| `CHANNEL_ID` | Default voice channel the bot joins on startup |
| `PANEL_PORT` | Port for the web panel (default: `3000`) |
| `PANEL_USERNAME` | Login username for the web panel |
| `PANEL_PASSWORD` | Login password for the web panel |
| `API_KEY` | Secret key for REST API access (sent as `x-api-key` header) |
| `SESSION_SECRET` | Random secret used to sign session cookies |
| `QASIMDEV_API_KEY` | Free API key for slash command downloaders — get one at [api.qasimdev.dpdns.org](https://api.qasimdev.dpdns.org/) |

> Additional runtime settings (presence, default channel, panel title, etc.) are saved to `settings.json` automatically via the Settings tab — no restart needed.

### How to get Discord IDs

Enable **Developer Mode** in Discord (`Settings → Advanced → Developer Mode`), then right-click any server, channel, or user and select **Copy ID**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Bot | [discord.js v14](https://discord.js.org/) + [@discordjs/voice](https://github.com/discordjs/discord.js/tree/main/packages/voice) |
| Backend | [Express.js](https://expressjs.com/) + [Socket.IO](https://socket.io/) |
| Auth | [express-session](https://github.com/expressjs/session) + API key middleware |
| Frontend | HTML + [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) |
| Storage | Local JSON files (`chats.json`, `settings.json`) |
| Config | [dotenv](https://github.com/motdotla/dotenv) |

---

## 📁 Project Structure

```
nexus-panel/
├── main.js              # Bot logic, Express server, Socket.IO handlers, auth middleware
├── public/
│   └── index.html       # Frontend dashboard (single-page app)
├── package.json
├── .env                 # Environment variables (not committed)
├── .env.example         # Template for environment variables
├── .gitignore
├── chats.json           # DM chat history (auto-generated, not committed)
└── settings.json        # Runtime settings (auto-generated, not committed)
```

---

## 🔌 API Endpoints

All REST endpoints require both a valid session cookie and the `x-api-key` header (if `API_KEY` is set).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/login` | Login page |
| `POST` | `/login` | Submit credentials |
| `GET` | `/logout` | Destroy session and redirect to login |
| `GET` | `/` | Serves the web panel (requires auth) |
| `GET` | `/api/dashboard` | Returns current dashboard data as JSON |
| `GET` | `/api/logs` | Returns activity log history as JSON |
| `GET` | `/api/settings` | Returns current settings as JSON |

### Socket.IO Events

**Client → Server**

| Event | Payload | Description |
|---|---|---|
| `bot_action` | `{ action }` | `connect`, `disconnect`, `reconnect`, `move_bot` |
| `member_action` | `{ userId, action, targetChannelId? }` | `mute`, `deafen`, `kick`, `move` |
| `bulk_action` | `{ action }` | `mute_all`, `unmute_all`, `deafen_all`, `undeafen_all`, `kick_all` |
| `broadcast_message` | `{ message }` | DM all voice members |
| `announce` | `{ channelId, message }` | Send to text channel |
| `send_dm` | `{ userId, message, replyTo? }` | Send DM with optional reply context |
| `get_dm_history` | `{ userId }` | Fetch DM history for a user |
| `get_logs` | — | Fetch activity log history |
| `get_settings` | — | Fetch current settings + bot info |
| `save_settings` | `{ ...settingsFields }` | Save and apply settings |
| `update_bot_username` | `{ username }` | Change bot username |
| `update_bot_avatar` | `{ imageUrl }` | Change bot avatar |
| `clear_chat_history` | — | Delete all stored DM history |

**Server → Client**

| Event | Description |
|---|---|
| `dashboard_update` | Full dashboard data refresh |
| `activity_log` | New log entry |
| `dm_received` | Incoming DM from a user |
| `dm_history` | DM history for a user |
| `broadcast_result` | Result of broadcast DM `{ sent, failed }` |
| `announce_success` / `announce_error` | Announce result |
| `settings_data` | Settings + bot info response |
| `settings_saved` | Confirmation after save |
| `settings_result` | Result of username/avatar/clear operations |
| `bot_status` | Bot connection state (sent before bot is ready) |

---

## 🔒 Security Notes

- **Never commit your `.env` file** — it's excluded via `.gitignore`
- `settings.json` and `chats.json` are also excluded from git
- Change `PANEL_PASSWORD`, `API_KEY`, and `SESSION_SECRET` to strong random values before deploying
- The panel is protected by session-based login — unauthenticated requests redirect to `/login`
- Socket.IO connections require a valid session — unauthorized connections are rejected immediately
- API endpoints require both a valid session and the `x-api-key` header (if `API_KEY` is set)
- Rate limiting on `/login` prevents brute-force attacks (10 attempts/IP/minute)
- For production, run behind a reverse proxy (e.g., Nginx) with HTTPS to protect session cookies in transit

---

## 👥 Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/BagasZkyn">
        <img src="https://github.com/BagasZkyn.png" width="80" style="border-radius:50%" alt="BagasZkyn"/><br/>
        <sub><b>BagasZkyn</b></sub>
      </a><br/>
      <sub>Creator & Maintainer</sub>
    </td>
  </tr>
</table>

> Want to contribute? Fork the repo, make your changes, and open a pull request. All contributions are welcome.

---

<div align="center">

Built with purpose by [BagasZkyn](https://github.com/BagasZkyn)

*"Every great system needs a nexus — a single point where everything connects."*

</div>
