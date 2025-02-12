ALTER TABLE push_tokens
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS app_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS index_user_id ON push_tokens (user_id);
CREATE INDEX IF NOT EXISTS index_app_id ON push_tokens (app_id);
