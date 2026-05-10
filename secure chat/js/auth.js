/* REGISTER */

window.registerUser =
async function () {

    const username =
        cleanName(
            document.getElementById(
                "register-username"
            ).value.trim()
        );

    const email =
        document.getElementById(
            "register-email"
        ).value.trim();

    const password =
        document.getElementById(
            "register-password"
        ).value;

    // Clear previous errors
    document.getElementById("register-username").style.border = "";
    document.getElementById("register-email").style.border = "";
    document.getElementById("register-password").style.border = "";

    if (
        !username ||
        !email ||
        !password
    ) {

        showToast(
            "Fill all fields",
            "error"
        );

        if (!username) document.getElementById("register-username").style.border = "2px solid #f15c6d";
        if (!email) document.getElementById("register-email").style.border = "2px solid #f15c6d";
        if (!password) document.getElementById("register-password").style.border = "2px solid #f15c6d";

        return;
    }

    if (
        username.length < 3
    ) {

        showToast(
            "Username minimum 3 characters",
            "error"
        );

        document.getElementById("register-username").style.border = "2px solid #f15c6d";

        return;
    }

    if (
        password.length < 6
    ) {

        showToast(
            "Password minimum 6 characters",
            "error"
        );

        document.getElementById("register-password").style.border = "2px solid #f15c6d";

        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {

        showToast(
            "Invalid email format",
            "error"
        );

        document.getElementById("register-email").style.border = "2px solid #f15c6d";

        return;
    }

    try {

        // Show loading
        const registerBtn = document.querySelector("#register-card button");
        const originalText = registerBtn.innerText;
        registerBtn.innerText = "Creating...";
        registerBtn.disabled = true;

        /* USERNAME CHECK */

        const existing =
            await database
                .ref(
                    "usernames/" +
                    username
                )
                .once("value");

        if (
            existing.exists()
        ) {

            showToast(
                "Username already exists",
                "error"
            );

            document.getElementById("register-username").style.border = "2px solid #f15c6d";
            registerBtn.innerText = originalText;
            registerBtn.disabled = false;

            return;
        }

        /* CREATE ACCOUNT */

        const result =
            await auth
                .createUserWithEmailAndPassword(
                    email,
                    password
                );

        const uid =
            result.user.uid;

        /* USER DATA */

        const payload = {

            uid: uid,

            username:
                username,

            email: email,

            photo:
                "assets/icons/icon-192.png",

            bio:
                "Hey there! I am using Secure Chat.",

            status:
                "Online",

            typing: "",

            createdAt:
                firebase.database.ServerValue.TIMESTAMP,

            lastSeen:
                firebase.database.ServerValue.TIMESTAMP
        };

        /* SAVE USER */

        await database
            .ref(
                "users/" + uid
            )
            .set(payload);

        /* USERNAME MAP */

        await database
            .ref(
                "usernames/" +
                username
            )
            .set(uid);

        /* GLOBALS */

        myUid = uid;

        myName = username;

        myEmail = email;

        /* LOCAL */

        localStorage.setItem(
            "secureChatUid",
            uid
        );

        localStorage.setItem(
            "secureChatUsername",
            username
        );

        localStorage.setItem(
            "secureChatEmail",
            email
        );

        showToast(
            "Account created successfully"
        );

        document.getElementById(
            "auth-container"
        ).style.display =
            "none";

        document.getElementById(
            "chat-app"
        ).style.display =
            "flex";

        bootSystems();

    } catch (e) {

        console.error("Registration error:", e);

        let errorMessage = "Registration failed";

        if (e.code === "auth/email-already-in-use") {
            errorMessage = "Email already in use";
            document.getElementById("register-email").style.border = "2px solid #f15c6d";
        } else if (e.code === "auth/weak-password") {
            errorMessage = "Password too weak";
            document.getElementById("register-password").style.border = "2px solid #f15c6d";
        } else if (e.code === "auth/invalid-email") {
            errorMessage = "Invalid email";
            document.getElementById("register-email").style.border = "2px solid #f15c6d";
        }

        showToast(
            errorMessage,
            "error"
        );

        // Reset button
        const registerBtn = document.querySelector("#register-card button");
        registerBtn.innerText = "Create Account";
        registerBtn.disabled = false;

    }
};

/* LOGIN */

window.loginUser =
async function () {

    const email =
        document.getElementById(
            "login-email"
        ).value.trim();

    const password =
        document.getElementById(
            "login-password"
        ).value;

    // Clear previous errors
    document.getElementById("login-email").style.border = "";
    document.getElementById("login-password").style.border = "";

    if (
        !email ||
        !password
    ) {

        showToast(
            "Fill login fields",
            "error"
        );

        if (!email) document.getElementById("login-email").style.border = "2px solid #f15c6d";
        if (!password) document.getElementById("login-password").style.border = "2px solid #f15c6d";

        return;
    }

    try {

        // Show loading
        const loginBtn = document.querySelector("#login-card button:first-of-type");
        const originalText = loginBtn.innerText;
        loginBtn.innerText = "Logging in...";
        loginBtn.disabled = true;

        const result =
            await auth
                .signInWithEmailAndPassword(
                    email,
                    password
                );

        const uid =
            result.user.uid;

        const snap =
            await database
                .ref(
                    "users/" + uid
                )
                .once("value");

        if (
            !snap.exists()
        ) {

            showToast(
                "Profile missing",
                "error"
            );

            loginBtn.innerText = originalText;
            loginBtn.disabled = false;

            return;
        }

        const user =
            snap.val();

        myUid = uid;

        myName =
            user.username;

        myEmail =
            user.email;

        /* LOCAL */

        localStorage.setItem(
            "secureChatUid",
            uid
        );

        localStorage.setItem(
            "secureChatUsername",
            user.username
        );

        localStorage.setItem(
            "secureChatEmail",
            user.email
        );

        /* ONLINE */

        await database
            .ref(
                "users/" + uid
            )
            .update({

                status:
                    "Online",

                lastSeen:
                    firebase.database.ServerValue.TIMESTAMP
            });

        document.getElementById(
            "auth-container"
        ).style.display =
            "none";

        document.getElementById(
            "chat-app"
        ).style.display =
            "flex";

        showToast(
            "Login successful"
        );

        bootSystems();

    } catch (e) {

        console.error("Login error:", e);

        let errorMessage = "Login failed";

        if (e.code === "auth/user-not-found") {
            errorMessage = "User not found";
            document.getElementById("login-email").style.border = "2px solid #f15c6d";
        } else if (e.code === "auth/wrong-password") {
            errorMessage = "Wrong password";
            document.getElementById("login-password").style.border = "2px solid #f15c6d";
        } else if (e.code === "auth/invalid-email") {
            errorMessage = "Invalid email";
            document.getElementById("login-email").style.border = "2px solid #f15c6d";
        } else if (e.code === "auth/too-many-requests") {
            errorMessage = "Too many failed attempts. Try again later.";
        }

        showToast(
            errorMessage,
            "error"
        );

        // Reset button
        const loginBtn = document.querySelector("#login-card button:first-of-type");
        loginBtn.innerText = "Login";
        loginBtn.disabled = false;

    }
};

/* AUTO LOGIN */

/* AUTH STATE */

auth.onAuthStateChanged(
    async user => {

        if (!user) {

            return;
        }

        try {

            const uid =
                user.uid;

            const snap =
                await database
                    .ref(
                        "users/" + uid
                    )
                    .once("value");

            if (
                !snap.exists()
            ) {

                return;
            }

            const data =
                snap.val();

            myUid =
                uid;

            myName =
                data.username;

            myEmail =
                data.email;

            /* ONLINE */

            const ref =
                database.ref(
                    "users/" + uid
                );

            await ref.update({

                status:
                    "Online",

                lastSeen:
                    firebase.database.ServerValue.TIMESTAMP
            });

            ref.onDisconnect()
                .update({

                    status:
                        "Offline",

                    lastSeen:
                        firebase.database.ServerValue.TIMESTAMP
                });

            document.getElementById(
                "auth-container"
            ).style.display =
                "none";

            document.getElementById(
                "chat-app"
            ).style.display =
                "flex";

            bootSystems();

        } catch (e) {

            console.error(e);
        }
    }
);

/* LOGOUT */

window.logoutUser =
async function () {

    try {

        await database
            .ref(
                "users/" + myUid
            )
            .update({

                status:
                    "Offline",

                lastSeen:
                    firebase.database.ServerValue.TIMESTAMP
            });

        await auth.signOut();

    } catch (e) {

        console.error(e);
    }

    localStorage.clear();

    location.reload();
};

/* CHANGE PASSWORD */

window.changePassword =
async function (
    newPassword
) {

    // If called without parameter, prompt for password
    if (!newPassword) {

        newPassword = prompt("Enter new password (minimum 6 characters):");

        if (!newPassword) return;
    }

    if (
        !newPassword ||
        newPassword.length < 6
    ) {

        showToast(
            "Minimum 6 characters",
            "error"
        );

        return;
    }

    try {

        await auth.currentUser
            .updatePassword(
                newPassword
            );

        showToast(
            "Password changed successfully"
        );

        // Close settings menu if open
        const settingsMenu = document.getElementById("settings-menu");
        if (settingsMenu) {
            settingsMenu.style.display = "none";
        }

    } catch (e) {

        console.error(e);

        showToast(
            e.message,
            "error"
        );
    }
};

window.changeUsername = async function() {
    const newUsername = prompt("Enter new username:");
    if (!newUsername || newUsername.trim().length < 3) {
        showToast("Username must be at least 3 characters", "error");
        return;
    }

    const clean = cleanName(newUsername.trim());
    
    try {
        // Check if username taken
        const existing = await database.ref("usernames/" + clean).once("value");
        if (existing.exists()) {
            showToast("Username already taken", "error");
            return;
        }

        // Remove old username record
        await database.ref("usernames/" + myName).remove();
        
        // Update user profile
        await database.ref("users/" + myUid).update({
            username: clean
        });

        // Set new username record
        await database.ref("usernames/" + clean).set(myUid);

        myName = clean;
        localStorage.setItem("secureChatUsername", clean);
        
        showToast("Username updated successfully");
        
        // Close settings menu
        document.getElementById("settings-menu").style.display = "none";
    } catch (e) {
        console.error(e);
        showToast("Failed to update username", "error");
    }
};

console.log(
    "System: Auth Ready"
);