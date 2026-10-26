ALTER TABLE ai_runs ADD COLUMN validated_output_json TEXT;
ALTER TABLE ai_runs ADD COLUMN target_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE ai_runs ADD COLUMN proposal_status TEXT NOT NULL DEFAULT 'NONE' CHECK(proposal_status IN ('NONE','PENDING','APPLIED','DISMISSED'));
ALTER TABLE ai_runs ADD COLUMN result_json TEXT;
