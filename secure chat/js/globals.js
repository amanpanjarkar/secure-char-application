/* USER */

let myUid = "";

let myName = "";

let myEmail = "";

let myPic = "";

/* ACTIVE CHAT */

let activeRecipient = "";

let activeRecipientUid = "";

let currentChatRef = null;

/* MESSAGE */

let currentReplyTo = null;

let currentEditMessageId = null;

let typingTimeout = null;

let lastRenderedDate = null;

/* CALL */

let currentCallId = null;

let peerConnection = null;

let localStream = null;

let remoteStream = null;

let pendingIceCandidates = [];

/* STATUS */

let statusesByContact = {};

let currentStatusUser = null;

let currentStatusIndex = 0;

let statusTimer = null;

/* VOICE */

let mediaRecorder = null;

let audioChunks = [];

let isRecording = false;

/* SYSTEM */

let networkStatus = true;

let isSensitiveChatEnabled = false;

let chatClearedAtTimestamp = 0;

/* DEFAULT */

const defaultPic =
    "assets/icons/icon-192.png";

/* SETTINGS */

const appSettings =
    JSON.parse(

        localStorage.getItem(
            "secureChatSettings"
        ) ||

        JSON.stringify({

            messageSound: true,

            receiveSound: true,

            callSound: true,

            notifications: true
        })
    );

/* CACHE */

let loadedContacts = {};

console.log(
    "System: Globals Ready"
);