const PushNotifications = require('node-pushnotifications');

let push_notifications;

const push_notifications_factory = () => {
    if (!push_notifications) {
        const production = process.env.NODE_ENV == "production";
        if (!production) {
            console.warn("*** Running in sandbox mode. If prod required use 'export NODE_ENV=production'")
        }

        push_notifications = new PushNotifications({
            apn: {
                token: {
                    key: `certs/${process.env.APPLE_CERT_NAME}`,
                    keyId: process.env.APPLE_KEY_ID,
                    teamId: process.env.APPLE_TEAM_ID,
                },
                production
            }
            //TODO Add config for google services
            //https://github.com/appfeel/node-pushnotifications#1-import-and-setup-push-module
        });
    }

    return push_notifications;
};

module.exports = push_notifications_factory;
