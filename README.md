# 🎮 Discord Bot Control Panel

A real-time web dashboard to control your Discord bot — manage voice channels, moderate members, send DMs, broadcast messages, and monitor activity logs, all from a sleek browser interface.

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white)
![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## ✨ Features

### 🖥️ Dashboard
- Live bot stats — ping, uptime, server count, user count
- Current voice channel status with connection indicator
- Real-time updates via Socket.IO (10s interval + event-driven)

### 🎙️ Voice Control
- View all members currently in a voice channel with avatars
- **Per-member actions:** Mute, Deafen, Move to channel, Kick from voice
- **Bulk actions:** Mute All, Unmute All, Deafen All, Undeafen All, Kick All
- Optimistic UI — buttons update instantly without waiting for server response
- Bot controls: Connect, Reconnect, Move Bot, Disconnect

### 💬 DM Chat
- Send and receive Direct Messages to/from any server member
- Full chat history with bubble UI (bot = purple right, user = slate left)
- Real-time incoming message notifications with NEW badge
- Persistent chat history saved to local JSON database

### 📢 Announce
- **Send to Text Channel** — post a message to any server text channel
- **Broadcast DM** — send a DM to all members currently in voice at once

### 📋 Activity Log
- Real-time log of all actions (voice events, moderation, messages, system)
- Color-coded by category with timestamps
- Stores last 100 entries, live badge notification on new events

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord bot token — create one at [discord.com/developers](https://discord.com/developers/applications)
- Bot must be invited to your server with the following permissions:
  - `Manage Roles`, `Mute Members`, `Deafen Members`, `Move Members`
  - `Send Messages`, `Read Message History`
  - `Connect`, `Speak` (for voice)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/BagasZkyn/discord-bot-panel.git
cd discord-bot-panel

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your values

# 4. Start the bot
npm start
```

Then open **http://localhost:3000** in your browser.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in your values:

```env
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_server_id_here
CHANNEL_ID=default_voice_channel_id_here
PANEL_PORT=3000
```

| Variable | Description |
|---|---|
| `TOKEN` | Your Discord bot token from the Developer Portal |
| `CLIENT_ID` | Application ID (found in General Information) |
| `GUILD_ID` | The server (guild) ID the bot will manage |
| `CHANNEL_ID` | Default voice channel the bot joins on startup |
| `PANEL_PORT` | Port for the web panel (default: `3000`) |

### How to get IDs

Enable **Developer Mode** in Discord settings (`Settings → Advanced → Developer Mode`), then right-click any server/channel and select **Copy ID**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Bot | [discord.js v14](https://discord.js.org/) + [@discordjs/voice](https://github.com/discordjs/discord.js/tree/main/packages/voice) |
| Backend | [Express.js](https://expressjs.com/) + [Socket.IO](https://socket.io/) |
| Frontend | HTML + [Tailwind CSS](https://tailwindcss.com/) + [Font Awesome 6](https://fontawesome.com/) |
| Storage | Local JSON file (`chats.json`) |
| Config | [dotenv](https://github.com/motdotla/dotenv) |

---

## 📁 Project Structure

```
discord-bot-panel/
├── main.js              # Bot logic, Express server, Socket.IO handlers
├── public/
│   └── index.html       # Frontend dashboard (single-page app)
├── package.json
├── .env                 # Environment variables (not committed)
├── .env.example         # Template for environment variables
├── .gitignore
└── chats.json           # DM chat history (auto-generated, not committed)
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the web panel |
| `GET` | `/api/dashboard` | Returns current dashboard data as JSON |
| `GET` | `/api/logs` | Returns activity log history as JSON |

### Socket.IO Events

**Client → Server**

| Event | Payload | Description |
|---|---|---|
| `bot_action` | `{ action }` | `connect`, `disconnect`, `reconnect`, `move_bot` |
| `member_action` | `{ userId, action, targetChannelId? }` | `mute`, `deafen`, `kick`, `move` |
| `bulk_action` | `{ action }` | `mute_all`, `unmute_all`, `deafen_all`, `undeafen_all`, `kick_all` |
| `broadcast_message` | `{ message }` | DM all voice members |
| `announce` | `{ channelId, message }` | Send to text channel |
| `send_dm` | `{ userId, message }` | Send DM to specific user |
| `get_dm_history` | `{ userId }` | Fetch DM history |
| `get_logs` | — | Fetch activity log history |

**Server → Client**

| Event | Description |
|---|---|
| `dashboard_update` | Full dashboard data refresh |
| `activity_log` | New log entry |
| `dm_received` | Incoming DM from a user |
| `dm_history` | DM history for a user |
| `broadcast_result` | Result of broadcast DM |
| `announce_success` / `announce_error` | Announce result |

---

## 🔒 Security Notes

- **Never commit your `.env` file** — it's excluded via `.gitignore`
- The panel has no authentication by default — only run it on a trusted local network or behind a reverse proxy with auth (e.g., Nginx + basic auth)
- Bot token should be kept secret and rotated if exposed

---

## 📝 License

MIT — feel free to use, modify, and distribute.

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/BagasZkyn">BagasZkyn</a>
</div>
