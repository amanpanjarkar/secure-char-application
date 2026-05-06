function bootSystems() {
    const usernameDisplay = document.getElementById('my-username-display');
    if (usernameDisplay) usernameDisplay.innerText = myName;

    database.ref('users/' + myName).update({ status: "Online", typing: "" });
    database.ref('users/' + myName).onDisconnect().update({ status: "Offline", lastSeen: firebase.database.ServerValue.TIMESTAMP, typing: "" });

    database.ref(`users/${myName}/photo`).on('value', s => {
        const url = s.val() || defaultPic;
        const pImg = document.getElementById('display-pic');
        if (pImg) pImg.src = url;
    });

    database.ref(".info/connected").on("value", (snap) => {
        networkStatus = snap.val();
        if (!networkStatus) console.warn("System: Connection Latency detected.");
    });

    listenForRequests();
    initializeSidebar();
}

let isInitialRequestLoad = true;
let previousRequestCount = 0;

function listenForRequests() {
    database.ref(`users/${myName}/requests`).on('value', snap => {
        const badge = document.getElementById('requests-badge');
        const list = document.getElementById('requests-list');
        if (!badge || !list) return;

        list.innerHTML = "";

        if (!snap.exists()) {
            badge.style.display = 'none';
            list.innerHTML = "<p style='color: var(--text-muted); text-align: center; font-size: 14px;'>No pending requests.</p>";
            isInitialRequestLoad = false;
            previousRequestCount = 0;
            return;
        }

        let count = 0;
        snap.forEach(req => {
            count++;
            const sender = req.key;
            list.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                    <span style="font-weight: 500; color: var(--text-main); font-size: 15px;">@${sender}</span>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="acceptRequest('${sender}')" style="background: var(--accent); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 500;">Accept</button>
                        <button onclick="rejectRequest('${sender}')" style="background: transparent; color: #f15c6d; border: 1px solid #f15c6d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 500;">Reject</button>
                    </div>
                </div>
            `;
        });

        if (!isInitialRequestLoad && count > previousRequestCount) {
            playNotificationSound();
        }
        previousRequestCount = count;
        isInitialRequestLoad = false;

        if (count > 0) {
            badge.innerText = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    });
}

function initializeSidebar() {
    const contactsRef = database.ref(`users/${myName}/contacts`);

    contactsRef.on('value', snap => {
        const list = document.getElementById('contact-list');
        list.innerHTML = "";

        if (!snap.exists()) {
            console.log("Sidebar: Empty contact list.");
            return;
        }

        snap.forEach(entry => {
            if (entry.val() === true) {
                renderSidebarRow(entry.key);
            }
        });
    });
}

function renderSidebarRow(cid) {
    database.ref('users/' + cid).on('value', uSnap => {
        const u = uSnap.val();
        if (!u) return;

        const existing = document.getElementById(`row-${cid}`);
        if (existing) existing.remove();

        const row = document.createElement('div');
        row.className = 'contact-item';
        row.id = `row-${cid}`;

        const isTyping = u.typing === myName;
        const color = isTyping || u.status === 'Online' ? '#25d366' : '#8696a0';

        let displayStatus = u.status || 'Offline';
        if (u.status === 'Offline' && u.lastSeen) {
            displayStatus = "Last seen: " + getTS(u.lastSeen);
        }

        row.innerHTML = `
            <div class="sidebar-avatar-frame">
                <img src="${u.photo || defaultPic}" class="avatar" onclick="event.stopPropagation(); openFullImage('${u.photo || defaultPic}')">
            </div>
            <div class="sidebar-info-frame" onclick="startChat('${u.username}', '${u.photo || defaultPic}')">
                <div class="contact-top">
                    <div class="contact-name">${u.username}</div>
                    <div class="contact-time" id="time-${cid}"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="contact-status" id="status-${cid}" style="color: ${color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">${isTyping ? 'typing...' : displayStatus}</div>
                    <div id="unread-${cid}" style="display: none; background: var(--accent); color: white; border-radius: 50%; padding: 2px 6px; font-size: 11px; font-weight: bold;">0</div>
                </div>
            </div>
        `;

        document.getElementById('contact-list').appendChild(row);

        let isInitialMsgLoad = true;
        let previousUnread = 0;
        const roomPath = [myName, cid].sort().join("_");
        
        database.ref(`users/${myName}/clearedChats/${cid}`).on('value', clearSnap => {
            const clearedAt = clearSnap.val() || 0;
            
            database.ref('chats/' + roomPath).off('value'); // Prevent memory leak when re-rendering
            database.ref('chats/' + roomPath).on('value', chatSnap => {
                let unreadCount = 0;
                let lastMsg = null;

                chatSnap.forEach(msgSnap => {
                    const ts = getTimestampFromPushId(msgSnap.key);
                    if (ts <= clearedAt) return;

                    const msg = msgSnap.val();
                    lastMsg = msg;
                    if (msg.sender !== myName && msg.status !== 'seen') unreadCount++;
                });

                if (!isInitialMsgLoad && unreadCount > previousUnread) {
                    playNotificationSound();
                }
                previousUnread = unreadCount;
                isInitialMsgLoad = false;

                const unreadBadge = document.getElementById(`unread-${cid}`);
                const statusDiv = document.getElementById(`status-${cid}`);
                const timeDiv = document.getElementById(`time-${cid}`);
                const rowEl = document.getElementById(`row-${cid}`);

                if (!unreadBadge || !rowEl) return;

                if (lastMsg) {
                    timeDiv.innerText = lastMsg.time;
                    let preview = "";
                    if (lastMsg.type === 'audio') preview = "🎤 Voice message";
                    else if (lastMsg.type === 'image') preview = "📷 Photo";
                    else preview = decodeMsg(lastMsg.text);

                    if (unreadCount > 0 && activeRecipient !== cid) {
                        unreadBadge.innerText = unreadCount;
                        unreadBadge.style.display = 'block';
                        statusDiv.innerText = preview;
                        statusDiv.style.fontWeight = "bold";
                        statusDiv.style.color = "var(--text-main)";

                        const list = document.getElementById('contact-list');
                        if (list.firstChild !== rowEl) list.prepend(rowEl);
                    } else {
                        unreadBadge.style.display = 'none';
                        statusDiv.innerText = u.typing === myName ? 'typing...' : preview;
                        statusDiv.style.fontWeight = "normal";
                        statusDiv.style.color = "var(--text-muted)";

                        const list = document.getElementById('contact-list');
                        if (list.firstChild !== rowEl) list.prepend(rowEl);
                    }
                }
            });
        });
    });
}
