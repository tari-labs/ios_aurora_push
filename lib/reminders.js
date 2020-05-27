const debug = require('debug')('aurora_push:reminders');
const db = require('./database');
const push_notifications = require("./push_notifications")();

const FIRST_REMINDER_HOURS_FROM_NOW = 0.05; // 24;
const SECOND_REMINDER_HOURS_FROM_NOW = 0.1;
const EXPIRED_AFTER_HOURS = 0.15;
const IGNORE_OLDER_THAN_HOURS = 2;
const EXPIRE_PUSH_AFTER_HOURS = process.env.EXPIRE_PUSH_AFTER_HOURS || 2

//reminder_types enum in reminder_notifications table
const REMINDER_TYPES = {
    //When a sender initiates a tx but a recipient has not opened the app to receive
    recipient_1: {
        hours_from_now: FIRST_REMINDER_HOURS_FROM_NOW,
        title: "recipient_1",
        body: "recipient_1",
        enabled: true
    },
    recipient_2: {
        hours_from_now: SECOND_REMINDER_HOURS_FROM_NOW,
        title: "recipient_2",
        body: "recipient_2",
        enabled: true
    },
    //When a sender initiates a tx but it was cancelled because a recipient did not open the app in time
    recipient_expired: {
        hours_from_now: EXPIRED_AFTER_HOURS,
        title: "recipient_expired",
        body: "recipient_expired",
        enabled: true
    },
    sender_expired: {
        hours_from_now: EXPIRED_AFTER_HOURS,
        title: "sender_expired",
        body: "sender_expired",
        enabled: true
    },

    //Reminders for when a recipient has received the tx but sender still needs to complete and broadcast
    sender_1: {
        hours_from_now: FIRST_REMINDER_HOURS_FROM_NOW,
        title: "sender_1",
        body: "sender_1",
        enabled: true
    },
    sender_2: {
        hours_from_now: SECOND_REMINDER_HOURS_FROM_NOW,
        title: "sender_2",
        body: "sender_2",
        enabled: true
    },
    //Reminders for when a recipient has received the tx but sender still needs to complete and broadcast
    sender_broadcast_expired: {
        hours_from_now: EXPIRED_AFTER_HOURS,
        title: "sender_broadcast_expired",
        body: "sender_broadcast_expired",
        enabled: true
    },
    recipient_broadcast_expired: {
        hours_from_now: EXPIRED_AFTER_HOURS,
        title: "recipient_broadcast_expired",
        body: "recipient_broadcast_expired",
        enabled: true
    }
};

Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000));
    return this;
};

/**
 * Triggered by sender.
 * Schedules all future reminders for a recipient to open the app to accept tXTR
 * and reminders remain queued until cancelled (after app does a base node sync)
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 * @throws
 */
async function schedule_reminders_for_recipient(recipient_pub_key, sender_pub_key) {
    try {
        await db.schedule_reminder(recipient_pub_key, "recipient_1", (new Date()).addHours(REMINDER_TYPES.recipient_1.hours_from_now));
        await db.schedule_reminder(recipient_pub_key, "recipient_2", (new Date()).addHours(REMINDER_TYPES.recipient_2.hours_from_now));
        await db.schedule_reminder(recipient_pub_key, "recipient_expired", (new Date()).addHours(REMINDER_TYPES.recipient_expired.hours_from_now));
        await db.schedule_reminder(sender_pub_key, "sender_expired", (new Date()).addHours(REMINDER_TYPES.sender_expired.hours_from_now));
    } catch (error) {
        console.error("Error scheduling a reminder for recipient");
        console.error(error);
        throw error
    }

    return true;
}

/**
 * Triggered by recipient.
 * Schedules all future reminders for a sender to open the app to broadcast the tx.
 * @param pub_key
 * @returns {PromiseLike<boolean> | Promise<boolean>}
 */
async function schedule_reminders_for_sender(recipient_pub_key, sender_pub_key) {
    try {
        await db.schedule_reminder(sender_pub_key, "sender_1", (new Date()).addHours(REMINDER_TYPES.sender_1.hours_from_now));
        await db.schedule_reminder(sender_pub_key, "sender_2", (new Date()).addHours(REMINDER_TYPES.sender_2.hours_from_now));
        await db.schedule_reminder(sender_pub_key, "sender_broadcast_expired", (new Date()).addHours(REMINDER_TYPES.sender_broadcast_expired.hours_from_now));
        await db.schedule_reminder(recipient_pub_key, "recipient_broadcast_expired", (new Date()).addHours(REMINDER_TYPES.recipient_broadcast_expired.hours_from_now));
    } catch (error) {
        console.error("Error scheduling a reminder for recipient");
        console.error(error);
        throw error
    }

    return true;
}

async function process_reminders() {
    const rows = await db.list_reminders(new Date());

    let sent_count = 0;

    for (let index = 0; index < rows.length; index++) {
        const { id, pub_key, reminder_type, send_at } = rows[index];

        //Make sure the reminder isn't stale
        const hoursPastScheduledTime = (new Date() - new Date(send_at).getTime()) / 1000 / 60 / 60;
        if (hoursPastScheduledTime > IGNORE_OLDER_THAN_HOURS) {
            console.warn(`Not sending notification older than ${IGNORE_OLDER_THAN_HOURS}.`);
            await db.delete_reminder(id);
            continue
        }

        let device_token;
        try {
            const tokenRow = await db.get_user_token(pub_key);
            if (!tokenRow) {
                console.error(`No token exists for pub_key ${pub_key}`);
                continue;
            }
            device_token = tokenRow.token;
        } catch {
            console.error(`Failed to get device token for pub_key ${pub_key}`);
            continue;
        }

        const expiry = Math.floor(Date.now() / 1000) + (60 * 60 * EXPIRE_PUSH_AFTER_HOURS);

        const payload = {
            title: REMINDER_TYPES[reminder_type].title,
            topic: 'com.tari.wallet',
            body: REMINDER_TYPES[reminder_type].body,
            badge: 1,
            pushType: "alert",
            sound: 'ping.aiff',
            expiry
        };

        //TODO check if this type is enabled

        try {
            const sendResult = await push_notifications.send(device_token, payload);
            if (sendResult[0].success) {
                sent_count ++;
                await db.delete_reminder(id);
            } else {
                console.error("Failed to send push notification.")
                continue;
            }
        } catch (error) {
            console.error(error);
            continue;
        }
    }

    return {found_count: rows.length, sent_count}
}

//TODO allow recipients to schedule sender reminders once receieved

module.exports = {
    schedule_reminders_for_recipient,
    schedule_reminders_for_sender,
    process_reminders
};
