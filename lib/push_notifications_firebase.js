const admin = require('firebase-admin');
const debug = require('debug')('aurora_push:routes:send');

// Firebase Admin SDK Initialization
const firebaseConfig = {
    type: 'service_account',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig)
    });
}

const sendPushNotification = async (deviceToken, payload) => {
    const { title, pushType = 'alert', sound = 'default', body, expiry, topic } = payload;

    let message = {
        notification: { title, body },
        data: {},
        android: { notification: { sound } },
        apns: {
            headers: {
                'apns-expiration': expiry ? String(expiry) : undefined,
                'apns-push-type': pushType
            },
            payload: {
                aps: {
                    alert: { title, body },
                    sound,
                    mutableContent: 1
                }
            }
        }
    };

    if (topic) {
        message.topic = topic;
    } else if (deviceToken) {
        message.token = deviceToken;
    } else {
        throw new Error('You must provide either a deviceToken or a topic.');
    }

    try {
        const response = await admin.messaging().send(message);
        debug(`Notification sent successfully: ${response}`);
        return response;
    } catch (error) {
        debug(`Error sending notification: ${error.message}`);
        throw error;
    }
};

module.exports = { sendPushNotification };
