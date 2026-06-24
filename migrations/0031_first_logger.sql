ALTER TABLE albums ADD COLUMN first_logged_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN first_logs_count INTEGER NOT NULL DEFAULT 0;
