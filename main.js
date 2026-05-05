require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    ChannelType,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const {
    joinVoiceChannel,
    getVoiceConnection
} = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ================= SETUP WEB SERVER =================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
let currentChannelId = process.env.CHANNEL_ID;
const PANEL_PORT = process.env.PANEL_PORT || 3000;

// ================= SECURITY CONFIG =================
const PANEL_USERNAME = process.env.PANEL_USERNAME || 'admin';
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || 'changeme123';
const API_KEY        = process.env.API_KEY || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-change-me';

// ================= DATABASE SEDERHANA UNTUK CHAT =================
const DB_FILE = path.join(__dirname, 'chats.json');

function loadChats() {
    if (!fs.existsSync(DB_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } 
    catch (e) { return {}; }
}

function saveChats(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ================= SETTINGS =================
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

const defaultSettings = {
    defaultChannelId: process.env.CHANNEL_ID,
    autoJoinOnStart: true,
    autoReconnect: false,
    panelTitle: 'Deltalitehub Bot Panel',
    statusType: 'online',       // online | idle | dnd | invisible
    activityType: 'PLAYING',    // PLAYING | WATCHING | LISTENING | COMPETING
    activityText: '',
};

function loadSettings() {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...defaultSettings };
    try { return { ...defaultSettings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; }
    catch (e) { return { ...defaultSettings }; }
}

function saveSettings(data) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

let settings = loadSettings();

async function applyBotPresence() {
    if (!client.user) return;
    const activityTypeMap = { PLAYING: 0, STREAMING: 1, LISTENING: 2, WATCHING: 3, COMPETING: 5 };
    const presenceData = { status: settings.statusType };
    if (settings.activityText) {
        presenceData.activities = [{
            name: settings.activityText,
            type: activityTypeMap[settings.activityType] ?? 0
        }];
    } else {
        presenceData.activities = [];
    }
    client.user.setPresence(presenceData);
}


const activityLog = [];
function addLog(type, message) {
    const entry = { type, message, time: Date.now() };
    activityLog.unshift(entry);
    if (activityLog.length > 100) activityLog.pop();
    io.emit('activity_log', entry);
    console.log(`[${type.toUpperCase()}] ${message}`);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ================= SESSION & SECURITY MIDDLEWARE =================
// Satu instance session middleware yang di-share ke Express dan Socket.IO
const sessionMiddleware = session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000 // 8 jam
    }
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiter sederhana untuk login endpoint
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
    entry.count++;
    loginAttempts.set(ip, entry);
    if (entry.count > 10) {
        return res.status(429).send('Too many login attempts. Try again in a minute.');
    }
    next();
}

// Middleware: cek apakah sudah login
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) return next();
    // Untuk request AJAX/fetch, kirim 401
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/login');
}

// Middleware: API key auth untuk REST endpoints
function requireApiKey(req, res, next) {
    if (!API_KEY) return next(); // Jika API_KEY tidak di-set, skip
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key === API_KEY) return next();
    res.status(401).json({ error: 'Invalid or missing API key' });
}

// ================= AUTH ROUTES =================
// Login page
app.get('/login', (req, res) => {
    if (req.session?.authenticated) return res.redirect('/');
    const error = req.query.error ? '<p style="color:#f87171;margin-bottom:12px;font-size:0.875rem;">Invalid username or password.</p>' : '';
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login — Bot Panel</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#1e1f22;color:#dbdee1;font-family:'gg sans','Noto Sans',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
  .card{background:#2b2d31;border-radius:8px;padding:32px;width:100%;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,0.4);}
  .logo{text-align:center;margin-bottom:24px;}
  .logo svg{width:48px;height:48px;fill:#5865f2;}
  h1{font-size:1.25rem;font-weight:700;text-align:center;margin-bottom:4px;}
  p.sub{font-size:0.8rem;color:#949ba4;text-align:center;margin-bottom:24px;}
  label{display:block;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#949ba4;margin-bottom:6px;}
  input{width:100%;background:#1e1f22;border:none;border-radius:4px;padding:10px 12px;font-size:0.95rem;color:#dbdee1;outline:none;margin-bottom:16px;}
  input:focus{outline:2px solid #5865f2;}
  button{width:100%;background:#5865f2;color:white;border:none;border-radius:4px;padding:11px;font-size:0.95rem;font-weight:600;cursor:pointer;transition:background .15s;}
  button:hover{background:#4752c4;}
  .footer{text-align:center;margin-top:16px;font-size:0.75rem;color:#949ba4;}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
  </div>
  <h1>Bot Control Panel</h1>
  <p class="sub">Sign in to continue</p>
  ${error}
  <form method="POST" action="/login">
    <label>Username</label>
    <input type="text" name="username" autocomplete="username" autofocus required>
    <label>Password</label>
    <input type="password" name="password" autocomplete="current-password" required>
    <button type="submit">Sign In</button>
  </form>
  <div class="footer">Deltalitehub Panel</div>
</div>
</body>
</html>`);
});

// Login POST
app.post('/login', loginRateLimit, (req, res) => {
    const { username, password } = req.body;
    if (username === PANEL_USERNAME && password === PANEL_PASSWORD) {
        req.session.authenticated = true;
        req.session.loginTime = Date.now();
        addLog('system', `Panel login from ${req.ip}`);
        return res.redirect('/');
    }
    addLog('system', `Failed login attempt from ${req.ip}`);
    res.redirect('/login?error=1');
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Protect static files (panel) — serve AFTER auth check
app.use(requireAuth, express.static(path.join(__dirname, 'public')));



// ================= DEBUG & API ENDPOINTS =================
app.get('/api/dashboard', requireAuth, requireApiKey, (req, res) => {
    const data = getDashboardData();
    if (!data) return res.status(503).json({ error: 'Bot belum ready' });
    res.json(data);
});

app.get('/api/logs', requireAuth, requireApiKey, (_req, res) => {
    res.json(activityLog);
});

app.get('/api/settings', requireAuth, requireApiKey, (_req, res) => {
    res.json(settings);
});



// Tambahkan Partials dan Intent untuk DM & Message Content
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message] 
});

// ================= VOICE MANAGEMENT =================
function joinVoice(guild, channelId = currentChannelId) {
    try {
        currentChannelId = channelId;
        const ch = guild.channels.cache.get(channelId);
        const connection = joinVoiceChannel({
            channelId: currentChannelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });
        addLog('voice', `Bot joined voice channel: ${ch ? ch.name : channelId}`);
        broadcastUpdate();
    } catch (err) { console.error(err); }
}

function leaveVoice(guildId) {
    const connection = getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
        addLog('voice', 'Bot disconnected from voice channel');
        broadcastUpdate();
    }
}

// ================= REALTIME PANEL LOGIC =================
function getDashboardData() {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return null;

    const voiceChannel = guild.channels.cache.get(currentChannelId);
    const connection = getVoiceConnection(GUILD_ID);

    const voiceChannels = guild.channels.cache
        .filter(c => c.isVoiceBased())
        .map(c => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const textChannels = guild.channels.cache
        .filter(c => c.isTextBased() && c.type === 0) // GUILD_TEXT only
        .map(c => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    let members = [];
    if (voiceChannel && voiceChannel.isVoiceBased()) {
        members = voiceChannel.members.map(m => ({
            id: m.id, username: m.user.username,
            avatar: m.user.displayAvatarURL({ dynamic: true, size: 64 }),
            isMuted: m.voice.serverMute || m.voice.selfMute,
            isDeaf: m.voice.serverDeaf || m.voice.selfDeaf, isBot: m.user.bot
        }));
    }

    // Ambil semua user di server untuk dropdown DM (kecuali bot)
    const presenceStatusMap = { online: 'online', idle: 'idle', dnd: 'dnd', invisible: 'offline', offline: 'offline' };
    const allServerUsers = guild.members.cache
        .filter(m => !m.user.bot)
        .map(m => ({
            id: m.id,
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ dynamic: true, size: 64 }),
            presence: presenceStatusMap[m.presence?.status] || 'offline'
        }))
        .sort((a, b) => {
            // Sort: online first, then idle, dnd, offline
            const order = { online: 0, idle: 1, dnd: 2, offline: 3 };
            return (order[a.presence] ?? 3) - (order[b.presence] ?? 3) || a.username.localeCompare(b.username);
        });

    return {
        stats: { ping: client.ws.ping, uptime: Math.floor(client.uptime / 60000), guilds: client.guilds.cache.size, users: client.users.cache.size },
        server: { name: guild.name, icon: guild.iconURL({ dynamic: true, size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png', memberCount: guild.memberCount },
        voice: { status: connection ? 'Connected' : 'Disconnected', channelName: voiceChannel ? voiceChannel.name : 'Unknown', channelId: currentChannelId },
        botInfo: {
            username: client.user.username,
            tag: client.user.tag,
            id: client.user.id,
            avatar: client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            status: settings.statusType,
            activityType: settings.activityType,
            activityText: settings.activityText,
        },
        settings,
        voiceChannels, textChannels, members, allServerUsers
    };
}

function broadcastUpdate() {
    const data = getDashboardData();
    if (data) io.emit('dashboard_update', data);
}

// ================= SOCKET.IO AUTH =================
// Gunakan sessionMiddleware yang sama dengan Express agar session terbaca
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, (err) => {
        if (err) return next(err);
        if (socket.request.session?.authenticated) return next();
        next(new Error('Unauthorized'));
    });
});

io.on('connection', (socket) => {
    // Kirim status awal — jika bot belum ready, kirim state loading
    const initialData = getDashboardData();
    if (initialData) {
        socket.emit('dashboard_update', initialData);
    } else {
        socket.emit('bot_status', { ready: false, message: 'Bot sedang connecting ke Discord...' });
    }

    // Bot & Voice actions (Tetap sama seperti sebelumnya)
    socket.on('bot_action', async ({ action, targetChannelId }) => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;
        if (action === 'connect') joinVoice(guild, currentChannelId);
        if (action === 'disconnect') leaveVoice(GUILD_ID);
        if (action === 'reconnect') { leaveVoice(GUILD_ID); setTimeout(() => joinVoice(guild, currentChannelId), 1500); }
        if (action === 'move_bot' && targetChannelId) joinVoice(guild, targetChannelId);
    });

    socket.on('member_action', async ({ userId, action, targetChannelId }) => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;
        const member = guild.members.cache.get(userId);
        if (!member || !member.voice.channel) return;
        try {
            if (action === 'mute') {
                const newState = !member.voice.serverMute;
                await member.voice.setMute(newState);
                addLog('moderation', `${newState ? 'Muted' : 'Unmuted'} ${member.user.username}`);
            }
            if (action === 'deafen') {
                const newState = !member.voice.serverDeaf;
                await member.voice.setDeaf(newState);
                addLog('moderation', `${newState ? 'Deafened' : 'Undeafened'} ${member.user.username}`);
            }
            if (action === 'kick') {
                await member.voice.disconnect();
                addLog('moderation', `Kicked ${member.user.username} from voice`);
            }
            if (action === 'move' && targetChannelId) {
                const ch = guild.channels.cache.get(targetChannelId);
                await member.voice.setChannel(targetChannelId);
                addLog('voice', `Moved ${member.user.username} to ${ch ? ch.name : targetChannelId}`);
            }
            broadcastUpdate();
        } catch (e) { console.error("Gagal melakukan aksi:", e); }
    });

    // ================= BULK ACTIONS =================
    socket.on('bulk_action', async ({ action }) => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;
        const voiceChannel = guild.channels.cache.get(currentChannelId);
        if (!voiceChannel) return;
        const members = voiceChannel.members.filter(m => !m.user.bot);

        if (action === 'mute_all') {
            let count = 0;
            for (const [, member] of members) {
                try { await member.voice.setMute(true); count++; } catch(e) {}
            }
            addLog('moderation', `Muted all ${count} members in voice`);
            setTimeout(broadcastUpdate, 800);
        }
        if (action === 'unmute_all') {
            let count = 0;
            for (const [, member] of members) {
                try { await member.voice.setMute(false); count++; } catch(e) {}
            }
            addLog('moderation', `Unmuted all ${count} members in voice`);
            setTimeout(broadcastUpdate, 800);
        }
        if (action === 'deafen_all') {
            let count = 0;
            for (const [, member] of members) {
                try { await member.voice.setDeaf(true); count++; } catch(e) {}
            }
            addLog('moderation', `Deafened all ${count} members in voice`);
            setTimeout(broadcastUpdate, 800);
        }
        if (action === 'undeafen_all') {
            let count = 0;
            for (const [, member] of members) {
                try { await member.voice.setDeaf(false); count++; } catch(e) {}
            }
            addLog('moderation', `Undeafened all ${count} members in voice`);
            setTimeout(broadcastUpdate, 800);
        }
        if (action === 'kick_all') {
            let count = 0;
            for (const [, member] of members) {
                try { await member.voice.disconnect(); count++; } catch(e) {}
            }
            addLog('moderation', `Kicked all ${count} members from voice`);
            setTimeout(broadcastUpdate, 800);
        }
    });

    // ================= BROADCAST MESSAGE =================
    socket.on('broadcast_message', async ({ message }) => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;
        const voiceChannel = guild.channels.cache.get(currentChannelId);
        if (!voiceChannel) return;
        const members = voiceChannel.members.filter(m => !m.user.bot);
        let sent = 0, failed = 0;
        for (const [, member] of members) {
            try {
                await member.send(message);
                sent++;
            } catch(e) { failed++; }
        }
        addLog('message', `Broadcast DM sent to ${sent} members (${failed} failed)`);
        socket.emit('broadcast_result', { sent, failed });
    });

    // ================= ANNOUNCE TO CHANNEL =================
    socket.on('announce', async ({ channelId, message }) => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;
        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return socket.emit('announce_error', 'Channel not found or not a text channel');
        try {
            await channel.send(message);
            addLog('message', `Announced to #${channel.name}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
            socket.emit('announce_success', `Message sent to #${channel.name}`);
        } catch(e) {
            socket.emit('announce_error', 'Failed to send: ' + e.message);
        }
    });

    // ================= GET LOGS =================
    socket.on('get_logs', () => {
        socket.emit('logs_history', activityLog);
    });

    // ================= SETTINGS =================
    socket.on('get_settings', () => {
        socket.emit('settings_data', { settings, botInfo: client.user ? {
            username: client.user.username,
            avatar: client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            id: client.user.id,
            tag: client.user.tag,
        } : null });
    });

    socket.on('save_settings', async (newSettings) => {
        try {
            const old = { ...settings };
            settings = { ...settings, ...newSettings };

            // Update default channel
            if (newSettings.defaultChannelId) {
                currentChannelId = newSettings.defaultChannelId;
            }

            saveSettings(settings);

            // Apply presence changes immediately
            if (newSettings.statusType !== undefined || newSettings.activityType !== undefined || newSettings.activityText !== undefined) {
                await applyBotPresence();
                addLog('settings', `Presence updated: ${settings.statusType} — ${settings.activityText || 'no activity'}`);
            }

            if (newSettings.defaultChannelId && newSettings.defaultChannelId !== old.defaultChannelId) {
                const guild = client.guilds.cache.get(GUILD_ID);
                const ch = guild?.channels.cache.get(newSettings.defaultChannelId);
                addLog('settings', `Default channel changed to: ${ch ? ch.name : newSettings.defaultChannelId}`);
            }

            if (newSettings.panelTitle && newSettings.panelTitle !== old.panelTitle) {
                addLog('settings', `Panel title changed to: ${newSettings.panelTitle}`);
            }

            io.emit('settings_saved', { success: true, settings });
            broadcastUpdate();
        } catch (e) {
            console.error('Settings save error:', e);
            socket.emit('settings_saved', { success: false, error: e.message });
        }
    });

    socket.on('update_bot_username', async ({ username }) => {
        if (!username || username.length < 2 || username.length > 32)
            return socket.emit('settings_result', { key: 'username', success: false, error: 'Username must be 2–32 characters' });
        try {
            await client.user.setUsername(username);
            addLog('settings', `Bot username changed to: ${username}`);
            socket.emit('settings_result', { key: 'username', success: true, message: `Username updated to ${username}` });
            broadcastUpdate();
        } catch (e) {
            socket.emit('settings_result', { key: 'username', success: false, error: e.message });
        }
    });

    socket.on('update_bot_avatar', async ({ imageUrl }) => {
        if (!imageUrl) return socket.emit('settings_result', { key: 'avatar', success: false, error: 'No image URL provided' });
        try {
            await client.user.setAvatar(imageUrl);
            addLog('settings', `Bot avatar updated`);
            socket.emit('settings_result', { key: 'avatar', success: true, message: 'Avatar updated successfully' });
            setTimeout(broadcastUpdate, 2000); // wait for Discord to process
        } catch (e) {
            socket.emit('settings_result', { key: 'avatar', success: false, error: e.message });
        }
    });

    socket.on('clear_chat_history', () => {
        saveChats({});
        addLog('settings', 'All chat history cleared');
        socket.emit('settings_result', { key: 'clear-chat', success: true, message: 'Chat history cleared' });
    });

    // ================= DM CHAT LOGIC =================
    socket.on('get_dm_history', ({ userId }) => {
        const chats = loadChats();
        socket.emit('dm_history', { userId, messages: chats[userId] || [] });
    });

    socket.on('send_dm', async ({ userId, message, replyTo }) => {
        try {
            const user = await client.users.fetch(userId);
            // Build message text — prepend reply quote if present
            let sendText = message;
            if (replyTo) sendText = `> ${replyTo.text}\n${message}`;
            await user.send(sendText);
            addLog('message', `DM sent to ${user.username}: "${message.substring(0, 40)}${message.length > 40 ? '...' : ''}"`);
            const chats = loadChats();
            if (!chats[userId]) chats[userId] = [];
            const msgObj = { sender: 'bot', text: message, time: Date.now(), replyTo: replyTo || null };
            chats[userId].push(msgObj);
            saveChats(chats);
            socket.emit('dm_history', { userId, messages: chats[userId] });
        } catch (error) {
            console.error("Gagal kirim DM:", error);
            socket.emit('dm_error', "Gagal mengirim pesan (Mungkin user menutup DM)");
        }
    });
});

// Dengarkan pesan DM masuk dari User
client.on('messageCreate', message => {
    if (message.author.bot) return; // Abaikan pesan bot

    // Jika pesan adalah DM
    if (message.channel.type === ChannelType.DM) {
        const userId = message.author.id;
        const chats = loadChats();
        if (!chats[userId]) chats[userId] = [];
        
        const msgObj = { sender: 'user', text: message.content, time: Date.now() };
        chats[userId].push(msgObj);
        saveChats(chats);

        // Kirim ke panel web realtime
        io.emit('dm_received', { userId, message: msgObj, username: message.author.username });
        addLog('message', `DM received from ${message.author.username}: "${message.content.substring(0, 40)}${message.content.length > 40 ? '...' : ''}"`);
    }
});

client.on('voiceStateUpdate', () => {
    setTimeout(broadcastUpdate, 500);
});

client.on('presenceUpdate', () => {
    setTimeout(broadcastUpdate, 1000);
});

// ================= READY =================
client.once('ready', async () => {
    console.log(`Login sebagai ${client.user.tag}`);
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        console.log('⏳ Fetching guild members...');
        await guild.members.fetch(); // Pastikan semua member ke-load untuk DM
        console.log('✅ Guild members loaded');
        joinVoice(guild, currentChannelId);
    } else {
        console.error('❌ Guild tidak ditemukan! Cek GUILD_ID di .env');
    }
    
    // Slash commands (Tetap sama)
    const commands = [
        new SlashCommandBuilder().setName('tiktokdl').setDescription('Download video TikTok')
            .addStringOption(option => option.setName('url').setDescription('Link TikTok').setRequired(true)).toJSON()
    ];
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Slash commands berhasil didaftarkan.');
    } catch (err) {
        console.error('⚠️ Gagal mendaftarkan slash commands:', err.message);
    }
    
    setInterval(broadcastUpdate, 10000);
    broadcastUpdate();
    await applyBotPresence();
    console.log('✅ Bot ready, dashboard data dikirim ke semua client.');
    addLog('system', `Bot started as ${client.user.tag}`);
});

// TikTok Logic (Sama seperti kodemu sebelumnya)
client.on('interactionCreate', async interaction => {
   // ... (Kode Tiktok DL milikmu biarkan persis sama seperti sebelumnya di sini) ...
});

// ================= START BOT & SERVER =================
client.login(TOKEN);
server.listen(PANEL_PORT, '0.0.0.0', () => {
    console.log(`🌐 Panel control aktif di http://0.0.0.0:${PANEL_PORT}`);
});