--DROP TABLE IF EXISTS push_tokens;

CREATE TYPE supported_platforms AS ENUM ('ios', 'android');

CREATE TABLE IF NOT EXISTS push_tokens
(
    id         SERIAL PRIMARY KEY,
    pub_key    CHAR(64) NOT NULL UNIQUE,
    token      CHAR(64) NOT NULL,
    platform   supported_platforms NOT NULL,
    updated_at timestamp
);

-- Indices
CREATE INDEX IF NOT EXISTS index_id ON push_tokens (id);
CREATE INDEX IF NOT EXISTS index_pub_key ON push_tokens (pub_key);
