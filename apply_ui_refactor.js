const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Replace FontAwesome with Lucide in head
html = html.replace('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">', '<script src="https://unpkg.com/lucide@latest"></script>');

// 2. Add custom CSS for dropdowns and DM list
const customStyles = `
        /* Custom Select */
        .custom-select-wrapper { position: relative; width: 100%; user-select: none; }
        .custom-select-trigger {
            background: #1e1f22; border: none; color: var(--text); border-radius: 4px; padding: 10px 12px;
            font-size: 0.95rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center;
        }
        .custom-select-wrapper.open .custom-select-trigger { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
        .custom-select-options {
            position: absolute; top: 100%; left: 0; right: 0; background: #2b2d31; border: 1px solid #1e1f22;
            border-top: none; border-radius: 0 0 4px 4px; z-index: 50; display: none; max-height: 200px; overflow-y: auto;
            box-shadow: 0 8px 16px rgba(0,0,0,0.24);
        }
        .custom-select-wrapper.open .custom-select-options { display: block; animation: selectFadeIn 0.1s ease-out; }
        .custom-select-option { padding: 8px 12px; cursor: pointer; font-size: 0.95rem; color: var(--text-muted); display:flex; align-items:center; gap:8px;}
        .custom-select-option:hover { background: #35373c; color: var(--text); }
        .custom-select-option.selected { background: #404249; color: var(--text); }
        @keyframes selectFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* DM Sidebar Item */
        .dm-user-item {
            display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 4px; cursor: pointer; margin-bottom: 2px;
            transition: background 0.1s;
        }
        .dm-user-item:hover { background: #35373c; }
        .dm-user-item.active { background: #404249; color: white; }
        
        /* Spin utility for Lucide */
        .lucide-spin { animation: spin 2s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
`;
html = html.replace('/* Scrollbar */', customStyles + '\n        /* Scrollbar */');

// 3. Icon mapping (Regex replacement)
const iconMap = {
    'fa-server': 'server', 'fa-gauge-high': 'layout-dashboard', 'fa-headphones': 'headphones',
    'fa-comments': 'message-square', 'fa-bullhorn': 'megaphone', 'fa-list-ul': 'list',
    'fa-sliders': 'settings', 'fa-plug': 'plug', 'fa-rotate-right': 'refresh-cw',
    'fa-right-left': 'arrow-left-right', 'fa-power-off': 'power', 'fa-bars': 'menu',
    'fa-signal': 'activity', 'fa-clock': 'clock', 'fa-layer-group': 'layers', 'fa-users': 'users',
    'fa-volume-high': 'volume-2', 'fa-volume-xmark': 'volume-x', 'fa-microphone-slash': 'mic-off',
    'fa-microphone': 'mic', 'fa-headphones-simple': 'headphones', 'fa-phone-slash': 'phone-off',
    'fa-paper-plane': 'send', 'fa-spinner': 'loader-2', 'fa-user': 'user', 'fa-hashtag': 'hash',
    'fa-trash': 'trash-2', 'fa-robot': 'bot', 'fa-check': 'check', 'fa-circle-dot': 'circle-dot',
    'fa-palette': 'palette', 'fa-triangle-exclamation': 'alert-triangle', 'fa-chevron-down': 'chevron-down',
    'fa-ghost': 'ghost', 'fa-lock': 'lock', 'fa-inbox': 'inbox', 'fa-gear': 'settings',
    'fa-shield-halved': 'shield', 'fa-envelope': 'mail', 'fa-circle': 'circle', 'fa-floppy-disk': 'save'
};

html = html.replace(/<i class="fa-solid ([^"]+) fa-spin(.*?)"><\/i>/g, function(match, iconClass, extra) {
    const mapped = iconMap[iconClass] || 'circle';
    return `<i data-lucide="${mapped}" class="lucide-spin ${extra}" style="width:1em;height:1em;display:inline-block;"></i>`;
});
html = html.replace(/<i class="fa-solid ([^"]+)(.*?)"><\/i>/g, function(match, iconClass, extra) {
    const mapped = iconMap[iconClass] || 'circle';
    return `<i data-lucide="${mapped}" class="${extra}" style="width:1em;height:1em;display:inline-block;"></i>`;
});

// Since some icons are dynamically inserted in JS, let's also update the strings in JS
html = html.replace(/fa-solid fa-([^"']+)/g, function(match, p1) {
    const mapped = iconMap['fa-' + p1] || p1;
    return `lucide-icon data-lucide="${mapped}"`;
});
// Let's fix up the dynamic HTML strings
html = html.replace(/<i class="lucide-icon data-lucide=\\"([^\\"]+)\\"(.*?)><\/i>/g, '<i data-lucide="$1"$2></i>');
html = html.replace(/<i class='lucide-icon data-lucide="([^"]+)"(.*?)><\/i>/g, '<i data-lucide="$1"$2></i>');

// 4. Update DM Tab HTML
const dmTabHtml = `
            <!-- ===== DM TAB ===== -->
            <div class="tab-panel" id="tab-dm">
                <div style="display:grid; grid-template-columns:240px 1fr; gap:20px; height:calc(100vh - 140px); min-height:400px;">
                    <!-- User list sidebar -->
                    <div style="background:#2b2d31; border-radius:4px; display:flex; flex-direction:column; overflow:hidden;">
                        <div style="padding:16px; border-bottom:1px solid #1e1f22;">
                            <div style="font-size:0.75rem; color:#949ba4; font-weight:700; text-transform:uppercase;">Direct Messages</div>
                        </div>
                        <div id="dm-user-list" style="flex:1; overflow-y:auto; padding:8px;">
                            <div style="text-align:center; padding:20px; color:#949ba4; font-size:0.875rem;"><i data-lucide="loader-2" class="lucide-spin" style="margin-bottom:8px;"></i><br>Waiting for users...</div>
                        </div>
                    </div>

                    <!-- Chat window -->
                    <div style="background:#313338; display:flex; flex-direction:column; overflow:hidden; border-radius:4px; border:1px solid #1e1f22;">
                        <!-- Chat header -->
                        <div style="padding:14px 18px; border-bottom:1px solid #1e1f22; display:flex; align-items:center; gap:10px; background:#2b2d31;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#1e1f22; display:flex; align-items:center; justify-content:center; color:#949ba4;">
                                <i data-lucide="at-sign"></i>
                            </div>
                            <div>
                                <div id="chat-header-name" style="font-size:0.95rem; font-weight:700; color:#dbdee1;">No user selected</div>
                                <div id="chat-header-status" style="font-size:0.75rem; color:#949ba4;">Select a user from the list</div>
                            </div>
                        </div>

                        <!-- Messages -->
                        <div id="chat-messages" style="flex:1; padding:16px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
                            <div style="display:flex; flex:1; align-items:center; justify-content:center; height:100%; color:#949ba4; font-size:0.95rem; text-align:center;">
                                <div>
                                    <i data-lucide="message-square" style="width:48px; height:48px; margin-bottom:12px; opacity:0.3; display:block; margin:0 auto;"></i>
                                    Select a user to start chatting
                                </div>
                            </div>
                        </div>

                        <!-- Input bar -->
                        <div style="padding:14px 16px; background:#2b2d31; display:flex; gap:10px; align-items:center;">
                            <input type="text" id="chat-input" placeholder="Message @User" style="flex:1;" disabled>
                            <button id="btn-send-chat" class="btn btn-purple btn-icon" onclick="sendChat()" disabled style="padding:10px;">
                                <i data-lucide="send"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
`;

html = html.replace(/<!-- ===== DM TAB ===== -->[\s\S]*?<!-- ===== ANNOUNCE TAB ===== -->/, dmTabHtml + '\n\n            <!-- ===== ANNOUNCE TAB ===== -->');

// 5. Add custom dropdown logic and lucide init to the end of <script>
const customDropdownJs = `
        // Refresh Lucide Icons
        function refreshIcons() {
            if (window.lucide) {
                lucide.createIcons();
            }
        }
        setInterval(refreshIcons, 1000); // Hacky but works for dynamic content
        setTimeout(refreshIcons, 100);

        // Custom Dropdown Wrapper
        function createCustomDropdowns() {
            document.querySelectorAll('select').forEach(select => {
                if (select.dataset.customized) return;
                select.dataset.customized = 'true';
                select.style.display = 'none'; // Hide original
                
                const wrapper = document.createElement('div');
                wrapper.className = 'custom-select-wrapper';
                select.parentNode.insertBefore(wrapper, select);
                wrapper.appendChild(select);
                
                const trigger = document.createElement('div');
                trigger.className = 'custom-select-trigger';
                
                const selectedText = document.createElement('span');
                selectedText.textContent = select.options[select.selectedIndex]?.text || '-- Select --';
                
                const chevron = document.createElement('i');
                chevron.setAttribute('data-lucide', 'chevron-down');
                chevron.style.width = '1em'; chevron.style.height = '1em';
                
                trigger.appendChild(selectedText);
                trigger.appendChild(chevron);
                
                const optionsContainer = document.createElement('div');
                optionsContainer.className = 'custom-select-options';
                
                function updateOptions() {
                    optionsContainer.innerHTML = '';
                    Array.from(select.options).forEach((opt, idx) => {
                        const optDiv = document.createElement('div');
                        optDiv.className = 'custom-select-option' + (select.selectedIndex === idx ? ' selected' : '');
                        optDiv.innerHTML = opt.innerHTML; // Allow emoji/icons
                        optDiv.onclick = (e) => {
                            e.stopPropagation();
                            select.selectedIndex = idx;
                            selectedText.innerHTML = opt.innerHTML;
                            select.dispatchEvent(new Event('change'));
                            wrapper.classList.remove('open');
                            updateOptions();
                        };
                        optionsContainer.appendChild(optDiv);
                    });
                }
                
                updateOptions();
                
                trigger.onclick = (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                        if (w !== wrapper) w.classList.remove('open');
                    });
                    wrapper.classList.toggle('open');
                    updateOptions(); // Refresh in case original select options changed dynamically
                };
                
                wrapper.appendChild(trigger);
                wrapper.appendChild(optionsContainer);
                
                // Watch for external changes to select
                select.addEventListener('change', () => {
                    selectedText.innerHTML = select.options[select.selectedIndex]?.innerHTML || '-- Select --';
                    updateOptions();
                });
                
                // Watch for options added/removed dynamically
                const observer = new MutationObserver(() => {
                    selectedText.innerHTML = select.options[select.selectedIndex]?.innerHTML || '-- Select --';
                    updateOptions();
                });
                observer.observe(select, { childList: true });
            });
            
            document.addEventListener('click', () => {
                document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
            });
        }
        setTimeout(createCustomDropdowns, 500);
        
        // DM List Rendering
        let lastUserList = [];
        function renderDMUsers(users) {
            lastUserList = users;
            const list = document.getElementById('dm-user-list');
            if(!list) return;
            if(!users || users.length === 0) {
                list.innerHTML = '<div style="text-align:center; padding:20px; color:#949ba4; font-size:0.875rem;">No users found</div>';
                return;
            }
            
            let htmlStr = '';
            users.forEach(u => {
                const isActive = u.id === currentChatUser;
                const statusColor = u.presence === 'online' ? '#23a559' : u.presence === 'idle' ? '#f0b232' : u.presence === 'dnd' ? '#da373c' : '#80848e';
                htmlStr += \`
                    <div class="dm-user-item \${isActive ? 'active' : ''}" onclick="loadUserChat('\${u.id}', '\${u.username.replace(/'/g, "\\\\'")}', '\${u.presence || 'offline'}')">
                        <div style="position:relative;">
                            <img src="\${u.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" style="width:32px; height:32px; border-radius:50%;">
                            <div style="position:absolute; bottom:-2px; right:-2px; width:12px; height:12px; background:#2b2d31; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                                <div style="width:8px; height:8px; background:\${statusColor}; border-radius:50%;"></div>
                            </div>
                        </div>
                        <div style="font-weight:600; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${escHtml(u.username)}</div>
                    </div>
                \`;
            });
            list.innerHTML = htmlStr;
            refreshIcons();
        }

        // Update loadUserChat to take username and presence
        function loadUserChat(userId, username, presence) {
            currentChatUser = userId;
            const input = document.getElementById('chat-input');
            const btn = document.getElementById('btn-send-chat');
            const headerName = document.getElementById('chat-header-name');
            const headerStatus = document.getElementById('chat-header-status');
            
            input.disabled = false; btn.disabled = false;
            headerName.textContent = username;
            headerStatus.textContent = presence ? presence.toUpperCase() : 'OFFLINE';
            input.placeholder = "Message @" + username;
            
            document.getElementById('chat-messages').innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#949ba4; gap:8px;"><i data-lucide="loader-2" class="lucide-spin"></i> Loading...</div>';
            socket.emit('get_dm_history', { userId });
            document.getElementById('dm-badge').style.display = 'none';
            
            // Re-render user list to update active state
            renderDMUsers(lastUserList);
        }
`;

html = html.replace('</script>\n</body>', customDropdownJs + '\n    </script>\n</body>');

// Also inject renderDMUsers call inside updateDashboard
html = html.replace('// Populate user dropdown (once)', 'renderDMUsers(data.allServerUsers);\n            // Populate user dropdown (once)');

// And remove chevron-down icons that were next to native selects, as they break custom logic
html = html.replace(/<i data-lucide="chevron-down" style="position:absolute; right:12px; top:50%; transform:translateY\(-50%\); color:#64748b; pointer-events:none; font-size:0\.75rem;"><\/i>/g, '');

fs.writeFileSync('public/index.html', html);
console.log('UI Refactored');
