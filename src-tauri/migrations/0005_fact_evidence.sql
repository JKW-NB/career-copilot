CREATE TABLE fact_node_aliases (
 fact_id TEXT PRIMARY KEY REFERENCES facts(id),
 alias TEXT NOT NULL
) STRICT;
CREATE TABLE evidence_node_aliases (
 evidence_id TEXT PRIMARY KEY REFERENCES asset_evidence(id),
 alias TEXT NOT NULL
) STRICT;
CREATE TABLE fact_evidence_links (
 revision_id TEXT NOT NULL REFERENCES fact_revisions(id),
 evidence_id TEXT NOT NULL REFERENCES asset_evidence(id),
 locator TEXT NOT NULL,
 checked INTEGER NOT NULL CHECK(checked IN (0, 1)),
 PRIMARY KEY(revision_id, evidence_id)
) STRICT;
