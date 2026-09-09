CREATE TABLE _storage_metadata (
  key TEXT PRIMARY KEY NOT NULL CHECK (length(key) > 0),
  value TEXT NOT NULL
) STRICT;

INSERT INTO _storage_metadata (key, value)
VALUES ('workspace_id', lower(hex(randomblob(16))));
