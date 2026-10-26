use rusqlite::{backup::Backup, Connection, TransactionBehavior};
use serde::Serialize;
use std::{
    error::Error,
    fmt::{self, Display, Formatter},
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const LATEST_SCHEMA_VERSION: u32 = 3;
const DEFAULT_MIGRATIONS: &[Migration] = &[
    Migration::new(
        1,
        "storage foundation",
        include_str!("../../migrations/0001_storage.sql"),
    ),
    Migration::new(
        2,
        "career workspace",
        include_str!("../../migrations/0002_career_workspace.sql"),
    ),
    Migration::new(
        3,
        "AI proposals",
        include_str!("../../migrations/0003_ai_proposals.sql"),
    ),
];
static NEXT_PENDING_FILE: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Debug)]
pub struct StoragePaths {
    pub root: PathBuf,
    pub database: PathBuf,
    pub evidence: PathBuf,
    pub final_resumes: PathBuf,
    pub temp: PathBuf,
}

impl StoragePaths {
    fn new(root: PathBuf) -> Self {
        Self {
            database: root.join("app.db"),
            evidence: root.join("evidence"),
            final_resumes: root.join("final-resumes"),
            temp: root.join("temp"),
            root,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    pub root: PathBuf,
    pub database: PathBuf,
    pub workspace_id: String,
    pub schema_version: u32,
    pub recovered_pending_files: usize,
}

#[derive(Clone, Copy, Debug)]
pub struct Migration {
    pub version: u32,
    pub name: &'static str,
    pub sql: &'static str,
}

impl Migration {
    pub const fn new(version: u32, name: &'static str, sql: &'static str) -> Self {
        Self { version, name, sql }
    }
}

#[derive(Clone, Copy, Debug)]
pub enum ManagedFileArea {
    Evidence,
    FinalResume,
}

impl ManagedFileArea {
    fn directory<'a>(self, paths: &'a StoragePaths) -> &'a Path {
        match self {
            Self::Evidence => &paths.evidence,
            Self::FinalResume => &paths.final_resumes,
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Evidence => "evidence",
            Self::FinalResume => "final-resume",
        }
    }
}

#[derive(Debug)]
pub struct StorageError {
    code: &'static str,
    message: String,
}

impl StorageError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub fn code(&self) -> &'static str {
        self.code
    }
}

impl Display for StorageError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl Error for StorageError {}

impl From<std::io::Error> for StorageError {
    fn from(error: std::io::Error) -> Self {
        Self::new("STORAGE_IO", error.to_string())
    }
}

impl From<rusqlite::Error> for StorageError {
    fn from(error: rusqlite::Error) -> Self {
        Self::new("STORAGE_DATABASE", error.to_string())
    }
}

pub struct Storage {
    paths: StoragePaths,
    workspace_id: String,
    schema_version: u32,
    recovered_pending_files: usize,
}

impl Storage {
    pub fn initialize(root: impl AsRef<Path>) -> Result<Self, StorageError> {
        let paths = StoragePaths::new(root.as_ref().to_path_buf());
        fs::create_dir_all(&paths.root)?;
        fs::create_dir_all(&paths.evidence)?;
        fs::create_dir_all(&paths.final_resumes)?;
        fs::create_dir_all(&paths.temp)?;
        let recovered_pending_files = recover_pending_files_at(&paths.temp)?;

        let database_existed = paths.database.exists();
        let mut connection = open_connection(&paths.database)?;
        let current_version = schema_version(&connection)?;
        if current_version > LATEST_SCHEMA_VERSION {
            return Err(StorageError::new(
                "STORAGE_SCHEMA_NEWER",
                format!(
          "database schema {current_version} is newer than supported {LATEST_SCHEMA_VERSION}"
        ),
            ));
        }
        if database_existed && current_version < LATEST_SCHEMA_VERSION {
            backup_before_migration(&connection, &paths.temp, current_version)?;
        }
        Self::migrate(&mut connection, DEFAULT_MIGRATIONS)?;
        let workspace_id = connection.query_row(
            "SELECT value FROM _storage_metadata WHERE key = 'workspace_id'",
            [],
            |row| row.get(0),
        )?;
        let schema_version = schema_version(&connection)?;

        Ok(Self {
            paths,
            workspace_id,
            schema_version,
            recovered_pending_files,
        })
    }

    pub fn paths(&self) -> &StoragePaths {
        &self.paths
    }

    pub fn info(&self) -> StorageInfo {
        StorageInfo {
            root: self.paths.root.clone(),
            database: self.paths.database.clone(),
            workspace_id: self.workspace_id.clone(),
            schema_version: self.schema_version,
            recovered_pending_files: self.recovered_pending_files,
        }
    }

    pub fn connection(&self) -> Result<Connection, StorageError> {
        open_connection(&self.paths.database)
    }

    pub fn migrate(
        connection: &mut Connection,
        migrations: &[Migration],
    ) -> Result<(), StorageError> {
        let mut current_version = schema_version(connection)?;
        for migration in migrations {
            if migration.version <= current_version {
                continue;
            }
            if migration.version != current_version + 1 {
                return Err(StorageError::new(
                    "STORAGE_MIGRATION_ORDER",
                    format!(
                        "expected migration {}, received {} ({})",
                        current_version + 1,
                        migration.version,
                        migration.name
                    ),
                ));
            }

            let transaction =
                connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
            transaction.execute_batch(migration.sql).map_err(|error| {
                StorageError::new(
                    "STORAGE_MIGRATION_FAILED",
                    format!(
                        "migration {} ({}) failed: {error}",
                        migration.version, migration.name
                    ),
                )
            })?;
            transaction.pragma_update(None, "user_version", migration.version)?;
            transaction.commit()?;
            current_version = migration.version;
        }
        Ok(())
    }

    pub fn write_managed_file(
        &self,
        area: ManagedFileArea,
        storage_id: &str,
        extension: &str,
        contents: &[u8],
    ) -> Result<PathBuf, StorageError> {
        validate_file_component(storage_id, "storage id")?;
        validate_file_component(extension, "extension")?;
        let sequence = NEXT_PENDING_FILE.fetch_add(1, Ordering::Relaxed);
        let pending = self.paths.temp.join(format!(
            "{}-{storage_id}-{}-{sequence}.pending",
            area.label(),
            std::process::id()
        ));
        let destination = area
            .directory(&self.paths)
            .join(format!("{storage_id}.{extension}"));

        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&pending)?;
        file.write_all(contents)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&pending, &destination).map_err(|error| {
            StorageError::new(
                "STORAGE_FILE_COMMIT",
                format!(
                    "failed to commit staged file {}: {error}",
                    pending.display()
                ),
            )
        })?;
        Ok(destination)
    }

    pub fn recover_pending_files(&self) -> Result<usize, StorageError> {
        recover_pending_files_at(&self.paths.temp)
    }
}

fn open_connection(path: &Path) -> Result<Connection, StorageError> {
    let connection = Connection::open(path)?;
    connection.busy_timeout(Duration::from_secs(5))?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    let enabled: bool = connection.pragma_query_value(None, "foreign_keys", |row| row.get(0))?;
    if !enabled {
        return Err(StorageError::new(
            "STORAGE_FOREIGN_KEYS",
            "SQLite foreign key enforcement could not be enabled",
        ));
    }
    connection.query_row("PRAGMA journal_mode = WAL", [], |_| Ok(()))?;
    Ok(connection)
}

fn schema_version(connection: &Connection) -> Result<u32, StorageError> {
    Ok(connection.pragma_query_value(None, "user_version", |row| row.get(0))?)
}

fn backup_before_migration(
    source: &Connection,
    temp_directory: &Path,
    current_version: u32,
) -> Result<PathBuf, StorageError> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| StorageError::new("STORAGE_CLOCK", error.to_string()))?
        .as_millis();
    let path = temp_directory.join(format!("app.db.v{current_version}.{timestamp}.backup"));
    let mut destination = Connection::open(&path)?;
    let backup = Backup::new(source, &mut destination)?;
    backup.run_to_completion(100, Duration::from_millis(5), None)?;
    drop(backup);
    Ok(path)
}

fn recover_pending_files_at(directory: &Path) -> Result<usize, StorageError> {
    let mut recovered = 0;
    for entry in fs::read_dir(directory)? {
        let path = entry?.path();
        if path.is_file()
            && path
                .extension()
                .is_some_and(|extension| extension == "pending")
        {
            fs::remove_file(path)?;
            recovered += 1;
        }
    }
    Ok(recovered)
}

fn validate_file_component(value: &str, label: &str) -> Result<(), StorageError> {
    let valid = !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'));
    if valid {
        Ok(())
    } else {
        Err(StorageError::new(
            "STORAGE_INVALID_PATH",
            format!("invalid {label}"),
        ))
    }
}
