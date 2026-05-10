/* FIREBASE */

const firebaseConfig = {
  apiKey: "AIzaSyCVzy4vBaVosB2cWP3bSjFl4QeqjaLSIKg",
  authDomain: "chat-ce4e3.firebaseapp.com",
  databaseURL: "https://chat-ce4e3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-ce4e3",
  storageBucket: "chat-ce4e3.firebasestorage.app",
  messagingSenderId: "379406222022",
  appId: "1:379406222022:web:0dced9906e6848a12d4dc7",
  measurementId: "G-W174W1L1CJ"
};

/* INIT */

if (
    !firebase.apps.length
) {

    firebase.initializeApp(
        firebaseConfig
    );
}

const auth =
    firebase.auth();

const database =
    firebase.database();

const storage =
    firebase.storage();

/* CLOUDINARY */

const CLOUDINARY_CLOUD_NAME =
    "dnn5psjx6";

const CLOUDINARY_UPLOAD_PRESET =
    "secure_chat";

const CLOUDINARY_BASE_URL =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;

/* RTC */

const rtcConfiguration = {

    iceServers: [

        {

            urls: [
                "stun:stun.l.google.com:19302"
            ]
        },

        {

            urls: [
                "turn:openrelay.metered.ca:80"
            ],

            username:
                "openrelayproject",

            credential:
                "openrelayproject"
        }
    ]
};

console.log(
    "System: Config Loaded"
);