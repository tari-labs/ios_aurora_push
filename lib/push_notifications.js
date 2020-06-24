const PushNotifications = require('node-pushnotifications');

const token = {
    key: `certs/${process.env.APPLE_CERT_NAME}`,
    keyId: process.env.APPLE_KEY_ID,
    teamId: process.env.APPLE_TEAM_ID
};

let push_notifications;
let sandbox_push_notifications;

const push_notifications_factory = () => {
    if (!push_notifications) {
        push_notifications = new PushNotifications({
            apn: {
                token,
                production: true
            }
            //TODO Add config for google services
            //https://github.com/appfeel/node-pushnotifications#1-import-and-setup-push-module
        });
    }

    return push_notifications;
};

const sandbox_push_notifications_factory = () => {
    if (!sandbox_push_notifications) {
        sandbox_push_notifications = new PushNotifications({
            apn: {
                token,
                production: false
            }
            //TODO Add config for google services
            //https://github.com/appfeel/node-pushnotifications#1-import-and-setup-push-module
        });
    }

    return sandbox_push_notifications;
};

module.exports = { push_notifications_factory, sandbox_push_notifications_factory };
