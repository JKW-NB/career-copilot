CREATE TABLE asset_evidence (
 id TEXT PRIMARY KEY,
 contribution_id TEXT NOT NULL REFERENCES contributions(id),
 display_name TEXT NOT NULL,
 stored_path TEXT NOT NULL UNIQUE,
 sha256 TEXT NOT NULL,
 size_bytes INTEGER NOT NULL CHECK(size_bytes BETWEEN 1 AND 15728640),
 created_at TEXT NOT NULL,
 UNIQUE(contribution_id, sha256)
) STRICT;
