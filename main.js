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

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
let currentChannelId = process.env.CHANNEL_ID;
const PANEL_PORT = process.env.PANEL_PORT || 3000;

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

// ================= ACTIVITY LOG =================
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

app.use(express.static(path.join(__dirname, 'public')));

// ================= DEBUG & API ENDPOINTS =================
app.get('/api/dashboard', (req, res) => {
    const data = getDashboardData();
    if (!data) return res.status(503).json({ error: 'Bot belum ready' });
    res.json(data);
});

app.get('/api/logs', (req, res) => {
    res.json(activityLog);
});


// Tambahkan Partials dan Intent untuk DM & Message Content
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
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
    const allServerUsers = guild.members.cache
        .filter(m => !m.user.bot)
        .map(m => ({ id: m.id, username: m.user.username }))
        .sort((a, b) => a.username.localeCompare(b.username));

    return {
        stats: { ping: client.ws.ping, uptime: Math.floor(client.uptime / 60000), guilds: client.guilds.cache.size, users: client.users.cache.size },
        server: { name: guild.name, icon: guild.iconURL({ dynamic: true, size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png', memberCount: guild.memberCount },
        voice: { status: connection ? 'Connected' : 'Disconnected', channelName: voiceChannel ? voiceChannel.name : 'Unknown', channelId: currentChannelId },
        voiceChannels, textChannels, members, allServerUsers
    };
}

function broadcastUpdate() {
    const data = getDashboardData();
    if (data) io.emit('dashboard_update', data);
}

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

    // ================= DM CHAT LOGIC =================
    socket.on('get_dm_history', ({ userId }) => {
        const chats = loadChats();
        socket.emit('dm_history', { userId, messages: chats[userId] || [] });
    });

    socket.on('send_dm', async ({ userId, message }) => {
        try {
            const user = await client.users.fetch(userId);
            await user.send(message);
            addLog('message', `DM sent to ${user.username}: "${message.substring(0, 40)}${message.length > 40 ? '...' : ''}"`);
            const chats = loadChats();
            if (!chats[userId]) chats[userId] = [];
            const msgObj = { sender: 'bot', text: message, time: Date.now() };
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
    // Delay kecil agar Discord sempat update state sebelum kita baca
    setTimeout(broadcastUpdate, 500);
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
    // Kirim update pertama setelah bot ready ke semua socket yang sudah connect
    broadcastUpdate();
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