
ALTER TABLE story_media ALTER COLUMN data DROP NOT NULL;
ALTER TABLE story_media ADD COLUMN path TEXT, ADD COLUMN variants JSONB;
CREATE TABLE media_uploads (
 id UUID PRIMARY KEY, name VARCHAR(200) NOT NULL, mime_type VARCHAR(40) NOT NULL,
 size INTEGER NOT NULL, sha256 VARCHAR(64) NOT NULL, purpose VARCHAR(30) NOT NULL,
 context_key VARCHAR(300) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'UPLOADING',
 attempts INTEGER NOT NULL DEFAULT 0, claim_token UUID, claimed_until TIMESTAMP(3),
 next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, error VARCHAR(40),
 output JSONB, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX media_uploads_status_next_attempt_at_idx ON media_uploads(status, next_attempt_at);
CREATE INDEX media_uploads_context_key_created_at_idx ON media_uploads(context_key, created_at);
CREATE TABLE media_worker_lock (id INTEGER PRIMARY KEY, token UUID, expires_at TIMESTAMP(3) NOT NULL);
INSERT INTO media_worker_lock VALUES (1, NULL, '1970-01-01');
CREATE TABLE browser_sessions (
 digest VARCHAR(43) PRIMARY KEY, public_id VARCHAR(43) UNIQUE NOT NULL, user_id UUID NOT NULL,
 payload JSONB NOT NULL, expires_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX browser_sessions_user_id_idx ON browser_sessions(user_id);
CREATE INDEX browser_sessions_expires_at_idx ON browser_sessions(expires_at);
CREATE TABLE rate_limit_buckets (key VARCHAR(160) PRIMARY KEY, count INTEGER NOT NULL, expires_at TIMESTAMP(3) NOT NULL);
CREATE INDEX rate_limit_buckets_expires_at_idx ON rate_limit_buckets(expires_at);
