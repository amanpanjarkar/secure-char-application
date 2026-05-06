const firebaseConfig = {
    apiKey: "AIzaSyCVzy4vBaVosB2cWP3bSjFl4QeqjaLSIKg",
    authDomain: "chat-ce4e3.firebaseapp.com",
    databaseURL: "https://chat-ce4e3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "chat-ce4e3",
    storageBucket: "chat-ce4e3.firebasestorage.app",
    messagingSenderId: "379406222022",
    appId: "1:379406222022:web:0dced9906e6848a12d4dc7"
};

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dnn5psjx6/image/upload";
const CLOUDINARY_PRESET = "secure_chat";

if (!firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("System: Firebase initialized successfully.");
    } catch (e) {
        console.error("System: Critical Firebase Init Error", e);
    }
}

const auth = firebase.auth();
const database = firebase.database();
