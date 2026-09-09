use career_copilot_lib::storage::{ManagedFileArea, Migration, Storage};
use rusqlite::Connection;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

static NEXT_TEST_DIR: AtomicU64 = AtomicU64::new(1);

struct TestDir(PathBuf);

impl TestDir {
    fn new(name: &str) -> Self {
        let id = NEXT_TEST_DIR.fetch_add(1, Ordering::Relaxed);
        let path =
            std::env::temp_dir().join(format!("career-copilot-{name}-{}-{id}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TestDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn initializes_layout_and_reuses_workspace_identity_after_reopen() {
    let root = TestDir::new("reopen");
    let first = Storage::initialize(root.path()).expect("first initialization");
    let first_id = first.info().workspace_id;

    assert_eq!(first.info().schema_version, 1);
    assert_eq!(first.info().root, root.path());
    assert!(first.paths().database.is_file());
    assert!(first.paths().evidence.is_dir());
    assert!(first.paths().final_resumes.is_dir());
    assert!(first.paths().temp.is_dir());
    drop(first);

    let reopened = Storage::initialize(root.path()).expect("reopen storage");
    assert_eq!(reopened.info().workspace_id, first_id);
    assert_eq!(reopened.info().schema_version, 1);
}

#[test]
fn every_storage_connection_enforces_foreign_keys() {
    let root = TestDir::new("foreign-key");
    let storage = Storage::initialize(root.path()).expect("initialize storage");
    let connection = storage.connection().expect("open connection");
    connection
        .execute_batch(
            "CREATE TABLE parent (id TEXT PRIMARY KEY);
       CREATE TABLE child (parent_id TEXT NOT NULL REFERENCES parent(id));",
        )
        .expect("create test schema");

    let error = connection
        .execute("INSERT INTO child(parent_id) VALUES ('missing')", [])
        .expect_err("orphan row must be rejected");
    assert_eq!(
        error.sqlite_error_code(),
        Some(rusqlite::ErrorCode::ConstraintViolation)
    );
}

#[test]
fn failed_migration_rolls_back_only_its_partial_changes() {
    let mut connection = Connection::open_in_memory().expect("memory database");
    let migrations = [
        Migration::new(
            1,
            "valid",
            "CREATE TABLE retained (id INTEGER PRIMARY KEY);",
        ),
        Migration::new(
            2,
            "broken",
            "CREATE TABLE partial (id INTEGER PRIMARY KEY); INSERT INTO missing VALUES (1);",
        ),
    ];

    Storage::migrate(&mut connection, &migrations).expect_err("second migration must fail");

    let version: u32 = connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .expect("read schema version");
    assert_eq!(version, 1);
    assert!(table_exists(&connection, "retained"));
    assert!(!table_exists(&connection, "partial"));
}

#[test]
fn existing_database_is_backed_up_before_migration() {
    let root = TestDir::new("migration-backup");
    fs::create_dir_all(root.path()).expect("create storage root");
    let database = root.path().join("app.db");
    let legacy = Connection::open(&database).expect("create legacy database");
    legacy
        .execute("CREATE TABLE legacy_record (value TEXT NOT NULL)", [])
        .expect("create legacy table");
    legacy
        .execute("INSERT INTO legacy_record VALUES ('keep me')", [])
        .expect("seed legacy row");
    drop(legacy);

    let storage = Storage::initialize(root.path()).expect("migrate existing database");
    let backup = fs::read_dir(&storage.paths().temp)
        .expect("read backup directory")
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .find(|path| {
            path.extension()
                .is_some_and(|extension| extension == "backup")
        })
        .expect("migration backup exists");
    let backup_connection = Connection::open(backup).expect("open migration backup");
    let value: String = backup_connection
        .query_row("SELECT value FROM legacy_record", [], |row| row.get(0))
        .expect("legacy data remains in backup");
    assert_eq!(value, "keep me");
}

#[test]
fn failed_file_commit_leaves_a_recoverable_pending_file() {
    let root = TestDir::new("file-recovery");
    let storage = Storage::initialize(root.path()).expect("initialize storage");
    fs::create_dir(storage.paths().evidence.join("blocked.txt")).expect("block destination");

    storage
        .write_managed_file(
            ManagedFileArea::Evidence,
            "blocked",
            "txt",
            b"career evidence",
        )
        .expect_err("rename onto a directory must fail");

    assert_eq!(pending_files(&storage.paths().temp), 1);
    assert_eq!(
        storage
            .recover_pending_files()
            .expect("recover pending file"),
        1
    );
    assert_eq!(pending_files(&storage.paths().temp), 0);
}

#[test]
fn initialization_recovers_pending_files_from_an_interrupted_run() {
    let root = TestDir::new("startup-recovery");
    let temp = root.path().join("temp");
    fs::create_dir_all(&temp).expect("create temp directory");
    fs::write(temp.join("interrupted.pending"), b"unfinished").expect("write pending file");

    let storage = Storage::initialize(root.path()).expect("initialize and recover");

    assert_eq!(storage.info().recovered_pending_files, 1);
    assert_eq!(pending_files(&storage.paths().temp), 0);
}

#[test]
fn managed_file_names_cannot_escape_the_workspace() {
    let root = TestDir::new("path-boundary");
    let storage = Storage::initialize(root.path()).expect("initialize storage");

    storage
        .write_managed_file(ManagedFileArea::Evidence, "../outside", "txt", b"blocked")
        .expect_err("path traversal must be rejected");
    assert!(!root.path().parent().unwrap().join("outside.txt").exists());
}

fn table_exists(connection: &Connection, name: &str) -> bool {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
            [name],
            |row| row.get(0),
        )
        .expect("query sqlite schema")
}

fn pending_files(directory: &Path) -> usize {
    fs::read_dir(directory)
        .expect("read temp directory")
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .path()
                .extension()
                .is_some_and(|extension| extension == "pending")
        })
        .count()
}
