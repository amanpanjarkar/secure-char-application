let statusListeners = {};
let userProfileCache = {};

window.loadStatuses = function () {
    // Initial render to show "My Status"
    renderStatusTray();

    database.ref(`users/${myUid}/contacts`).on("value", snap => {
        let contacts = [myUid];
        if (snap.exists()) {
            snap.forEach(c => {
                if (c.val() === true || typeof c.val() === 'object') {
                    contacts.push(c.key);
                }
            });
        }

        // Remove listeners for contacts no longer in list
        Object.keys(statusListeners).forEach(uid => {
            if (!contacts.includes(uid)) {
                database.ref(`statuses/${uid}`).off("value", statusListeners[uid]);
                delete statusListeners[uid];
                delete statusesByContact[uid];
            }
        });

        // Add listeners for new contacts
        contacts.forEach(uid => {
            if (!statusListeners[uid]) {
                const listener = database.ref(`statuses/${uid}`).on("value", statusSnap => {
                    const data = statusSnap.val();
                    if (!data) {
                        delete statusesByContact[uid];
                    } else {
                        const oneDay = Date.now() - (24 * 60 * 60 * 1000);
                        let active = [];
                        for (let key in data) {
                            if (data[key].timestamp > oneDay) {
                                active.push({ id: key, ...data[key] });
                            }
                        }
                        if (active.length > 0) {
                            active.sort((a, b) => a.timestamp - b.timestamp);
                            statusesByContact[uid] = active;
                        } else {
                            delete statusesByContact[uid];
                        }
                    }
                    renderStatusTray();
                });
                statusListeners[uid] = listener;
            }
        });
    });
};

let STATUS_DURATION = 5000;

function renderStatusTray() {
    const tray = document.getElementById("status-tray");
    if (!tray) return;

    // Set stable styles if not already set
    if (tray.style.display !== "flex") {
        tray.style.cssText = "display:flex; flex-direction:row; flex-wrap:nowrap; overflow-x:auto; padding:10px; gap:15px; width:100%; align-items:center; background:#111b21; border-bottom:1px solid #222d34; min-height:100px;";
    }

    tray.innerHTML = "";

    // 1. My Status
    const myStatusDiv = document.createElement("div");
    myStatusDiv.style.cssText = "display:flex; flex-direction:column; align-items:center; cursor:pointer; flex-shrink:0; width:70px;";
    
    const myStatuses = statusesByContact[myUid];
    const myRingColor = myStatuses ? "#00a884" : "#202c33";
    
    myStatusDiv.innerHTML = `
        <div style="width:55px; height:55px; border-radius:50%; border:2px solid ${myRingColor}; padding:2px; position:relative; background:#202c33;">
            <img src="${myPic || defaultPic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
            <div onclick="event.stopPropagation(); uploadStatusPrompt();" style="position:absolute; bottom:0; right:0; background:#00a884; color:white; width:20px; height:20px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:16px; border:2px solid #111b21;">+</div>
        </div>
        <small style="color:#e9edef; margin-top:8px; font-size:12px; font-weight:500;">My Status</small>
    `;
    myStatusDiv.onclick = () => myStatuses ? openStatusViewer(myUid) : uploadStatusPrompt();
    tray.appendChild(myStatusDiv);

    // 2. Contacts Statuses
    const contactUids = Object.keys(statusesByContact).filter(u => u !== myUid);
    
    contactUids.forEach(async uid => {
        // Check if blocked
        const blockSnap = await database.ref(`users/${myUid}/blocked/${uid}`).once("value");
        if (blockSnap.exists()) return;

        const user = userProfileCache[uid];
        
        // If not in cache, fetch in background and return
        if (!user) {
            database.ref(`users/${uid}`).once("value").then(snap => {
                if (snap.exists()) {
                    userProfileCache[uid] = snap.val();
                    renderStatusTray(); // Re-render once we have the data
                }
            });
            return;
        }

        const allStatuses = statusesByContact[uid];
        if (!allStatuses || allStatuses.length === 0) return;

        const hasUnseen = allStatuses.some(s => !s.views || !s.views[myUid]);
        const ringColor = hasUnseen ? "#00a884" : "#8696a0";

        const div = document.createElement("div");
        div.style.cssText = "display:flex; flex-direction:column; align-items:center; cursor:pointer; flex-shrink:0; width:70px;";
        
        div.innerHTML = `
            <div style="width:55px; height:55px; border-radius:50%; border:2px solid ${ringColor}; padding:2px; background:#202c33;">
                <img src="${user.photo || defaultPic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
            </div>
            <small style="color:#e9edef; margin-top:8px; font-size:12px; width:100%; overflow:hidden; text-overflow:ellipsis; text-align:center; font-weight:500;">${user.username}</small>
        `;

        div.onclick = () => openStatusViewer(uid);
        tray.appendChild(div);
    });
}


/* UPLOAD */

window.uploadStatusPrompt = function() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const modal = document.getElementById("status-upload-modal");
        const previewContainer = document.getElementById("status-media-preview");
        const captionInput = document.getElementById("status-caption-input");
        const confirmBtn = document.getElementById("confirm-status-upload-btn");

        if (!modal || !previewContainer) return;

        previewContainer.innerHTML = "";
        captionInput.value = "";
        modal.style.display = "flex";

        const url = URL.createObjectURL(file);
        if (file.type.startsWith("video/")) {
            const video = document.createElement("video");
            video.src = url;
            video.controls = true;
            video.style.maxWidth = "100%";
            video.style.maxHeight = "100%";
            previewContainer.appendChild(video);
        } else {
            const img = document.createElement("img");
            img.src = url;
            img.style.maxWidth = "100%";
            img.style.maxHeight = "100%";
            img.style.objectFit = "contain";
            previewContainer.appendChild(img);
        }

        confirmBtn.onclick = () => doStatusUpload(file);
    };

    input.click();
};

window.closeStatusUploadModal = function() {
    const modal = document.getElementById("status-upload-modal");
    if (modal) modal.style.display = "none";
};

window.doStatusUpload = async function(file) {
    const caption = document.getElementById("status-caption-input").value.trim();
    closeStatusUploadModal();
    
    showToast("Uploading status...");

    try {
        const url = await uploadToCloudinary(file, "status_media");
        const type = file.type.startsWith("video/") ? "video" : "image";

        await database.ref(`statuses/${myUid}`).push().set({
            type: type,
            content: url,
            caption: caption,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            time: getTS()
        });

        showToast("Status uploaded");
    } catch (e) {
        console.error(e);
        showToast("Upload failed", "error");
    }
};

window.replyToStatus = async function(e) {
    e.stopPropagation();
    const input = document.querySelector(".status-reply-input");
    const text = input.value.trim();
    if (!text) return;

    const recipientUid = currentStatusUser;
    const roomId = [myUid, recipientUid].sort().join("_");
    
    try {
        await database.ref(`chats/${roomId}`).push().set({
            sender: myName,
            senderUid: myUid,
            text: encodeMsg(`Reply to Status: ${text}`),
            type: "text",
            time: getTS(),
            status: "sent",
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        showToast("Reply sent");
        input.value = "";
        closeStatusViewer();
    } catch (e) {
        console.error(e);
        showToast("Failed to send reply", "error");
    }
};

/* OPEN */

window.openStatusViewer =
function (
    uid
) {

    const statuses =
        statusesByContact[
            uid
        ];

    if (
        !statuses ||
        statuses.length === 0
    ) return;

    currentStatusUser =
        uid;

    currentStatusIndex =
        0;

    renderCurrentStatus();
};

/* RENDER */

function renderCurrentStatus() {

    clearTimeout(
        statusTimer
    );

    const statuses =
        statusesByContact[
            currentStatusUser
        ];

    const status =
        statuses[
            currentStatusIndex
        ];

    if (
        !status
    ) return;

    let modal =
        document.getElementById(
            "status-viewer-modal"
        );

    if (
        !modal
    ) {

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "status-viewer-modal";

        modal.className =
            "modal";

        modal.innerHTML =
            `
            <div id="status-bars" class="status-bars"></div>
            
            <div id="status-header" class="status-header">
                <img id="status-user-pic" src="">
                <div style="display:flex; flex-direction:column;">
                    <strong id="status-user-name"></strong>
                    <small id="status-time" style="opacity:0.8; font-size:12px;"></small>
                </div>
            </div>

            <div id="status-content" style="
                width:100%;
                height:100%;
                display:flex;
                justify-content:center;
                align-items:center;
                background:black;
                position:relative;
            "></div>

            <div id="status-footer" style="width:100%; position:absolute; bottom:0; z-index:20;"></div>

            <div id="status-viewers-modal" class="modal" style="display:none; background:rgba(0,0,0,0.9); z-index:40;">
                <div class="modal-card" style="max-height:80%; overflow-y:auto;">
                    <h2 style="margin-bottom:15px; font-size:18px;">Viewed by</h2>
                    <div id="status-viewers-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                    <button onclick="closeViewerList()" style="margin-top:20px; background:var(--hover); color:white; padding:10px; border-radius:10px;">Close</button>
                </div>
            </div>

            <button
                id="close-status-btn"
                style="
                    position:absolute;
                    top:25px;
                    right:20px;
                    width:45px;
                    height:45px;
                    border-radius:50%;
                    background:rgba(255,255,255,0.1);
                    color:white;
                    font-size:20px;
                    z-index:30;
                "
            >
                ✕
            </button>
            
            <button id="add-status-overlay" style="position:absolute; top:25px; right:75px; background:rgba(255,255,255,0.1); color:white; padding:10px 15px; border-radius:20px; z-index:30; font-size:13px;" onclick="uploadStatusPrompt(); closeStatusViewer();">Add New</button>
            
            <button id="delete-status-btn" style="position:absolute; bottom:80px; right:20px; width:45px; height:45px; border-radius:50%; background:rgba(241, 92, 109, 0.2); color:#f15c6d; font-size:20px; z-index:30; display:none;" onclick="confirmDeleteStatus(event)">🗑️</button>
            `;

        document.body.appendChild(
            modal
        );

        document
            .getElementById(
                "close-status-btn"
            )
            .onclick =
            closeStatusViewer;

        let holdStart = 0;
        
        modal.onmousedown = modal.ontouchstart = (e) => {
            if (e.target.closest('button') || e.target.closest('#status-footer')) return;
            holdStart = Date.now();
            pauseStatus();
        };

        modal.onmouseup = modal.ontouchend = (e) => {
            if (e.target.closest('button') || e.target.closest('#status-footer')) return;
            const holdDuration = Date.now() - holdStart;
            resumeStatus();
            
            // Only go to next status if it was a quick click (< 250ms)
            if (holdDuration < 250) {
                nextStatus();
            }
        };

        // Remove the old onclick since we handle it in onmouseup
        modal.onclick = null;
    }

    modal.style.display =
        "flex";

    const content =
        document.getElementById(
            "status-content"
        );

    content.innerHTML =
        "";

    /* IMAGE */

    if (
        status.type ===
        "image"
    ) {

        const img =
            document.createElement(
                "img"
            );

        img.src =
            status.content;

        img.style.maxWidth =
            "100%";

        img.style.maxHeight =
            "100%";

        content.appendChild(
            img
        );
    }

    /* VIDEO */

    else if (
        status.type ===
        "video"
    ) {

        const video =
            document.createElement(
                "video"
            );

        video.src =
            status.content;

        video.autoplay =
            true;

        video.style.maxWidth =
            "100%";

        video.style.maxHeight =
            "100%";

        video.onended =
            nextStatus;

        content.appendChild(
            video
        );
    }

    /* CAPTION */
    if (status.caption) {
        const captionDiv = document.createElement("div");
        captionDiv.style.cssText = `
            position:absolute;
            bottom:100px;
            left:0;
            width:100%;
            padding:20px;
            background:rgba(0,0,0,0.5);
            color:white;
            text-align:center;
            font-size:16px;
            z-index:25;
        `;
        captionDiv.innerText = status.caption;
        content.appendChild(captionDiv);
    }

    /* HEADER */
    const timeEl = document.getElementById("status-time");
    if (timeEl) timeEl.innerText = status.time || getTS(status.timestamp);

    database.ref(`users/${currentStatusUser}`).once("value", snap => {
        const user = snap.val();
        if (user) {
            const pic = document.getElementById("status-user-pic");
            const name = document.getElementById("status-user-name");
            if (pic) pic.src = user.photo || defaultPic;
            if (name) name.innerText = (currentStatusUser === myUid) ? "My Status" : user.username;
        }
    });

    /* PROGRESS BARS */
    const barsContainer = document.getElementById("status-bars");
    barsContainer.innerHTML = "";
    statuses.forEach((s, idx) => {
        const bar = document.createElement("div");
        bar.className = "status-bar";
        const inner = document.createElement("div");
        inner.className = "status-bar-inner";
        if (idx < currentStatusIndex) inner.style.width = "100%";
        if (idx === currentStatusIndex) {
            setTimeout(() => {
                inner.style.transitionDuration = STATUS_DURATION + "ms";
                inner.style.width = "100%";
            }, 50);
        }
        bar.appendChild(inner);
        barsContainer.appendChild(bar);
    });

    /* FOOTER (REPLY OR VIEWS) */
    const footer = document.getElementById("status-footer");
    footer.innerHTML = "";

    if (currentStatusUser === myUid) {
        document.getElementById("delete-status-btn").style.display = "flex";
        document.getElementById("delete-status-btn").style.justifyContent = "center";
        document.getElementById("delete-status-btn").style.alignItems = "center";
        document.getElementById("add-status-overlay").style.display = "block";
        
        const viewsInfo = document.createElement("div");
        viewsInfo.className = "status-views-info";
        viewsInfo.style.cursor = "pointer";
        
        database.ref(`statuses/${myUid}/${status.id}/views`).on("value", snap => {
            const count = snap.exists() ? snap.numChildren() : 0;
            viewsInfo.innerHTML = `👁️ ${count}`;
            
            viewsInfo.onmousedown = (e) => e.stopPropagation();
            viewsInfo.onmouseup = (e) => e.stopPropagation();
            viewsInfo.onclick = (e) => {
                e.stopPropagation();
                showViewerList(status.id);
            };
        });
        footer.appendChild(viewsInfo);
    } else {
        document.getElementById("delete-status-btn").style.display = "none";
        document.getElementById("add-status-overlay").style.display = "none";
        
        const replyArea = document.createElement("div");
        replyArea.className = "status-reply-area";
        replyArea.innerHTML = `
            <input type="text" class="status-reply-input" placeholder="Type a reply..." onclick="event.stopPropagation()">
            <button class="profile-action-btn" onclick="replyToStatus(event)">➤</button>
        `;
        footer.appendChild(replyArea);
    }

    /* VIEW */
    if (currentStatusUser !== myUid) {
        const viewRef = database.ref(`statuses/${currentStatusUser}/${status.id}/views/${myUid}`);
        viewRef.once("value", snap => {
            if (!snap.exists()) {
                viewRef.set(firebase.database.ServerValue.TIMESTAMP);
            }
        });
    }

    statusTimer =
        setTimeout(
            nextStatus,
            STATUS_DURATION
        );
}

window.pauseStatus = function() {
    clearTimeout(statusTimer);
    const inners = document.querySelectorAll(".status-bar-inner");
    if (inners[currentStatusIndex]) {
        const computedWidth = window.getComputedStyle(inners[currentStatusIndex]).width;
        inners[currentStatusIndex].style.transition = "none";
        inners[currentStatusIndex].style.width = computedWidth;
    }
};

window.resumeStatus = function() {
    if (document.getElementById("status-viewers-modal").style.display === "flex") return;
    
    clearTimeout(statusTimer);
    const inners = document.querySelectorAll(".status-bar-inner");
    if (inners[currentStatusIndex]) {
        inners[currentStatusIndex].style.transition = `width ${STATUS_DURATION}ms linear`;
        inners[currentStatusIndex].style.width = "100%";
    }
    statusTimer = setTimeout(nextStatus, STATUS_DURATION);
};

/* NEXT */

window.nextStatus =
function () {

    const statuses =
        statusesByContact[
            currentStatusUser
        ];

    if (
        currentStatusIndex <
        statuses.length - 1
    ) {

        currentStatusIndex++;

        renderCurrentStatus();

    } else {

        closeStatusViewer();
    }
};

/* CLOSE */

window.closeStatusViewer =
function () {

    clearTimeout(
        statusTimer
    );

    const modal =
        document.getElementById(
            "status-viewer-modal"
        );

    if (
        modal
    ) {

        modal.style.display =
            "none";
    }
};

window.showViewerList = async function(statusId) {
    pauseStatus();
    const modal = document.getElementById("status-viewers-modal");
    const list = document.getElementById("status-viewers-list");
    if (!modal || !list) return;

    modal.style.display = "flex";
    list.innerHTML = "Loading...";

    try {
        const snap = await database.ref(`statuses/${myUid}/${statusId}/views`).once("value");
        if (!snap.exists()) {
            list.innerHTML = "No views yet";
            return;
        }

        list.innerHTML = "";
        const uids = Object.keys(snap.val());
        
        for (const uid of uids) {
            const userSnap = await database.ref(`users/${uid}`).once("value");
            const user = userSnap.val();
            if (user) {
                const item = document.createElement("div");
                item.style.cssText = "display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05);";
                item.innerHTML = `
                    <img src="${user.photo || defaultPic}" style="width:35px; height:35px; border-radius:50%;">
                    <span>${user.username}</span>
                    <small style="margin-left:auto; opacity:0.6;">${getTS(snap.val()[uid])}</small>
                `;
                list.appendChild(item);
            }
        }
    } catch (e) {
        console.error(e);
        list.innerHTML = "Failed to load viewers";
    }
};

window.closeViewerList = function() {
    const modal = document.getElementById('status-viewers-modal');
    if (modal) modal.style.display = 'none';
    resumeStatus();
};

window.confirmDeleteStatus = function(e) {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this status?")) {
        deleteCurrentStatus();
    }
};

window.deleteCurrentStatus = async function() {
    const statuses = statusesByContact[myUid];
    const status = statuses[currentStatusIndex];
    if (!status) return;

    try {
        await database.ref(`statuses/${myUid}/${status.id}`).remove();
        showToast("Status deleted");
        
        // Remove from local array
        statuses.splice(currentStatusIndex, 1);
        
        if (statuses.length === 0) {
            closeStatusViewer();
        } else {
            // Go to next or previous
            if (currentStatusIndex >= statuses.length) {
                currentStatusIndex = statuses.length - 1;
            }
            renderCurrentStatus();
        }
    } catch (e) {
        console.error(e);
        showToast("Failed to delete status", "error");
    }
};

console.log(
    "System: Status Ready"
);