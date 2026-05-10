let notifiedMessages = {};

let notifiedRequests = 0;

/* INIT */

window.initializeNotifications =
async function () {

    if (
        !("Notification" in window)
    ) {

        return;
    }

    if (
        Notification.permission ===
        "default"
    ) {

        try {

            await Notification
                .requestPermission();

        } catch (e) {

            console.error(e);
        }
    }
};

/* SHOW */

window.showBrowserNotification =
function (
    title,
    body,
    icon = "assets/icons/icon-192.png"
) {

    if (
        !appSettings.notifications
    ) return;

    if (
        Notification.permission !==
        "granted"
    ) return;

    const notification =
        new Notification(
            title,
            {
                body,
                icon,
                badge: icon
            }
        );

    notification.onclick =
        () => {

            window.focus();

            notification.close();
        };
};

/* MESSAGE */

window.listenMessageNotifications =
function () {

    database
        .ref("chats")
        .on(
            "child_added",
            roomSnap => {

                const roomId =
                    roomSnap.key;

                if (
                    !roomId.includes(
                        myUid
                    )
                ) return;

                database
                    .ref(
                        `chats/${roomId}`
                    )
                    .limitToLast(1)
                    .on(
                        "child_added",
                        snap => {

                            const key =
                                snap.key;

                            const data =
                                snap.val();

                            if (
                                !data
                            ) return;

                            /* OWN */

                            if (
                                data.senderUid ===
                                myUid
                            ) return;

                            /* DUPLICATE */

                            if (
                                notifiedMessages[key]
                            ) return;

                            notifiedMessages[key] =
                                true;

                            /* NEW MESSAGE CHECK - Only notify if message is less than 10 seconds old */
                            const now = Date.now();
                            const msgTime = data.timestamp || 0;
                            if (now - msgTime > 10000) return;

                            /* ACTIVE CHAT */

                            if (
                                activeRecipientUid ===
                                data.senderUid
                            ) return;

                            let body =
                                "New Message";

                            if (
                                data.type ===
                                "image"
                            ) {

                                body =
                                    "📷 Photo";
                            }

                            else if (
                                data.type ===
                                "video"
                            ) {

                                body =
                                    "📹 Video";
                            }

                            else if (
                                data.type ===
                                "audio"
                            ) {

                                body =
                                    "🎤 Voice message";
                            }

                            else {

                                body =
                                    decodeMsg(
                                        data.text
                                    );
                            }

                            showBrowserNotification(
                                data.sender || "New Message",
                                body
                            );

                            playNotificationSound();
                        }
                    );
            }
        );

    /* REQUESTS */

    database
        .ref(
            `users/${myUid}/requests`
        )
        .on(
            "value",
            snap => {

                const count =
                    snap.exists()
                    ?
                    snap.numChildren()
                    :
                    0;

                if (
                    count >
                    notifiedRequests
                ) {

                    showBrowserNotification(

                        "New Request",

                        `${count} pending requests`
                    );

                    playNotificationSound();
                }

                notifiedRequests =
                    count;
            }
        );
};

/* CALL */

window.showIncomingCallNotification =
function (
    caller
) {

    showBrowserNotification(

        "Incoming Call",

        `${caller} is calling you`
    );

    /* SOUND */

    if (
        appSettings.callSound
    ) {

        try {

            const ctx =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

            const osc =
                ctx.createOscillator();

            const gain =
                ctx.createGain();

            osc.connect(gain);

            gain.connect(
                ctx.destination
            );

            osc.type =
                "triangle";

            osc.frequency
                .setValueAtTime(
                    500,
                    ctx.currentTime
                );

            osc.frequency
                .exponentialRampToValueAtTime(
                    900,
                    ctx.currentTime + 0.3
                );

            gain.gain
                .setValueAtTime(
                    0,
                    ctx.currentTime
                );

            gain.gain
                .linearRampToValueAtTime(
                    0.2,
                    ctx.currentTime + 0.1
                );

            gain.gain
                .linearRampToValueAtTime(
                    0,
                    ctx.currentTime + 0.5
                );

            osc.start();

            osc.stop(
                ctx.currentTime + 0.5
            );

        } catch (e) {}
    }
};

console.log(
    "Notifications Ready"
);