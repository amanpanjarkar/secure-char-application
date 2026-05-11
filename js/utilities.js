/* CLEAN USERNAME */

function cleanName(str) {

    if (!str)
        return "";

    return str
        .toLowerCase()
        .trim()
        .replace(
            /[\.\#\$\[\]\s]/g,
            "_"
        );
}

/* ENCODE */

function encodeMsg(str) {

    if (!str)
        return "";

    try {

        return btoa(
            unescape(
                encodeURIComponent(
                    str
                )
            )
        );

    } catch (e) {

        console.error(
            "Encode Error",
            e
        );

        return "";
    }
}

/* DECODE */

function decodeMsg(str) {

    if (!str)
        return "";

    try {

        return decodeURIComponent(
            escape(
                atob(str)
            )
        );

    } catch (e) {

        console.warn(
            "Decode Error"
        );

        return str;
    }
}

/* TIME */

function getTS(
    ts = null
) {

    const d =
        ts
        ?
        new Date(ts)
        :
        new Date();

    return d.toLocaleTimeString(
        [],
        {

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                true
        }
    );
}

/* DATE */

function formatDateSeparator(
    timestamp
) {

    const d =
        new Date(timestamp);

    const today =
        new Date();

    const yesterday =
        new Date();

    yesterday.setDate(
        today.getDate() - 1
    );

    if (
        d.toDateString() ===
        today.toDateString()
    ) {

        return "Today";
    }

    if (
        d.toDateString() ===
        yesterday.toDateString()
    ) {

        return "Yesterday";
    }

    return d.toLocaleDateString(
        [],
        {

            month:
                "short",

            day:
                "numeric",

            year:
                "numeric"
        }
    );
}

/* PUSH ID */

function getTimestampFromPushId(
    pushId
) {

    const chars =
        '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

    let time = 0;

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        time =
            time * 64 +
            chars.indexOf(
                pushId.charAt(i)
            );
    }

    return time;
}

/* TOAST */

window.showToast =
function (
    message,
    type = "success"
) {

    const container =
        document.getElementById(
            "toast-container"
        );

    if (
        !container
    ) return;

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast ${type}`;

    toast.innerText =
        message;

    container.appendChild(
        toast
    );

    setTimeout(
        () => {

            toast.remove();

        },
        3000
    );
};

/* ALERT */

window.alert =
function (
    msg
) {

    if (
        typeof msg ===
        "string" &&
        (
            msg.includes("Error") ||
            msg.includes("Failed")
        )
    ) {

        showToast(
            msg,
            "error"
        );

    } else {

        showToast(
            msg
        );
    }
};

/* CONFIRM */

window.showConfirm =
function (
    msg,
    callback
) {

    document.getElementById(
        "confirm-message"
    ).innerText =
        msg;

    document.getElementById(
        "confirm-modal"
    ).style.display =
        "flex";

    document.getElementById(
        "confirm-btn-yes"
    ).onclick =
        () => {

            closeConfirmModal();

            callback();
        };
};

window.closeConfirmModal =
function () {

    document.getElementById(
        "confirm-modal"
    ).style.display =
        "none";
};

/* SOUND */

window.playNotificationSound =
function () {

    if (
        !appSettings.receiveSound
    ) return;

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
            "sine";

        osc.frequency
            .setValueAtTime(
                700,
                ctx.currentTime
            );

        osc.frequency
            .exponentialRampToValueAtTime(
                1200,
                ctx.currentTime + 0.1
            );

        gain.gain
            .setValueAtTime(
                0,
                ctx.currentTime
            );

        gain.gain
            .linearRampToValueAtTime(
                0.1,
                ctx.currentTime + 0.05
            );

        gain.gain
            .linearRampToValueAtTime(
                0,
                ctx.currentTime + 0.2
            );

        osc.start();

        osc.stop(
            ctx.currentTime + 0.2
        );

    } catch (e) {}
};

window.playTikSound =
function () {

    if (
        !appSettings.messageSound
    ) return;

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
            "sine";

        osc.frequency
            .setValueAtTime(
                1500,
                ctx.currentTime
            );

        osc.frequency
            .exponentialRampToValueAtTime(
                500,
                ctx.currentTime + 0.05
            );

        gain.gain
            .setValueAtTime(
                0,
                ctx.currentTime
            );

        gain.gain
            .linearRampToValueAtTime(
                0.1,
                ctx.currentTime + 0.01
            );

        gain.gain
            .linearRampToValueAtTime(
                0,
                ctx.currentTime + 0.05
            );

        osc.start();

        osc.stop(
            ctx.currentTime + 0.05
        );

    } catch (e) {}
};

/* CLOUDINARY */

window.uploadToCloudinary =
function (
    file,
    preset = CLOUDINARY_UPLOAD_PRESET,
    onProgress = null
) {

    if (
        !file
    ) {

        return Promise.resolve(
            null
        );
    }

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    formData.append(
        "upload_preset",
        preset
    );

    let resourceType = "auto";
    if (file.type.startsWith("image/")) {
        resourceType = "image";
    } else if (file.type.startsWith("video/")) {
        resourceType = "video";
    }

    formData.append("resource_type", resourceType);

    const url = `${CLOUDINARY_BASE_URL}/${resourceType}/upload`;

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const xhr =
                new XMLHttpRequest();

            xhr.open(
                "POST",
                url
            );

            xhr.upload.onprogress =
                e => {

                    if (
                        e.lengthComputable &&
                        onProgress
                    ) {

                        const percent =
                            Math.round(
                                (
                                    e.loaded /
                                    e.total
                                ) * 100
                            );

                        onProgress(
                            percent
                        );
                    }
                };

            xhr.onload =
                () => {

                    if (
                        xhr.status >= 200 &&
                        xhr.status < 300
                    ) {

                        try {
                            const data =
                                JSON.parse(
                                    xhr.responseText
                                );
                            console.log("Cloudinary response:", data);
                            resolve(
                                data.secure_url
                            );
                        } catch (e) {
                            console.error("Failed to parse Cloudinary response:", xhr.responseText);
                            reject(e);
                        }

                    } else {

                        console.error("Upload failed, status:", xhr.status, "Response:", xhr.responseText);
                        reject(
                            new Error(
                                `Upload failed: ${xhr.status} ${xhr.responseText}`
                            )
                        );
                    }
                };

            xhr.onerror =
                () => {

                    reject(
                        new Error(
                            "Network error"
                        )
                    );
                };

            xhr.send(
                formData
            );
        }
    );
};

console.log(
    "System: Utilities Ready"
);

/* FIREBASE STORAGE */

window.uploadToFirebase = function(file, onProgress = null) {
    if (!file) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
        const filePath = `uploads/${Date.now()}_${file.name}`;
        const storageRef = storage.ref(filePath);
        const metadata = { contentType: file.type };
        const uploadTask = storageRef.put(file, metadata);

        uploadTask.on('state_changed', 
            (snapshot) => {
                if (onProgress) {
                    const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    onProgress(percent);
                }
            }, 
            (error) => {
                console.error("Firebase Upload Error:", error);
                reject(error);
            }, 
            () => {
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                    resolve(downloadURL);
                });
            }
        );
    });
};