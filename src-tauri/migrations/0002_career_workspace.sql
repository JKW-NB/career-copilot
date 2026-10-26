CREATE TABLE experiences (
 id TEXT PRIMARY KEY, organization TEXT NOT NULL, role TEXT NOT NULL DEFAULT '',
 summary TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','NEEDS_ATTENTION','READY','ARCHIVED')), created_at TEXT NOT NULL
) STRICT;
CREATE TABLE projects (
 id TEXT PRIMARY KEY, experience_id TEXT NOT NULL REFERENCES experiences(id),
 title TEXT NOT NULL, description TEXT NOT NULL
) STRICT;
CREATE TABLE contributions (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 title TEXT NOT NULL, summary TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','NEEDS_ATTENTION','READY','ARCHIVED'))
) STRICT;
CREATE TABLE facts (
 id TEXT PRIMARY KEY, contribution_id TEXT NOT NULL REFERENCES contributions(id),
 state TEXT NOT NULL CHECK(state IN ('ACTIVE','RETRACTED')),
 current_revision_id TEXT REFERENCES fact_revisions(id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE TABLE fact_revisions (
 id TEXT PRIMARY KEY, fact_id TEXT NOT NULL REFERENCES facts(id), revision_no INTEGER NOT NULL,
 content TEXT NOT NULL, verification_status TEXT NOT NULL CHECK(verification_status IN ('UNCERTAIN','USER_CONFIRMED')),
 risk_level TEXT NOT NULL CHECK(risk_level IN ('LOW','HIGH')), ownership_scope TEXT NOT NULL,
 review_metadata_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(fact_id,revision_no)
) STRICT;
CREATE TRIGGER immutable_fact_revision BEFORE UPDATE ON fact_revisions BEGIN SELECT RAISE(ABORT,'immutable revision'); END;
CREATE TRIGGER keep_fact_revision BEFORE DELETE ON fact_revisions BEGIN SELECT RAISE(ABORT,'immutable revision'); END;
CREATE TABLE jobs (
 id TEXT PRIMARY KEY, company TEXT NOT NULL, role_title TEXT NOT NULL, jd_current_text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL
) STRICT;
CREATE TABLE job_analysis_versions (
 id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), version_no INTEGER NOT NULL,
 jd_snapshot_text TEXT NOT NULL, proof_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(job_id,version_no)
) STRICT;
CREATE TABLE contribution_portfolios (
 id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id),
 job_analysis_version_id TEXT NOT NULL REFERENCES job_analysis_versions(id),
 version_no INTEGER NOT NULL, status TEXT NOT NULL CHECK(status='CONFIRMED'),
 snapshot_context_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(job_id,version_no)
) STRICT;
CREATE TABLE portfolio_items (
 id TEXT PRIMARY KEY, portfolio_id TEXT NOT NULL REFERENCES contribution_portfolios(id),
 contribution_id TEXT NOT NULL REFERENCES contributions(id), role TEXT NOT NULL CHECK(role IN ('CORE','SUPPORTING','RESERVE')),
 UNIQUE(portfolio_id,contribution_id)
) STRICT;
CREATE TABLE portfolio_item_fact_revisions (
 portfolio_item_id TEXT NOT NULL REFERENCES portfolio_items(id),
 fact_revision_id TEXT NOT NULL REFERENCES fact_revisions(id), PRIMARY KEY(portfolio_item_id,fact_revision_id)
) STRICT;
CREATE TABLE resume_content_versions (
 id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), portfolio_id TEXT NOT NULL REFERENCES contribution_portfolios(id),
 version_no INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('DRAFT','CONTENT_READY')),
 content_plan_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(job_id,version_no)
) STRICT;
CREATE TRIGGER immutable_resume BEFORE UPDATE ON resume_content_versions WHEN OLD.status='CONTENT_READY' BEGIN SELECT RAISE(ABORT,'immutable content'); END;
CREATE TRIGGER keep_resume BEFORE DELETE ON resume_content_versions BEGIN SELECT RAISE(ABORT,'immutable content'); END;
CREATE TRIGGER immutable_portfolio BEFORE UPDATE ON contribution_portfolios BEGIN SELECT RAISE(ABORT,'immutable portfolio'); END;
CREATE TABLE final_resume_files (
 id TEXT PRIMARY KEY, resume_content_version_id TEXT NOT NULL REFERENCES resume_content_versions(id),
 display_name TEXT NOT NULL, stored_path TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL,
 first_used_at TEXT, status TEXT NOT NULL CHECK(status IN ('FINAL','USED','ARCHIVED')), created_at TEXT NOT NULL
) STRICT;
CREATE TABLE applications (
 id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id),
 final_resume_file_id TEXT NOT NULL REFERENCES final_resume_files(id),
 channel TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('APPLIED','IN_PROCESS','ENDED','VOIDED')),
 note TEXT NOT NULL, applied_at TEXT NOT NULL
) STRICT;
CREATE TRIGGER application_binding BEFORE UPDATE OF job_id,final_resume_file_id ON applications BEGIN SELECT RAISE(ABORT,'immutable application binding'); END;
CREATE TRIGGER used_file_binding BEFORE UPDATE OF stored_path,sha256,resume_content_version_id ON final_resume_files
WHEN OLD.first_used_at IS NOT NULL BEGIN SELECT RAISE(ABORT,'used file frozen'); END;
CREATE TRIGGER used_file_delete BEFORE DELETE ON final_resume_files
WHEN OLD.first_used_at IS NOT NULL BEGIN SELECT RAISE(ABORT,'used file frozen'); END;
CREATE TABLE ai_runs (
 id TEXT PRIMARY KEY, task_type TEXT NOT NULL, model TEXT NOT NULL,
 input_hash TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
) STRICT;
