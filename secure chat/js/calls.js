/* START CALL */

window.startCall =
async function (
    type = "video"
) {

    try {
        // Check if I have blocked them or they have blocked me
        const myBlock = await database.ref(`users/${myUid}/blocked/${activeRecipientUid}`).once("value");
        if (myBlock.exists()) {
            showToast("Unblock user to call", "error");
            return;
        }
        
        const theirBlock = await database.ref(`users/${activeRecipientUid}/blocked/${myUid}`).once("value");
        if (theirBlock.exists()) {
            showToast("Call could not be started", "error");
            return;
        }

        currentCallId =
            database
                .ref("calls")
                .push().key;

        /* MEDIA */

        localStream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    video:
                        type ===
                        "video",

                    audio: true
                });

        showCallUI(
            type
        );

        document
            .getElementById(
                "local-video"
            )
            .srcObject =
            localStream;

        await createOffer();

        /* SAVE CALL */

        await database
            .ref(
                `callLogs/${currentCallId}`
            )
            .set({

                caller:
                    myUid,

                receiver:
                    activeRecipientUid,

                type:
                    type,

                status:
                    "calling",

                timestamp:
                    firebase.database.ServerValue.TIMESTAMP
            });

        showToast(
            `${type} call started`
        );

    } catch (e) {

        console.error(e);

        showToast(
            "Permission denied",
            "error"
        );
    }
};

/* UI */

function showCallUI(
    type = "video"
) {

    let modal =
        document.getElementById(
            "call-modal"
        );

    if (
        !modal
    ) {

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "call-modal";

        modal.style.cssText =
            `
            position:fixed;
            inset:0;
            background:black;
            z-index:999999;
            display:flex;
            justify-content:center;
            align-items:center;
            overflow:hidden;
            `;

        modal.innerHTML =
            `
            <video
                id="remote-video"
                autoplay
                playsinline
                style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    background:black;
                "
            ></video>

            <video
                id="local-video"
                autoplay
                muted
                playsinline
                style="
                    position:absolute;
                    bottom:20px;
                    right:20px;
                    width:140px;
                    height:220px;
                    object-fit:cover;
                    border-radius:18px;
                    background:#111;
                    border:2px solid white;
                "
            ></video>

            <div style="
                position:absolute;
                top:20px;
                left:20px;
                color:white;
                z-index:10;
            ">

                <h2 id="call-user-name">
                    ${activeRecipient}
                </h2>

                <div id="call-status">
                    Connecting...
                </div>

            </div>

            <div style="
                position:absolute;
                bottom:30px;
                left:50%;
                transform:translateX(-50%);
                display:flex;
                gap:20px;
                z-index:10;
            ">

                <button
                    id="mute-btn"
                    style="
                        width:60px;
                        height:60px;
                        border-radius:50%;
                        background:#202c33;
                        color:white;
                        font-size:22px;
                    "
                >
                    🎤
                </button>

                <button
                    id="end-call-btn"
                    style="
                        width:70px;
                        height:70px;
                        border-radius:50%;
                        background:#f15c6d;
                        color:white;
                        font-size:26px;
                    "
                >
                    📞
                </button>

                <button
                    id="camera-btn"
                    style="
                        width:60px;
                        height:60px;
                        border-radius:50%;
                        background:#202c33;
                        color:white;
                        font-size:22px;
                    "
                >
                    📷
                </button>

            </div>
            `;

        document.body.appendChild(
            modal
        );

        /* END */

        document
            .getElementById(
                "end-call-btn"
            )
            .onclick =
            endCall;

        /* MUTE */

        document
            .getElementById(
                "mute-btn"
            )
            .onclick =
            toggleMute;

        /* CAMERA */

        document
            .getElementById(
                "camera-btn"
            )
            .onclick =
            toggleCamera;
    }

    modal.style.display =
        "flex";

    /* VOICE */

    if (
        type ===
        "voice"
    ) {

        document
            .getElementById(
                "remote-video"
            )
            .style.display =
            "none";

        document
            .getElementById(
                "local-video"
            )
            .style.display =
            "none";

        modal.style.background =
            "#0b141a";

    } else {

        document
            .getElementById(
                "remote-video"
            )
            .style.display =
            "block";

        document
            .getElementById(
                "local-video"
            )
            .style.display =
            "block";
    }
}

/* END */

window.endCall =
async function () {

    cleanupRTC();

    const modal =
        document.getElementById(
            "call-modal"
        );

    if (
        modal
    ) {

        modal.style.display =
            "none";
    }

    try {

        if (
            currentCallId
        ) {

            await database
                .ref(
                    `offers/${currentCallId}`
                )
                .remove();

            await database
                .ref(
                    `answers/${currentCallId}`
                )
                .remove();

            await database
                .ref(
                    `iceCandidates/${currentCallId}`
                )
                .remove();

            await database
                .ref(
                    `callLogs/${currentCallId}/status`
                )
                .set(
                    "ended"
                );
        }

    } catch (e) {

        console.error(e);
    }

    currentCallId =
        null;

    showToast(
        "Call ended"
    );
};

/* MUTE */

window.toggleMute =
function () {

    if (
        !localStream
    ) return;

    const track =
        localStream
            .getAudioTracks()[0];

    if (
        !track
    ) return;

    track.enabled =
        !track.enabled;

    const btn =
        document.getElementById(
            "mute-btn"
        );

    btn.innerText =
        track.enabled
        ?
        "🎤"
        :
        "🔇";
};

/* CAMERA */

window.toggleCamera =
function () {

    if (
        !localStream
    ) return;

    const track =
        localStream
            .getVideoTracks()[0];

    if (
        !track
    ) return;

    track.enabled =
        !track.enabled;

    const btn =
        document.getElementById(
            "camera-btn"
        );

    btn.innerText =
        track.enabled
        ?
        "📷"
        :
        "🚫";
};

listenIncomingCalls();

console.log(
    "System: Calls Ready"
);