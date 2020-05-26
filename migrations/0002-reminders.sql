-- DROP TABLE IF EXISTS reminder_notifications;
-- DROP TYPE IF EXISTS reminder_types;

CREATE TYPE reminder_types AS ENUM ('recipient_1', 'recipient_2', 'recipient_expired', 'sender_expired', 'sender_1', 'sender_2', 'sender_broadcast_expired', 'recipient_broadcast_expired');

CREATE TABLE IF NOT EXISTS reminder_notifications
(
    id              SERIAL PRIMARY KEY,
    pub_key         CHAR(64) NOT NULL,
    reminder_type   reminder_types NOT NULL,
    send_at         timestamp,
    created_at      timestamp NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS reminder_notifications_index_id ON reminder_notifications (id);
CREATE INDEX IF NOT EXISTS reminder_notifications_index_pub_key ON reminder_notifications (pub_key);
