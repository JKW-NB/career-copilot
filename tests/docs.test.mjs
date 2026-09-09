import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const names = ['PRODUCT_SPEC.md', 'TECH_SPEC.md', 'WORK_MANUAL.md', 'IMPLEMENTATION_PLAN.md', 'LEARNING_MAP.md', 'AGENTS.md', 'docs/CONSISTENCY_CHECK.md', 'docs/DESKTOP_SETUP.md', 'docs/STORAGE.md'];
const docs = Object.fromEntries(names.map(name => [name, readFileSync(resolve(root, name), 'utf8')]));
const baselineTaskCounts = [5, 5, 6, 5, 5, 6, 7, 6, 6];
const expectedTasks = baselineTaskCounts.flatMap((count, milestone) =>
  Array.from({ length: count }, (_, index) => `M${milestone}-T${index + 1}`));
expectedTasks.push('M1-T6', 'M4-T6');
const expectedRules = Array.from({ length: 8 }, (_, index) => `INV-0${index + 1}`);
const expectedTables = ['experiences', 'projects', 'contributions', 'facts', 'fact_revisions', 'evidence', 'evidence_versions', 'fact_evidence_links', 'capabilities', 'contribution_capabilities', 'career_directions', 'jobs', 'job_analysis_versions', 'proof_requirements', 'proof_requirement_capabilities', 'contribution_portfolios', 'portfolio_items', 'portfolio_item_proof_requirements', 'portfolio_item_fact_revisions', 'resume_content_versions', 'resume_content_items', 'resume_item_contributions', 'resume_item_fact_revisions', 'resume_item_proof_requirements', 'final_resume_files', 'applications', 'import_batches', 'import_batch_files', 'reconstruction_runs', 'interview_sessions', 'ai_runs'];

function taskDefinitions(text) {
  return [...text.matchAll(/^\| (M\d+-T\d+) \|/gm)].map(match => match[1]);
}

function validateTasks(plan, matrix) {
  const tasks = taskDefinitions(plan);
  assert.equal(tasks.length, new Set(tasks).size, 'duplicate task definition');
  assert.deepEqual([...tasks].sort(), [...expectedTasks].sort(), 'baseline task coverage changed');
  for (const id of matrix.match(/M\d+-T\d+/g) ?? []) {
    assert.ok(tasks.includes(id), `unknown mapped task: ${id}`);
  }
  for (const row of plan.split('\n').filter(line => /^\| M\d+-T\d+ \|/.test(line))) {
    const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
    assert.equal(cells.length, 3, `task row shape: ${row}`);
    assert.ok(cells[1].length >= 10 && cells[2].length >= 10, `missing output/acceptance: ${cells[0]}`);
  }
}

function validateRules(text, label) {
  for (const rule of expectedRules) assert.ok(text.includes(rule), `${label} missing ${rule}`);
}

function validateMarkdown(text, filename, fileExists = existsSync) {
  let fence;
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*(`{3,}|~{3,})/);
    if (!match) continue;
    if (!fence) fence = match[1];
    else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = undefined;
  }
  assert.equal(fence, undefined, `${filename}: unclosed code fence`);
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    assert.ok(fileExists(resolve(root, dirname(filename), path)), `${filename}: broken link ${target}`);
  }
}

test('all core documents are substantive and local Markdown links/fences resolve', () => {
  for (const [name, content] of Object.entries(docs)) {
    assert.ok(content.length > 300, `${name} unexpectedly empty`);
    validateMarkdown(content, name);
  }
});

test('product defines exactly seven numbered Feature Specs', () => {
  const features = [...docs['PRODUCT_SPEC.md'].matchAll(/^## \d+\. Feature Spec (\d{2}) /gm)].map(match => match[1]);
  assert.deepEqual(features, ['01', '02', '03', '04', '05', '06', '07']);
});

test('all 51 original tasks and two explicit additions retain outputs and acceptance', () => {
  validateTasks(docs['IMPLEMENTATION_PLAN.md'], docs['docs/CONSISTENCY_CHECK.md']);
});

test('learning map covers every implementation task exactly once', () => {
  const learning = docs['LEARNING_MAP.md'];
  const mappedTasks = [...learning.matchAll(/^\| (M\d+-T\d+) \|/gm)].map(match => match[1]);
  assert.equal(mappedTasks.length, new Set(mappedTasks).size, 'duplicate learning task mapping');
  assert.deepEqual([...mappedTasks].sort(), [...expectedTasks].sort(), 'learning task coverage changed');
  assert.match(learning, /项目状态与个人理解分开记录/);
  assert.match(learning, /下一项不是泛学数据库/);
});

test('learning workflow requires teach, practice, recap and persisted evidence in order', () => {
  const agents = docs['AGENTS.md'];
  const manual = docs['WORK_MANUAL.md'];
  const plan = docs['IMPLEMENTATION_PLAN.md'];
  const learning = docs['LEARNING_MAP.md'];
  assert.match(agents, /先讲解 → 再实操 → 后复盘并写入/);
  assert.match(manual, /完成这一步前不得修改代码或业务文档；只读检查可以提前进行/);
  assert.match(plan, /课前说明之前不得修改代码或业务文档/);
  const teach = learning.indexOf('**先讲解**');
  const practice = learning.indexOf('**再实操**');
  const recap = learning.indexOf('**后复盘并写入**');
  assert.ok(teach >= 0 && teach < practice && practice < recap, 'learning phases are missing or out of order');
  assert.match(learning, /## 6\. Task 复盘记录/);
  assert.match(learning, /### M0-T1 — Desktop Application Shell/);
  assert.match(learning, /JKai 自评：待自评/);
});

test('seven Features and eight invariants have actual implementation/test mappings', () => {
  const matrix = docs['docs/CONSISTENCY_CHECK.md'];
  for (let number = 1; number <= 7; number++) {
    const row = matrix.split('\n').find(line => line.startsWith(`| 0${number} |`));
    assert.ok(row && /M\d+-T\d+/.test(row), `Feature ${number} unmapped`);
  }
  for (const rule of expectedRules) {
    const row = matrix.split('\n').find(line => line.startsWith(`| ${rule} |`));
    assert.ok(row && /M[0-7]-T\d+/.test(row) && /M8-T\d+/.test(row), `${rule} lacks implementation/integration mapping`);
  }
});

test('product, tech and manual share all eight invariant identifiers', () => {
  for (const name of ['PRODUCT_SPEC.md', 'TECH_SPEC.md', 'WORK_MANUAL.md']) validateRules(docs[name], name);
});

test('Schema inventory preserves all 31 tables with core historical foreign references', () => {
  const inventory = docs['TECH_SPEC.md'].split('<!-- schema-inventory -->')[1];
  assert.ok(inventory, 'schema inventory missing');
  const tables = [...inventory.matchAll(/^\| `([a-z_]+)` \|/gm)].map(match => match[1]);
  assert.deepEqual(tables, expectedTables);
  for (const [table, fields] of Object.entries({
    fact_evidence_links: ['fact_revision_id', 'evidence_version_id', 'source_snippet'],
    resume_item_fact_revisions: ['resume_content_item_id', 'fact_revision_id', 'is_pinned'],
    applications: ['job_id', 'final_resume_file_id'],
    final_resume_files: ['resume_content_version_id', 'sha256'],
  })) {
    const row = inventory.split('\n').find(line => line.startsWith(`| \`${table}\` |`));
    for (const field of fields) assert.ok(row.includes(field), `${table} missing ${field}`);
  }
});

test('different priority types and protected historical states are explicit', () => {
  const tech = docs['TECH_SPEC.md'];
  assert.match(tech, /CapabilityPriority \| CORE \/ DIFFERENTIATOR \/ SUPPORTING/);
  assert.match(tech, /ProofRequirement\.priority \| CORE \/ IMPORTANT \/ SUPPORTING/);
  assert.match(tech, /Fact\.state \| ACTIVE \/ SUPERSEDED \/ RETRACTED/);
  assert.match(tech, /FactRevision\.verification_status \| UNCERTAIN \/ USER_CONFIRMED \/ EVIDENCE_VERIFIED/);
  assert.match(tech, /first_used_at/);
  assert.match(tech, /VOIDED 不删关联/);
});

test('all seven prompt contracts and safe consistency outcomes are documented', () => {
  const tech = docs['TECH_SPEC.md'];
  for (const prompt of ['career_reconstruction_v1', 'fact_extraction_v1', 'capability_analysis_v1', 'job_analysis_v1', 'portfolio_builder_v1', 'resume_compiler_v1', 'fact_consistency_v1']) assert.ok(tech.includes(prompt), prompt);
  assert.match(tech, /NARRATIVE_ONLY \/ POTENTIAL_FACT_CHANGE \/ NEW_FACTUAL_CLAIM \/ UNCLEAR/);
});

test('AGENTS retains the exact requested commit and testing instruction', () => {
  assert.ok(docs['AGENTS.md'].includes('注意事项·每次改动完成后，都必须创建一个对应的Git commit，以便后续追踪和回滚。每次改动后，都必须编写或更新相关测试，并在交付给用户前，确保所有测试和验证全部通过。'));
});

test('handoff marks M0-T1 complete with real desktop verification', () => {
  const plan = docs['IMPLEMENTATION_PLAN.md'];
  assert.match(plan, /- \[x\] M0-T1：Tauri 桌面应用初始化完成/);
  assert.doesNotMatch(plan, /- \[ \] M0-T1/);
  assert.match(plan, /cargo check --manifest-path src-tauri\/Cargo.toml/);
  assert.match(plan, /浏览器预览或仅前端构建不能代替桌面启动验收/);
  assert.match(plan, /构建版与开发版真实 Tauri 窗口 smoke 均通过/);
});

test('M0-T2 records the isolated workspace and honest portability boundary', () => {
  const plan = docs['IMPLEMENTATION_PLAN.md'];
  const tech = docs['TECH_SPEC.md'];
  const storage = docs['docs/STORAGE.md'];
  assert.match(plan, /- \[x\] M0-T2：SQLite Storage/);
  assert.match(plan, /M0-T2 完成，下一项为 M0-T3/);
  assert.match(tech, /app_local_data_dir\/workspace/);
  assert.match(storage, /com\.careercopilot\.desktop\\workspace/);
  assert.match(storage, /用户工作区还不能像插件一样自动跟随/);
  assert.match(storage, /直接复制正在运行的 `app\.db`/);
});

test('validator rejects a missing original task', () => {
  const damaged = docs['IMPLEMENTATION_PLAN.md'].replace(/^\| M5-T6 \|.*\n/m, '');
  assert.throws(() => validateTasks(damaged, ''), /baseline task coverage/);
});

test('validator rejects an unknown mapped task', () => {
  assert.throws(() => validateTasks(docs['IMPLEMENTATION_PLAN.md'], '| INV-01 | M9-T1 |'), /unknown mapped task/);
});

test('validator rejects a missing invariant', () => {
  const damaged = docs['PRODUCT_SPEC.md'].replaceAll('INV-06', 'REMOVED');
  assert.throws(() => validateRules(damaged, 'product'), /missing INV-06/);
});

test('validator rejects broken local links', () => {
  assert.throws(() => validateMarkdown('[missing](missing.md)', 'PRODUCT_SPEC.md', () => false), /broken link/);
});

test('validator rejects an unclosed code fence', () => {
  assert.throws(() => validateMarkdown('```text\nincomplete', 'TECH_SPEC.md'), /unclosed code fence/);
});
