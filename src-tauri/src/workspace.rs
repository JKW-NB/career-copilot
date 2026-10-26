//! User-owned workspace. All writes validate current database state inside a transaction.
use crate::storage::{ManagedFileArea, Storage};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[derive(Debug, Serialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
}
pub type AppResult<T> = Result<T, AppError>;
pub fn fail(code: &str, message: &str) -> AppError {
    AppError {
        code: code.into(),
        message: message.into(),
    }
}
impl From<rusqlite::Error> for AppError {
    fn from(_: rusqlite::Error) -> Self {
        fail(
            "STORAGE_FAILURE",
            "本地数据操作失败，请重试；原有数据保留。",
        )
    }
}
impl From<crate::storage::StorageError> for AppError {
    fn from(_: crate::storage::StorageError) -> Self {
        fail("STORAGE_FAILURE", "文件或数据库不可用，请检查数据目录。")
    }
}
impl From<serde_json::Error> for AppError {
    fn from(_: serde_json::Error) -> Self {
        fail("INVALID_DATA", "数据格式不符合要求。")
    }
}
#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum Action {
    AddAsset {
        organization: String,
        role: String,
        title: String,
        summary: String,
    },
    AddFact {
        contribution_id: String,
        content: String,
        ownership: String,
    },
    ReviewFact {
        fact_id: String,
        expected_revision_id: String,
        confirmed: bool,
        risk_acknowledged: bool,
    },
    ReviseFact {
        fact_id: String,
        expected_revision_id: String,
        content: String,
        ownership: String,
    },
    RetractFact {
        fact_id: String,
        expected_revision_id: String,
    },
    ArchiveAsset {
        contribution_id: String,
    },
    AddJob {
        company: String,
        role_title: String,
        jd: String,
    },
    SaveAnalysis {
        job_id: String,
        expected_jd: String,
        requirements: Vec<String>,
    },
    ConfirmPortfolio {
        job_id: String,
        analysis_id: String,
        revision_ids: Vec<String>,
    },
    CompileResume {
        portfolio_id: String,
        name: String,
        contact: String,
        education: String,
    },
    MarkReady {
        resume_id: String,
    },
    RecordApplication {
        file_id: String,
        channel: String,
        note: String,
    },
    UpdateApplication {
        application_id: String,
        status: String,
        note: String,
    },
}
fn text(value: &str, max: usize) -> AppResult<&str> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > max {
        return Err(fail(
            "INVALID_INPUT",
            "请填写有效内容，并控制在允许长度内。",
        ));
    }
    Ok(value)
}
pub fn id(db: &Connection) -> AppResult<String> {
    Ok(db.query_row("SELECT lower(hex(randomblob(16)))", [], |r| r.get(0))?)
}
fn now(db: &Connection) -> AppResult<String> {
    Ok(
        db.query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now')", [], |r| {
            r.get(0)
        })?,
    )
}
fn exists(db: &Connection, sql: &str, value: &str) -> AppResult<()> {
    if !db.query_row(sql, [value], |r| r.get::<_, bool>(0))? {
        return Err(fail("NOT_FOUND", "目标不存在或已归档，请刷新工作区。"));
    }
    Ok(())
}
pub fn risk(content: &str, ownership: &str) -> &'static str {
    if content.chars().any(|c| c.is_numeric())
        || content.contains('%')
        || content.contains("主导")
        || content.contains("独立")
        || matches!(ownership, "LEAD" | "INDEPENDENT" | "CORE_CONTRIBUTOR")
    {
        "HIGH"
    } else {
        "LOW"
    }
}
fn ownership(value: &str) -> AppResult<()> {
    if ![
        "INDEPENDENT",
        "LEAD",
        "CORE_CONTRIBUTOR",
        "CONTRIBUTOR",
        "TEAM_RESULT",
        "UNKNOWN",
    ]
    .contains(&value)
    {
        return Err(fail("INVALID_INPUT", "请选择有效的个人职责范围。"));
    }
    Ok(())
}
fn revision(
    db: &Connection,
    fact: &str,
    content: &str,
    owner: &str,
    verified: bool,
    review: Value,
) -> AppResult<String> {
    let rev = id(db)?;
    let timestamp = now(db)?;
    let number: i64 = db.query_row(
        "SELECT coalesce(max(revision_no),0)+1 FROM fact_revisions WHERE fact_id=?1",
        [fact],
        |r| r.get(0),
    )?;
    db.execute(
        "INSERT INTO fact_revisions VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![
            rev,
            fact,
            number,
            content,
            if verified {
                "USER_CONFIRMED"
            } else {
                "UNCERTAIN"
            },
            risk(content, owner),
            owner,
            review.to_string(),
            timestamp
        ],
    )?;
    db.execute(
        "UPDATE facts SET current_revision_id=?1 WHERE id=?2",
        params![rev, fact],
    )?;
    Ok(rev)
}
fn current_fact(db: &Connection, fact: &str, expected: &str) -> AppResult<(String, String)> {
    let row=db.query_row("SELECT f.current_revision_id,r.content,r.ownership_scope FROM facts f JOIN fact_revisions r ON r.id=f.current_revision_id JOIN contributions c ON c.id=f.contribution_id WHERE f.id=?1 AND f.state='ACTIVE' AND c.status!='ARCHIVED'",[fact],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?))).optional()?;
    let (rev, content, owner) =
        row.ok_or_else(|| fail("NOT_FOUND", "事实不存在、已撤回或所属资产已归档。"))?;
    if rev != expected {
        return Err(fail("STALE_INPUT", "事实已经变化，请刷新后重新确认。"));
    }
    Ok((content, owner))
}
fn allowed(db: &Connection, rev: &str) -> AppResult<()> {
    let ok:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM fact_revisions r JOIN facts f ON f.id=r.fact_id JOIN contributions c ON c.id=f.contribution_id WHERE r.id=?1 AND f.current_revision_id=r.id AND f.state='ACTIVE' AND c.status!='ARCHIVED' AND r.verification_status='USER_CONFIRMED')",[rev],|r|r.get(0))?;
    if !ok {
        return Err(fail(
            "FACT_REVIEW_REQUIRED",
            "包含未确认、已修订或撤回的事实，请重新审查并选择。",
        ));
    }
    Ok(())
}
pub fn execute(storage: &Storage, action: Action) -> AppResult<Value> {
    let mut db = storage.connection()?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let result = execute_in_transaction(storage, &tx, action)?;
    tx.commit()?;
    Ok(result)
}

pub(crate) fn execute_in_transaction(
    storage: &Storage,
    tx: &rusqlite::Transaction<'_>,
    action: Action,
) -> AppResult<Value> {
    let result = match action {
        Action::AddAsset {
            organization,
            role,
            title,
            summary,
        } => {
            let org = text(&organization, 200)?;
            let title = text(&title, 200)?;
            let summary = text(&summary, 12000)?;
            if role.chars().count() > 200 {
                return Err(fail("INVALID_INPUT", "职位名称过长。"));
            }
            let exp = id(&tx)?;
            let project = id(&tx)?;
            let contribution = id(&tx)?;
            let time = now(&tx)?;
            tx.execute(
                "INSERT INTO experiences VALUES (?1,?2,?3,?4,'DRAFT',?5)",
                params![exp, org, role.trim(), summary, time],
            )?;
            tx.execute(
                "INSERT INTO projects VALUES (?1,?2,?3,?4)",
                params![project, exp, title, summary],
            )?;
            tx.execute(
                "INSERT INTO contributions VALUES (?1,?2,?3,?4,'DRAFT')",
                params![contribution, project, title, summary],
            )?;
            json!({"id":contribution})
        }
        Action::AddFact {
            contribution_id,
            content,
            ownership: owner,
        } => {
            let content = text(&content, 4000)?;
            ownership(&owner)?;
            exists(
                &tx,
                "SELECT EXISTS(SELECT 1 FROM contributions WHERE id=?1 AND status!='ARCHIVED')",
                &contribution_id,
            )?;
            let fact = id(&tx)?;
            tx.execute(
                "INSERT INTO facts VALUES (?1,?2,'ACTIVE',NULL)",
                params![fact, contribution_id],
            )?;
            let rev = revision(&tx, &fact, content, &owner, false, json!({}))?;
            json!({"id":fact,"revisionId":rev})
        }
        Action::ReviewFact {
            fact_id,
            expected_revision_id,
            confirmed,
            risk_acknowledged,
        } => {
            let (content, owner) = current_fact(&tx, &fact_id, &expected_revision_id)?;
            if !confirmed {
                return Err(fail(
                    "CONFIRMATION_REQUIRED",
                    "请明确确认该事实是你真实经历的准确表达。",
                ));
            }
            if risk(&content, &owner) == "HIGH" && !risk_acknowledged {
                return Err(fail(
                    "RISK_REVIEW_REQUIRED",
                    "涉及数字或职责范围，请单独核实后确认。",
                ));
            }
            let rev = revision(
                &tx,
                &fact_id,
                &content,
                &owner,
                true,
                json!({"source":"USER_CONFIRMATION","highRiskReviewed":risk_acknowledged,"confirmedAt":now(&tx)?}),
            )?;
            json!({"revisionId":rev})
        }
        Action::ReviseFact {
            fact_id,
            expected_revision_id,
            content,
            ownership: owner,
        } => {
            current_fact(&tx, &fact_id, &expected_revision_id)?;
            let content = text(&content, 4000)?;
            ownership(&owner)?;
            json!({"revisionId":revision(&tx,&fact_id,content,&owner,false,json!({}))?})
        }
        Action::RetractFact {
            fact_id,
            expected_revision_id,
        } => {
            current_fact(&tx, &fact_id, &expected_revision_id)?;
            tx.execute("UPDATE facts SET state='RETRACTED' WHERE id=?1", [fact_id])?;
            json!({})
        }
        Action::ArchiveAsset { contribution_id } => {
            exists(
                &tx,
                "SELECT EXISTS(SELECT 1 FROM contributions WHERE id=?1 AND status!='ARCHIVED')",
                &contribution_id,
            )?;
            tx.execute(
                "UPDATE contributions SET status='ARCHIVED' WHERE id=?1",
                [contribution_id],
            )?;
            json!({})
        }
        Action::AddJob {
            company,
            role_title,
            jd,
        } => {
            let company = text(&company, 200)?;
            let role_title = text(&role_title, 200)?;
            let jd = text(&jd, 40000)?;
            let job = id(&tx)?;
            tx.execute(
                "INSERT INTO jobs VALUES (?1,?2,?3,?4,'ACTIVE',?5)",
                params![job, company, role_title, jd, now(&tx)?],
            )?;
            json!({"id":job})
        }
        Action::SaveAnalysis {
            job_id,
            expected_jd,
            requirements,
        } => {
            let jd: String = tx
                .query_row(
                    "SELECT jd_current_text FROM jobs WHERE id=?1",
                    [&job_id],
                    |r| r.get(0),
                )
                .optional()?
                .ok_or_else(|| fail("NOT_FOUND", "岗位不存在。"))?;
            if jd != expected_jd {
                return Err(fail("STALE_INPUT", "岗位原文已变化，请重新分析。"));
            }
            if !(1..=8).contains(&requirements.len()) {
                return Err(fail("INVALID_INPUT", "请保留 1–8 项能力要求。"));
            }
            let requirements: Vec<String> = requirements
                .iter()
                .map(|s| text(s, 2000).map(str::to_owned))
                .collect::<AppResult<_>>()?;
            let analysis = id(&tx)?;
            tx.execute("INSERT INTO job_analysis_versions SELECT ?1,?2,coalesce(max(version_no),0)+1,?3,?4,?5 FROM job_analysis_versions WHERE job_id=?2",params![analysis,job_id,jd,serde_json::to_string(&requirements)?,now(&tx)?])?;
            json!({"id":analysis})
        }
        Action::ConfirmPortfolio {
            job_id,
            analysis_id,
            revision_ids,
        } => {
            if revision_ids.is_empty() || revision_ids.len() > 50 {
                return Err(fail("INVALID_INPUT", "请选择 1–50 条已确认事实。"));
            }
            let unique: std::collections::HashSet<_> = revision_ids.iter().collect();
            if unique.len() != revision_ids.len() {
                return Err(fail("INVALID_INPUT", "不能重复选择事实。"));
            }
            exists(
                &tx,
                "SELECT EXISTS(SELECT 1 FROM job_analysis_versions WHERE id=?1)",
                &analysis_id,
            )?;
            let analysis_job: String = tx.query_row(
                "SELECT job_id FROM job_analysis_versions WHERE id=?1",
                [&analysis_id],
                |r| r.get(0),
            )?;
            if analysis_job != job_id {
                return Err(fail("SCOPE_MISMATCH", "分析不属于当前岗位。"));
            }
            for rev in &revision_ids {
                allowed(&tx, rev)?;
            }
            let portfolio = id(&tx)?;
            tx.execute("INSERT INTO contribution_portfolios SELECT ?1,?2,?3,coalesce(max(version_no),0)+1,'CONFIRMED',?4,?5 FROM contribution_portfolios WHERE job_id=?2",params![portfolio,job_id,analysis_id,json!({"revisionIds":revision_ids}).to_string(),now(&tx)?])?;
            for rev in &revision_ids {
                let contribution: String = tx.query_row("SELECT f.contribution_id FROM fact_revisions r JOIN facts f ON f.id=r.fact_id WHERE r.id=?1", [rev], |row| row.get(0))?;
                let item: Option<String> = tx.query_row("SELECT id FROM portfolio_items WHERE portfolio_id=?1 AND contribution_id=?2", params![portfolio,contribution], |row|row.get(0)).optional()?;
                let item = match item {
                    Some(item) => item,
                    None => {
                        let item = id(&tx)?;
                        tx.execute(
                            "INSERT INTO portfolio_items VALUES (?1,?2,?3,'CORE')",
                            params![item, portfolio, contribution],
                        )?;
                        item
                    }
                };
                tx.execute(
                    "INSERT INTO portfolio_item_fact_revisions VALUES (?1,?2)",
                    params![item, rev],
                )?;
            }
            json!({"id":portfolio})
        }
        Action::CompileResume {
            portfolio_id,
            name,
            contact,
            education,
        } => {
            let name = text(&name, 100)?;
            let contact = text(&contact, 500)?;
            if education.chars().count() > 4000 {
                return Err(fail("INVALID_INPUT", "教育信息过长。"));
            }
            let job: String = tx
                .query_row(
                    "SELECT job_id FROM contribution_portfolios WHERE id=?1",
                    [&portfolio_id],
                    |r| r.get(0),
                )
                .optional()?
                .ok_or_else(|| fail("NOT_FOUND", "请先确认贡献组合。"))?;
            let mut stmt=tx.prepare("SELECT r.id,r.content,c.title,e.organization,e.role FROM portfolio_item_fact_revisions l JOIN portfolio_items pi ON pi.id=l.portfolio_item_id JOIN fact_revisions r ON r.id=l.fact_revision_id JOIN facts f ON f.id=r.fact_id JOIN contributions c ON c.id=f.contribution_id JOIN projects p ON p.id=c.project_id JOIN experiences e ON e.id=p.experience_id WHERE pi.portfolio_id=?1 ORDER BY e.created_at,c.id,r.revision_no,r.id")?;
            let rows = stmt
                .query_map([&portfolio_id], |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, String>(1)?,
                        r.get::<_, String>(2)?,
                        r.get::<_, String>(3)?,
                        r.get::<_, String>(4)?,
                    ))
                })?
                .collect::<Result<Vec<_>, _>>()?;
            let mut items = Vec::new();
            for (rev, content, title, org, role) in rows {
                allowed(&tx, &rev)?;
                items.push(json!({"revisionId":rev,"text":content,"title":title,"organization":org,"role":role}));
            }
            if items.is_empty() {
                return Err(fail("FACT_REVIEW_REQUIRED", "组合中没有可用事实。"));
            }
            let content = id(&tx)?;
            let plan =
                json!({"name":name,"contact":contact,"education":education.trim(),"items":items});
            tx.execute("INSERT INTO resume_content_versions SELECT ?1,?2,?3,coalesce(max(version_no),0)+1,'DRAFT',?4,?5 FROM resume_content_versions WHERE job_id=?2",params![content,job,portfolio_id,plan.to_string(),now(&tx)?])?;
            json!({"id":content})
        }
        Action::MarkReady { resume_id } => {
            let row: Option<(String, String)> = tx
                .query_row(
                    "SELECT status,content_plan_json FROM resume_content_versions WHERE id=?1",
                    [&resume_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .optional()?;
            let (status, plan) = row.ok_or_else(|| fail("NOT_FOUND", "内容版本不存在。"))?;
            if status != "CONTENT_READY" {
                let plan: Value = serde_json::from_str(&plan)?;
                let items = plan["items"]
                    .as_array()
                    .ok_or_else(|| fail("INVALID_DATA", "内容缺少来源事实。"))?;
                for item in items {
                    allowed(
                        &tx,
                        item["revisionId"]
                            .as_str()
                            .ok_or_else(|| fail("INVALID_DATA", "内容缺少来源引用。"))?,
                    )?;
                }
                tx.execute(
                    "UPDATE resume_content_versions SET status='CONTENT_READY' WHERE id=?1",
                    [&resume_id],
                )?;
            }
            json!({"id":resume_id})
        }
        Action::RecordApplication {
            file_id,
            channel,
            note,
        } => {
            let channel = text(&channel, 200)?;
            if note.chars().count() > 4000 {
                return Err(fail("INVALID_INPUT", "备注过长。"));
            }
            let (job,path,hash):(String,String,String)=tx.query_row("SELECT r.job_id,f.stored_path,f.sha256 FROM final_resume_files f JOIN resume_content_versions r ON r.id=f.resume_content_version_id WHERE f.id=?1 AND f.status!='ARCHIVED'",[&file_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional()?.ok_or_else(||fail("NOT_FOUND","最终文件不存在或已归档。"))?;
            let path = storage.paths().final_resumes.join(path);
            let bytes = std::fs::read(&path)
                .map_err(|_| fail("FILE_UNAVAILABLE", "最终 PDF 无法读取，请检查文件。"))?;
            if format!("{:x}", Sha256::digest(&bytes)) != hash {
                return Err(fail(
                    "FILE_CHANGED",
                    "最终 PDF 已被外部修改，不能登记投递。",
                ));
            }
            let application = id(&tx)?;
            let time = now(&tx)?;
            tx.execute(
                "INSERT INTO applications VALUES (?1,?2,?3,?4,'APPLIED',?5,?6)",
                params![application, job, file_id, channel, note, time],
            )?;
            tx.execute("UPDATE final_resume_files SET first_used_at=coalesce(first_used_at,?1),status='USED' WHERE id=?2",params![time,file_id])?;
            json!({"id":application})
        }
        Action::UpdateApplication {
            application_id,
            status,
            note,
        } => {
            if !["APPLIED", "IN_PROCESS", "ENDED", "VOIDED"].contains(&status.as_str())
                || note.chars().count() > 4000
            {
                return Err(fail("INVALID_INPUT", "状态或备注无效。"));
            }
            exists(
                &tx,
                "SELECT EXISTS(SELECT 1 FROM applications WHERE id=?1)",
                &application_id,
            )?;
            tx.execute(
                "UPDATE applications SET status=?1,note=?2 WHERE id=?3",
                params![status, note, application_id],
            )?;
            json!({})
        }
    };
    Ok(result)
}
fn rows(db: &Connection, sql: &str) -> AppResult<Vec<Value>> {
    let mut stmt = db.prepare(sql)?;
    let strings = stmt
        .query_map([], |r| r.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    strings
        .iter()
        .map(|s| serde_json::from_str(s).map_err(AppError::from))
        .collect()
}
pub fn snapshot(storage: &Storage) -> AppResult<Value> {
    let mut db = storage.connection()?;
    let tx = db.transaction()?;
    let value = json!({
    "assets":rows(&tx,"SELECT json_object('id',c.id,'title',c.title,'summary',c.summary,'organization',e.organization,'role',e.role) FROM contributions c JOIN projects p ON p.id=c.project_id JOIN experiences e ON e.id=p.experience_id WHERE c.status!='ARCHIVED' ORDER BY e.created_at DESC,c.id")?,
    "facts":rows(&tx,"SELECT json_object('id',f.id,'contributionId',f.contribution_id,'state',f.state,'revisionId',r.id,'content',r.content,'verification',r.verification_status,'risk',r.risk_level,'ownership',r.ownership_scope,'revision',r.revision_no) FROM facts f JOIN fact_revisions r ON r.id=f.current_revision_id ORDER BY r.created_at,f.id")?,
    "jobs":rows(&tx,"SELECT json_object('id',id,'company',company,'roleTitle',role_title,'jd',jd_current_text) FROM jobs ORDER BY created_at DESC,id")?,
    "analyses":rows(&tx,"SELECT json_object('id',id,'jobId',job_id,'version',version_no,'requirements',json(proof_json)) FROM job_analysis_versions ORDER BY created_at,id")?,
    "portfolios":rows(&tx,"SELECT json_object('id',id,'jobId',job_id,'analysisId',job_analysis_version_id,'version',version_no,'revisionIds',json_extract(snapshot_context_json,'$.revisionIds')) FROM contribution_portfolios ORDER BY created_at,id")?,
    "resumes":rows(&tx,"SELECT json_object('id',id,'jobId',job_id,'portfolioId',portfolio_id,'version',version_no,'status',status,'plan',json(content_plan_json),'createdAt',created_at) FROM resume_content_versions ORDER BY created_at,id")?,
    "files":rows(&tx,"SELECT json_object('id',id,'resumeId',resume_content_version_id,'name',display_name,'hash',sha256,'used',first_used_at IS NOT NULL,'createdAt',created_at) FROM final_resume_files ORDER BY created_at,id")?,
    "applications":rows(&tx,"SELECT json_object('id',id,'jobId',job_id,'fileId',final_resume_file_id,'channel',channel,'status',status,'note',note,'appliedAt',applied_at) FROM applications ORDER BY applied_at DESC,id")?
    });
    tx.commit()?;
    Ok(value)
}
pub fn attach_pdf(
    storage: &Storage,
    resume_id: &str,
    name: &str,
    bytes: &[u8],
) -> AppResult<Value> {
    text(name, 240)?;
    if bytes.len() < 8
        || bytes.len() > 15 * 1024 * 1024
        || !bytes.starts_with(b"%PDF-")
        || !bytes.windows(5).any(|w| w == b"%%EOF")
    {
        return Err(fail(
            "INVALID_FILE",
            "请选择完整的 PDF 文件，大小不超过 15 MB。",
        ));
    }
    let mut db = storage.connection()?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    exists(&tx,"SELECT EXISTS(SELECT 1 FROM resume_content_versions WHERE id=?1 AND status='CONTENT_READY')",resume_id)?;
    let file = id(&tx)?;
    let hash = format!("{:x}", Sha256::digest(bytes));
    let path = storage.write_managed_file(ManagedFileArea::FinalResume, &file, "pdf", bytes)?;
    let relative = path
        .file_name()
        .ok_or_else(|| fail("INVALID_FILE", "文件名无效。"))?
        .to_string_lossy()
        .to_string();
    tx.execute(
        "INSERT INTO final_resume_files VALUES (?1,?2,?3,?4,?5,NULL,'FINAL',?6)",
        params![file, resume_id, name, relative, hash, now(&tx)?],
    )?;
    tx.commit()?;
    Ok(json!({"id":file}))
}
pub fn read_pdf(storage: &Storage, file_id: &str) -> AppResult<Vec<u8>> {
    let db = storage.connection()?;
    let (path, hash): (String, String) = db
        .query_row(
            "SELECT stored_path,sha256 FROM final_resume_files WHERE id=?1",
            [file_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?
        .ok_or_else(|| fail("NOT_FOUND", "文件不存在。"))?;
    let bytes = std::fs::read(storage.paths().final_resumes.join(path))
        .map_err(|_| fail("FILE_UNAVAILABLE", "文件无法读取。"))?;
    if format!("{:x}", Sha256::digest(&bytes)) != hash {
        return Err(fail("FILE_CHANGED", "文件完整性检查未通过。"));
    }
    Ok(bytes)
}
