/* PEER */

async function createPeerConnection() {

    peerConnection =
        new RTCPeerConnection(
            rtcConfiguration
        );

    remoteStream =
        new MediaStream();

    const remoteVideo =
        document.getElementById(
            "remote-video"
        );

    if (
        remoteVideo
    ) {

        remoteVideo.srcObject =
            remoteStream;
    }

    /* LOCAL */

    if (
        localStream
    ) {

        localStream
            .getTracks()
            .forEach(track => {

                peerConnection
                    .addTrack(
                        track,
                        localStream
                    );
            });
    }

    /* REMOTE */

    peerConnection.ontrack =
        event => {

            event.streams[0]
                .getTracks()
                .forEach(track => {

                    remoteStream
                        .addTrack(track);
                });
        };

    /* ICE */

    peerConnection.onicecandidate =
        async event => {

            if (
                event.candidate &&
                currentCallId
            ) {

                await database
                    .ref(
                        `iceCandidates/${currentCallId}`
                    )
                    .push()
                    .set({

                        sender:
                            myUid,

                        candidate:
                            JSON.stringify(
                                event.candidate
                            )
                    });
            }
        };

    /* STATE */

    peerConnection.onconnectionstatechange =
        () => {

            console.log(
                "RTC:",
                peerConnection.connectionState
            );

            const status =
                document.getElementById(
                    "call-status"
                );

            if (
                status
            ) {

                if (
                    peerConnection.connectionState ===
                    "connected"
                ) {

                    status.innerText =
                        "Connected";
                }

                else if (
                    peerConnection.connectionState ===
                    "connecting"
                ) {

                    status.innerText =
                        "Connecting...";
                }

                else if (
                    peerConnection.connectionState ===
                    "disconnected"
                ) {

                    status.innerText =
                        "Disconnected";

                    endCall();
                }
            }
        };

    listenForIceCandidates();
}

/* ICE */

function listenForIceCandidates() {

    if (
        !currentCallId
    ) return;

    database
        .ref(
            `iceCandidates/${currentCallId}`
        )
        .off();

    database
        .ref(
            `iceCandidates/${currentCallId}`
        )
        .on(
            "child_added",
            async snap => {

                const data =
                    snap.val();

                if (
                    !data ||
                    data.sender ===
                    myUid
                ) return;

                try {

                    const candidate =
                        new RTCIceCandidate(

                            JSON.parse(
                                data.candidate
                            )
                        );

                    await peerConnection
                        .addIceCandidate(
                            candidate
                        );

                } catch (e) {

                    console.error(
                        "ICE Error",
                        e
                    );
                }
            }
        );
}

/* OFFER */

window.createOffer =
async function () {

    try {

        await createPeerConnection();

        const offer =
            await peerConnection
                .createOffer();

        await peerConnection
            .setLocalDescription(
                offer
            );

        await database
            .ref(
                `offers/${currentCallId}`
            )
            .set({

                from:
                    myUid,

                to:
                    activeRecipientUid,

                offer:
                    JSON.stringify(
                        offer
                    ),

                type:
                    "offer",

                createdAt:
                    firebase.database.ServerValue.TIMESTAMP
            });

        listenForAnswer();

    } catch (e) {

        console.error(e);

        showToast(
            "Offer failed",
            "error"
        );
    }
};

/* ANSWER */

window.answerOffer =
async function (
    offerData
) {

    try {

        await createPeerConnection();

        const remoteDesc =
            new RTCSessionDescription(

                JSON.parse(
                    offerData.offer
                )
            );

        await peerConnection
            .setRemoteDescription(
                remoteDesc
            );

        const answer =
            await peerConnection
                .createAnswer();

        await peerConnection
            .setLocalDescription(
                answer
            );

        await database
            .ref(
                `answers/${currentCallId}`
            )
            .set({

                from:
                    myUid,

                to:
                    offerData.from,

                answer:
                    JSON.stringify(
                        answer
                    ),

                type:
                    "answer",

                createdAt:
                    firebase.database.ServerValue.TIMESTAMP
            });

    } catch (e) {

        console.error(e);

        showToast(
            "Answer failed",
            "error"
        );
    }
};

/* ANSWER LISTENER */

function listenForAnswer() {

    database
        .ref(
            `answers/${currentCallId}`
        )
        .on(
            "value",
            async snap => {

                const data =
                    snap.val();

                if (
                    !data
                ) return;

                try {

                    const remoteDesc =
                        new RTCSessionDescription(

                            JSON.parse(
                                data.answer
                            )
                        );

                    if (
                        !peerConnection.currentRemoteDescription
                    ) {

                        await peerConnection
                            .setRemoteDescription(
                                remoteDesc
                            );
                    }

                } catch (e) {

                    console.error(
                        e
                    );
                }
            }
        );
}

/* INCOMING */

window.listenIncomingCalls =
function () {

    database
        .ref(
            "offers"
        )
        .on(
            "child_added",
            async snap => {

                const data =
                    snap.val();

                if (
                    !data
                ) return;

                if (
                    data.to !==
                    myUid
                ) return;

                // Check if sender is blocked
                const blockSnap = await database.ref(`users/${myUid}/blocked/${data.from}`).once("value");
                if (blockSnap.exists()) {
                    console.log("Blocking incoming call from blocked user:", data.from);
                    return;
                }

                currentCallId =
                    snap.key;

                /* NOTIFICATION */

                if (
                    typeof showIncomingCallNotification ===
                    "function"
                ) {

                    showIncomingCallNotification(
                        "Incoming Call"
                    );
                }

                const accept =
                    confirm(
                        "Incoming call"
                    );

                if (
                    !accept
                ) return;

                try {

                    localStream =
                        await navigator
                            .mediaDevices
                            .getUserMedia({

                                video: true,

                                audio: true
                            });

                    showCallUI();

                    document
                        .getElementById(
                            "local-video"
                        )
                        .srcObject =
                        localStream;

                    await answerOffer(
                        data
                    );

                } catch (e) {

                    console.error(
                        e
                    );

                    showToast(
                        "Camera/Mic denied",
                        "error"
                    );
                }
            }
        );
};

/* CLEANUP */

window.cleanupRTC =
function () {

    try {

        if (
            peerConnection
        ) {

            peerConnection.close();

            peerConnection =
                null;
        }

        if (
            localStream
        ) {

            localStream
                .getTracks()
                .forEach(track =>
                    track.stop()
                );

            localStream =
                null;
        }

        if (
            remoteStream
        ) {

            remoteStream
                .getTracks()
                .forEach(track =>
                    track.stop()
                );

            remoteStream =
                null;
        }

    } catch (e) {

        console.error(
            e
        );
    }
};

console.log(
    "System: WebRTC Ready"
);