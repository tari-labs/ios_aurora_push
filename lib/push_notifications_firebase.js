const admin = require('firebase-admin');

// Firebase Admin SDK Initialization
const firebaseConfig = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle multiline env variables
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
    });
}

const sendPushNotification = async (deviceToken, payload) => {
    const { title,
        pushType = "alert",
        sound = "default",
        mutableContent = true,
        body,
        expiry,
        topic,
    } = payload;

    const message = {
        notification: { title, body },
        token: deviceToken,
        data: payload.data || {}, // Additional custom data
        android: {
            notification: { sound },
        },
        apns: {
            headers: {
                "apns-expiration": expiry ? String(expiry) : undefined,
                "apns-push-type": pushType || "alert", // Required for iOS 13+
            },
            payload: {
                aps: {
                    alert: { title, body },
                    sound,
                    mutableContent: mutableContent ? 1 : 0, // Required for Notification Service Extension
                },
            },
        },
        topic
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(`Notification sent successfully: ${response}`);
        return response;
    } catch (error) {
        console.error(`Error sending notification: ${error.message}`);
        throw error;
    }
};

module.exports = { sendPushNotification };
