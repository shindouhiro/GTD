use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Instant;

use axum::extract::{Path as AxumPath, State};
use axum::http::{header, HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;

const DEFAULT_USER_ID: &str = "demo-user";
const DEFAULT_USER_EMAIL: &str = "local@gtd.desktop";
const DEFAULT_USER_NAME: &str = "本地用户";
const DEFAULT_JWT_SECRET: &str = "your-secret-key-change-in-production";
const JWT_TTL_DAYS: i64 = 7;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RunMode {
    Desktop,
    Server,
}

impl RunMode {
    pub fn from_env() -> Self {
        match std::env::var("GTD_MODE") {
            Ok(value) if value.eq_ignore_ascii_case("desktop") => Self::Desktop,
            _ => Self::Server,
        }
    }
}

#[derive(Clone, Debug)]
pub struct BackendConfig {
    pub host: String,
    pub port: u16,
    pub db_path: PathBuf,
    pub mode: RunMode,
    pub static_dir: Option<PathBuf>,
    pub jwt_secret: String,
}

impl BackendConfig {
    pub fn server_from_env() -> Self {
        let port = std::env::var("PORT")
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(3001);
        let db_path = std::env::var("DB_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("todo.db"));
        let static_dir = std::env::var("CLIENT_DIST_PATH").ok().map(PathBuf::from);
        let jwt_secret =
            std::env::var("JWT_SECRET").unwrap_or_else(|_| DEFAULT_JWT_SECRET.to_string());

        Self {
            host: "0.0.0.0".to_string(),
            port,
            db_path,
            mode: RunMode::from_env(),
            static_dir,
            jwt_secret,
        }
    }
}

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
    mode: RunMode,
    static_dir: Option<PathBuf>,
    jwt_secret: String,
    started_at: Instant,
}

#[derive(Debug)]
struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }

    fn bad_request(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, message)
    }

    fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, message)
    }

    fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, message)
    }

    fn conflict(message: impl Into<String>) -> Self {
        Self::new(StatusCode::CONFLICT, message)
    }

    fn internal(message: impl Into<String>) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, message)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.status, Json(json!({ "error": self.message }))).into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        ApiError::internal(error.to_string())
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    #[serde(rename = "userId")]
    user_id: String,
    email: String,
    exp: usize,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct UserResponse {
    id: String,
    email: String,
    name: String,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Debug, sqlx::FromRow)]
struct UserRecord {
    id: String,
    email: String,
    password: String,
    name: String,
    #[sqlx(rename = "createdAt")]
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct Category {
    id: String,
    name: String,
    icon: String,
    color: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct TodoResponse {
    id: String,
    text: String,
    completed: bool,
    date: String,
    #[serde(rename = "categoryId", skip_serializing_if = "Option::is_none")]
    #[sqlx(rename = "categoryId")]
    category_id: Option<String>,
    #[serde(rename = "userId")]
    #[sqlx(rename = "userId")]
    user_id: String,
}

#[derive(Debug, Deserialize)]
struct RegisterRequest {
    email: String,
    password: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct UpdateProfileRequest {
    name: Option<String>,
    email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdatePasswordRequest {
    #[serde(rename = "currentPassword")]
    current_password: Option<String>,
    #[serde(rename = "newPassword")]
    new_password: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CategoryRequest {
    id: Option<String>,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TodoRequest {
    id: Option<String>,
    text: Option<String>,
    completed: Option<bool>,
    date: Option<String>,
    #[serde(rename = "categoryId")]
    category_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BulkDeleteRequest {
    ids: Vec<String>,
}

#[derive(Debug, Serialize)]
struct AuthResponse {
    user: UserResponse,
    token: String,
}

pub async fn serve(
    config: BackendConfig,
    ready_tx: Option<mpsc::Sender<Result<SocketAddr, String>>>,
    shutdown_rx: oneshot::Receiver<()>,
) -> Result<(), String> {
    let db = connect_db(&config.db_path)
        .await
        .map_err(|error| error.to_string())?;
    init_db(&db).await.map_err(|error| error.to_string())?;

    let state = AppState {
        db,
        mode: config.mode,
        static_dir: config.static_dir,
        jwt_secret: config.jwt_secret,
        started_at: Instant::now(),
    };

    let app = build_router(state);
    let listener = tokio::net::TcpListener::bind((config.host.as_str(), config.port))
        .await
        .map_err(|error| format!("绑定后端端口失败: {error}"))?;
    let addr = listener
        .local_addr()
        .map_err(|error| format!("读取后端地址失败: {error}"))?;

    if let Some(sender) = ready_tx {
        let _ = sender.send(Ok(addr));
    }

    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            let _ = shutdown_rx.await;
        })
        .await
        .map_err(|error| format!("后端服务运行失败: {error}"))
}

fn build_router(state: AppState) -> Router {
    let has_static_dir = state.static_dir.is_some();
    let api = Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/me", get(me))
        .route("/auth/profile", put(update_profile))
        .route("/auth/password", put(update_password))
        .route("/categories", get(get_categories).post(add_category))
        .route(
            "/categories/:id",
            put(update_category).delete(delete_category),
        )
        .route("/todos", get(get_todos).post(add_todo).delete(clear_todos))
        .route(
            "/todos/bulk",
            post(bulk_add_todos).delete(bulk_delete_todos),
        )
        .route("/todos/:id", put(update_todo).delete(delete_todo));

    let app = Router::new()
        .route("/health", get(health))
        .nest("/api", api)
        .layer(CorsLayer::permissive());

    let app = if has_static_dir {
        app.fallback(get(static_file))
    } else {
        app
    };

    app.with_state(state)
}

async fn connect_db(db_path: &Path) -> Result<SqlitePool, sqlx::Error> {
    if let Some(parent) = db_path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(sqlx::Error::Io)?;
        }
    }

    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true)
        .foreign_keys(true);

    SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
}

async fn init_db(db: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
    "#,
    )
    .execute(db)
    .await?;

    let categories_has_user = table_has_column(db, "categories", "userId").await?;
    let todos_has_user = table_has_column(db, "todos", "userId").await?;
    let categories_exists = table_exists(db, "categories").await?;
    let todos_exists = table_exists(db, "todos").await?;
    let needs_migration =
        (categories_exists && !categories_has_user) || (todos_exists && !todos_has_user);

    if needs_migration {
        migrate_user_scoped_tables(db).await?;
    } else {
        create_scoped_tables(db).await?;
    }

    create_indexes(db).await?;
    ensure_default_user(db).await?;
    seed_default_categories_if_empty(db, DEFAULT_USER_ID).await?;
    translate_default_categories(db).await?;

    Ok(())
}

async fn table_exists(db: &SqlitePool, table: &str) -> Result<bool, sqlx::Error> {
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .bind(table)
    .fetch_one(db)
    .await?;

    Ok(exists > 0)
}

async fn table_has_column(db: &SqlitePool, table: &str, column: &str) -> Result<bool, sqlx::Error> {
    if !table_exists(db, table).await? {
        return Ok(false);
    }

    let query = format!("PRAGMA table_info({table})");
    let rows = sqlx::query(&query).fetch_all(db).await?;
    Ok(rows.iter().any(|row| {
        let name: String = row.get("name");
        name == column
    }))
}

async fn create_scoped_tables(db: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      userId TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
    "#,
    )
    .execute(db)
    .await?;

    sqlx::query(
        r#"
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      categoryId TEXT,
      userId TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
    "#,
    )
    .execute(db)
    .await?;

    Ok(())
}

async fn migrate_user_scoped_tables(db: &SqlitePool) -> Result<(), sqlx::Error> {
    ensure_default_user(db).await?;

    let mut tx = db.begin().await?;
    let categories_old_exists = table_exists(db, "categories_old").await?;
    let todos_old_exists = table_exists(db, "todos_old").await?;
    let categories_exists = table_exists(db, "categories").await?;
    let todos_exists = table_exists(db, "todos").await?;

    if categories_exists && !categories_old_exists {
        sqlx::query("ALTER TABLE categories RENAME TO categories_old")
            .execute(&mut *tx)
            .await?;
    }
    if todos_exists && !todos_old_exists {
        sqlx::query("ALTER TABLE todos RENAME TO todos_old")
            .execute(&mut *tx)
            .await?;
    }

    sqlx::query(
        r#"
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      userId TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
    "#,
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      categoryId TEXT,
      userId TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
    "#,
    )
    .execute(&mut *tx)
    .await?;

    if categories_old_exists || categories_exists {
        sqlx::query(
            r#"
      INSERT OR IGNORE INTO categories (id, name, icon, color, userId)
      SELECT id, name, icon, color, ? FROM categories_old
      "#,
        )
        .bind(DEFAULT_USER_ID)
        .execute(&mut *tx)
        .await?;
        sqlx::query("DROP TABLE categories_old")
            .execute(&mut *tx)
            .await?;
    }

    if todos_old_exists || todos_exists {
        sqlx::query(
            r#"
      INSERT OR IGNORE INTO todos (id, text, completed, date, categoryId, userId)
      SELECT id, text, completed, date, categoryId, ? FROM todos_old
      "#,
        )
        .bind(DEFAULT_USER_ID)
        .execute(&mut *tx)
        .await?;
        sqlx::query("DROP TABLE todos_old")
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    Ok(())
}

async fn create_indexes(db: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_todos_userId ON todos(userId)")
        .execute(db)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date)")
        .execute(db)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_categories_userId ON categories(userId)")
        .execute(db)
        .await?;
    Ok(())
}

async fn ensure_default_user(db: &SqlitePool) -> Result<(), sqlx::Error> {
    let exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE id = ?")
        .bind(DEFAULT_USER_ID)
        .fetch_one(db)
        .await?;

    if exists == 0 {
        sqlx::query(
            "INSERT INTO users (id, email, password, name, createdAt) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(DEFAULT_USER_ID)
        .bind(DEFAULT_USER_EMAIL)
        .bind("$2b$10$demo")
        .bind(DEFAULT_USER_NAME)
        .bind(Utc::now().to_rfc3339())
        .execute(db)
        .await?;
    }

    Ok(())
}

async fn seed_default_categories_if_empty(
    db: &SqlitePool,
    user_id: &str,
) -> Result<(), sqlx::Error> {
    let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM categories")
        .fetch_one(db)
        .await?;

    if count > 0 {
        return Ok(());
    }

    insert_default_categories(db, user_id).await
}

async fn insert_default_categories(db: &SqlitePool, user_id: &str) -> Result<(), sqlx::Error> {
    let categories = [
        ("work", "工作", "Briefcase", "#3b82f6"),
        ("personal", "个人", "User", "#10b981"),
        ("shopping", "购物", "ShoppingCart", "#f59e0b"),
        ("health", "健康", "Heart", "#ef4444"),
        ("study", "学习", "BookOpen", "#8b5cf6"),
        ("home", "生活", "Home", "#ec4899"),
    ];

    let mut tx = db.begin().await?;
    for (id, name, icon, color) in categories {
        sqlx::query("INSERT OR IGNORE INTO categories (id, name, icon, color, userId) VALUES (?, ?, ?, ?, ?)")
      .bind(id)
      .bind(name)
      .bind(icon)
      .bind(color)
      .bind(user_id)
      .execute(&mut *tx)
      .await?;
    }
    tx.commit().await?;
    Ok(())
}

async fn insert_user_default_categories(db: &SqlitePool, user_id: &str) -> Result<(), sqlx::Error> {
    let categories = [
        ("work", "工作", "Briefcase", "#3b82f6"),
        ("personal", "个人", "User", "#10b981"),
        ("shopping", "购物", "ShoppingCart", "#f59e0b"),
        ("health", "健康", "Heart", "#ef4444"),
        ("study", "学习", "BookOpen", "#8b5cf6"),
        ("home", "生活", "Home", "#ec4899"),
    ];

    let mut tx = db.begin().await?;
    for (suffix, name, icon, color) in categories {
        let id = format!("{user_id}-{suffix}");
        sqlx::query("INSERT OR IGNORE INTO categories (id, name, icon, color, userId) VALUES (?, ?, ?, ?, ?)")
      .bind(id)
      .bind(name)
      .bind(icon)
      .bind(color)
      .bind(user_id)
      .execute(&mut *tx)
      .await?;
    }
    tx.commit().await?;
    Ok(())
}

async fn translate_default_categories(db: &SqlitePool) -> Result<(), sqlx::Error> {
    let translations = [
        ("Work", "工作"),
        ("Personal", "个人"),
        ("Shopping", "购物"),
        ("Health", "健康"),
        ("Study", "学习"),
        ("Home", "生活"),
    ];

    for (english, chinese) in translations {
        sqlx::query("UPDATE categories SET name = ? WHERE name = ?")
            .bind(chinese)
            .bind(english)
            .execute(db)
            .await?;
    }

    Ok(())
}

fn generate_token(user_id: &str, email: &str, secret: &str) -> Result<String, ApiError> {
    let exp = Utc::now() + Duration::days(JWT_TTL_DAYS);
    let claims = Claims {
        user_id: user_id.to_string(),
        email: email.to_string(),
        exp: exp.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|error| ApiError::internal(error.to_string()))
}

fn decode_token(token: &str, secret: &str) -> Result<Claims, ApiError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| ApiError::unauthorized("Invalid or expired token"))
}

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
}

fn auth_user_id(headers: &HeaderMap, state: &AppState) -> Result<String, ApiError> {
    if state.mode == RunMode::Desktop {
        return Ok(DEFAULT_USER_ID.to_string());
    }

    let token = bearer_token(headers).ok_or_else(|| ApiError::unauthorized("No token provided"))?;
    let claims = decode_token(token, &state.jwt_secret)?;
    Ok(claims.user_id)
}

async fn current_user(headers: &HeaderMap, state: &AppState) -> Result<UserResponse, ApiError> {
    let user_id = auth_user_id(headers, state)?;
    let user = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email, name, createdAt FROM users WHERE id = ?",
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?;

    user.ok_or_else(|| ApiError::not_found("User not found"))
}

async fn health(State(state): State<AppState>) -> Json<Value> {
    Json(json!({
      "status": "ok",
      "timestamp": Utc::now().to_rfc3339(),
      "uptime": state.started_at.elapsed().as_secs_f64()
    }))
}

async fn static_file(
    State(state): State<AppState>,
    uri: Uri,
) -> Result<impl IntoResponse, ApiError> {
    let static_dir = state
        .static_dir
        .as_ref()
        .ok_or_else(|| ApiError::not_found("Not found"))?;

    let requested = uri.path().trim_start_matches('/');
    if requested.contains("..") {
        return Err(ApiError::not_found("Not found"));
    }

    let requested_path = if requested.is_empty() {
        static_dir.join("index.html")
    } else {
        static_dir.join(requested)
    };
    let file_path = if requested_path.is_file() {
        requested_path
    } else {
        static_dir.join("index.html")
    };
    let bytes = std::fs::read(&file_path).map_err(|_| ApiError::not_found("Not found"))?;
    let content_type = content_type_for(&file_path);

    Ok(([(header::CONTENT_TYPE, content_type)], bytes))
}

fn content_type_for(path: &Path) -> &'static str {
    match path.extension().and_then(|value| value.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "application/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("ico") => "image/x-icon",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        _ => "application/octet-stream",
    }
}

async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), ApiError> {
    if payload.email.is_empty() || payload.password.is_empty() || payload.name.is_empty() {
        return Err(ApiError::bad_request(
            "Email, password, and name are required",
        ));
    }
    if payload.password.len() < 6 {
        return Err(ApiError::bad_request(
            "Password must be at least 6 characters",
        ));
    }

    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE email = ?")
        .bind(&payload.email)
        .fetch_one(&state.db)
        .await?;
    if existing > 0 {
        return Err(ApiError::conflict("User with this email already exists"));
    }

    let user_id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let hashed = hash(payload.password, DEFAULT_COST)
        .map_err(|error| ApiError::internal(error.to_string()))?;

    sqlx::query("INSERT INTO users (id, email, password, name, createdAt) VALUES (?, ?, ?, ?, ?)")
        .bind(&user_id)
        .bind(&payload.email)
        .bind(hashed)
        .bind(&payload.name)
        .bind(&created_at)
        .execute(&state.db)
        .await?;
    insert_user_default_categories(&state.db, &user_id).await?;

    let user = UserResponse {
        id: user_id.clone(),
        email: payload.email.clone(),
        name: payload.name,
        created_at,
    };
    let token = generate_token(&user_id, &payload.email, &state.jwt_secret)?;

    Ok((StatusCode::CREATED, Json(AuthResponse { user, token })))
}

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    if payload.email.is_empty() || payload.password.is_empty() {
        return Err(ApiError::bad_request("Email and password are required"));
    }

    let user = sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password, name, createdAt FROM users WHERE email = ?",
    )
    .bind(&payload.email)
    .fetch_optional(&state.db)
    .await?;
    let user = user.ok_or_else(|| ApiError::unauthorized("Invalid email or password"))?;

    let valid = verify(payload.password, &user.password)
        .map_err(|error| ApiError::internal(error.to_string()))?;
    if !valid {
        return Err(ApiError::unauthorized("Invalid email or password"));
    }

    let token = generate_token(&user.id, &user.email, &state.jwt_secret)?;
    Ok(Json(AuthResponse {
        user: UserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
            created_at: user.created_at,
        },
        token,
    }))
}

async fn me(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<UserResponse>, ApiError> {
    Ok(Json(current_user(&headers, &state).await?))
}

async fn update_profile(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<Json<UserResponse>, ApiError> {
    if payload.name.as_deref().unwrap_or("").is_empty()
        && payload.email.as_deref().unwrap_or("").is_empty()
    {
        return Err(ApiError::bad_request("Name or email is required"));
    }

    let user_id = auth_user_id(&headers, &state)?;

    if let Some(email) = payload.email.as_deref().filter(|value| !value.is_empty()) {
        let existing =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE email = ? AND id != ?")
                .bind(email)
                .bind(&user_id)
                .fetch_one(&state.db)
                .await?;
        if existing > 0 {
            return Err(ApiError::conflict("Email is already in use"));
        }
    }

    let current = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email, name, createdAt FROM users WHERE id = ?",
    )
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| ApiError::not_found("User not found"))?;

    let next_name = payload
        .name
        .filter(|value| !value.is_empty())
        .unwrap_or(current.name);
    let next_email = payload
        .email
        .filter(|value| !value.is_empty())
        .unwrap_or(current.email);

    sqlx::query("UPDATE users SET name = ?, email = ? WHERE id = ?")
        .bind(&next_name)
        .bind(&next_email)
        .bind(&user_id)
        .execute(&state.db)
        .await?;

    let updated = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email, name, createdAt FROM users WHERE id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(updated))
}

async fn update_password(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<UpdatePasswordRequest>,
) -> Result<Json<Value>, ApiError> {
    if state.mode == RunMode::Desktop {
        return Ok(Json(json!({ "message": "Password updated successfully" })));
    }

    let current_password = payload
        .current_password
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Current and new passwords are required"))?;
    let new_password = payload
        .new_password
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Current and new passwords are required"))?;
    if new_password.len() < 6 {
        return Err(ApiError::bad_request(
            "New password must be at least 6 characters",
        ));
    }

    let user_id = auth_user_id(&headers, &state)?;
    let password: Option<String> = sqlx::query_scalar("SELECT password FROM users WHERE id = ?")
        .bind(&user_id)
        .fetch_optional(&state.db)
        .await?;
    let password = password.ok_or_else(|| ApiError::not_found("User not found"))?;
    let valid = verify(current_password, &password)
        .map_err(|error| ApiError::internal(error.to_string()))?;
    if !valid {
        return Err(ApiError::unauthorized("Current password is incorrect"));
    }

    let hashed =
        hash(new_password, DEFAULT_COST).map_err(|error| ApiError::internal(error.to_string()))?;
    sqlx::query("UPDATE users SET password = ? WHERE id = ?")
        .bind(hashed)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    Ok(Json(json!({ "message": "Password updated successfully" })))
}

async fn get_categories(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<Category>>, ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    let categories = sqlx::query_as::<_, Category>(
        "SELECT id, name, icon, color FROM categories WHERE userId = ? ORDER BY name",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(categories))
}

async fn add_category(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CategoryRequest>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    let id = payload
        .id
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Missing required fields"))?;
    let name = payload
        .name
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Missing required fields"))?;
    let icon = payload
        .icon
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Missing required fields"))?;
    let color = payload
        .color
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Missing required fields"))?;

    let result = sqlx::query(
        "INSERT INTO categories (id, name, icon, color, userId) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(name)
    .bind(icon)
    .bind(color)
    .bind(user_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Ok((
            StatusCode::CREATED,
            Json(json!({ "success": true, "id": id })),
        )),
        Err(error) if is_constraint_error(&error) => Err(ApiError::conflict(format!(
            "Category with id '{id}' already exists"
        ))),
        Err(error) => Err(error.into()),
    }
}

async fn update_category(
    headers: HeaderMap,
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<CategoryRequest>,
) -> Result<Json<Value>, ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    let result = sqlx::query(
    "UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color) WHERE id = ? AND userId = ?",
  )
  .bind(payload.name)
  .bind(payload.icon)
  .bind(payload.color)
  .bind(&id)
  .bind(user_id)
  .execute(&state.db)
  .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("Category not found"));
    }

    Ok(Json(json!({ "success": true })))
}

async fn delete_category(
    headers: HeaderMap,
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<Value>, ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    let result = sqlx::query("DELETE FROM categories WHERE id = ? AND userId = ?")
        .bind(id)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("Category not found"));
    }

    Ok(Json(json!({ "success": true })))
}

async fn get_todos(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<TodoResponse>>, ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    let todos = sqlx::query_as::<_, TodoResponse>(
        r#"
    SELECT id, text, completed != 0 AS completed, date, categoryId, userId
    FROM todos
    WHERE userId = ?
    ORDER BY date DESC
    "#,
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(todos))
}

async fn add_todo(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<TodoRequest>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    let id = payload
        .id
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Missing required fields"))?;
    let text = payload
        .text
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Missing required fields"))?;
    let date = payload
        .date
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("Missing required fields"))?;

    let result = sqlx::query(
    "INSERT INTO todos (id, text, completed, date, categoryId, userId) VALUES (?, ?, ?, ?, ?, ?)",
  )
  .bind(&id)
  .bind(text)
  .bind(payload.completed.unwrap_or(false) as i64)
  .bind(date)
  .bind(payload.category_id)
  .bind(user_id)
  .execute(&state.db)
  .await;

    match result {
        Ok(_) => Ok((
            StatusCode::CREATED,
            Json(json!({ "success": true, "id": id })),
        )),
        Err(error) if is_constraint_error(&error) => Err(ApiError::conflict(format!(
            "Todo with id '{id}' already exists"
        ))),
        Err(error) => Err(error.into()),
    }
}

async fn update_todo(
    headers: HeaderMap,
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<TodoRequest>,
) -> Result<Json<Value>, ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    if payload.completed.is_none()
        && payload.text.is_none()
        && payload.date.is_none()
        && payload.category_id.is_none()
    {
        return Err(ApiError::bad_request("No fields to update"));
    }

    let current = sqlx::query(
        "SELECT text, completed, date, categoryId FROM todos WHERE id = ? AND userId = ?",
    )
    .bind(&id)
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await?;
    let current = current.ok_or_else(|| ApiError::not_found("Todo not found"))?;

    let next_text = payload
        .text
        .unwrap_or_else(|| current.get::<String, _>("text"));
    let next_completed = payload
        .completed
        .map(|value| value as i64)
        .unwrap_or_else(|| current.get::<i64, _>("completed"));
    let next_date = payload
        .date
        .unwrap_or_else(|| current.get::<String, _>("date"));
    let next_category_id = if payload.category_id.is_some() {
        payload.category_id
    } else {
        current.get::<Option<String>, _>("categoryId")
    };

    sqlx::query(
    "UPDATE todos SET text = ?, completed = ?, date = ?, categoryId = ? WHERE id = ? AND userId = ?",
  )
  .bind(next_text)
  .bind(next_completed)
  .bind(next_date)
  .bind(next_category_id)
  .bind(id)
  .bind(user_id)
  .execute(&state.db)
  .await?;

    Ok(Json(json!({ "success": true })))
}

async fn delete_todo(
    headers: HeaderMap,
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<Value>, ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    let result = sqlx::query("DELETE FROM todos WHERE id = ? AND userId = ?")
        .bind(id)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("Todo not found"));
    }

    Ok(Json(json!({ "success": true })))
}

async fn clear_todos(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Value>, ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    let result = sqlx::query("DELETE FROM todos WHERE userId = ?")
        .bind(user_id)
        .execute(&state.db)
        .await?;

    Ok(Json(json!({
      "success": true,
      "deletedCount": result.rows_affected()
    })))
}

async fn bulk_add_todos(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<Vec<TodoRequest>>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    if payload.is_empty() {
        return Err(ApiError::bad_request("Empty array provided"));
    }

    let mut tx = state.db.begin().await?;
    for todo in &payload {
        let id = todo
            .id
            .as_ref()
            .filter(|value| !value.is_empty())
            .ok_or_else(|| ApiError::bad_request("Invalid todo data: missing required fields"))?;
        let text = todo
            .text
            .as_ref()
            .filter(|value| !value.is_empty())
            .ok_or_else(|| ApiError::bad_request("Invalid todo data: missing required fields"))?;
        let date = todo
            .date
            .as_ref()
            .filter(|value| !value.is_empty())
            .ok_or_else(|| ApiError::bad_request("Invalid todo data: missing required fields"))?;

        sqlx::query(
      "INSERT INTO todos (id, text, completed, date, categoryId, userId) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id)
    .bind(text)
    .bind(todo.completed.unwrap_or(false) as i64)
    .bind(date)
    .bind(&todo.category_id)
    .bind(&user_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| {
      if is_constraint_error(&error) {
        ApiError::conflict(format!("Todo with id '{id}' already exists"))
      } else {
        error.into()
      }
    })?;
    }
    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({ "success": true, "count": payload.len() })),
    ))
}

async fn bulk_delete_todos(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<BulkDeleteRequest>,
) -> Result<Json<Value>, ApiError> {
    let user_id = auth_user_id(&headers, &state)?;
    if payload.ids.is_empty() {
        return Err(ApiError::bad_request("Expected non-empty array of IDs"));
    }

    let mut tx = state.db.begin().await?;
    for id in &payload.ids {
        sqlx::query("DELETE FROM todos WHERE id = ? AND userId = ?")
            .bind(id)
            .bind(&user_id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;

    Ok(Json(json!({
      "success": true,
      "deletedCount": payload.ids.len()
    })))
}

fn is_constraint_error(error: &sqlx::Error) -> bool {
    match error {
        sqlx::Error::Database(db_error) => {
            db_error.message().contains("UNIQUE constraint")
                || db_error.message().contains("constraint failed")
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::{to_bytes, Body};
    use axum::http::{Request, StatusCode};
    use tempfile::tempdir;
    use tower::ServiceExt;

    async fn test_state(mode: RunMode) -> AppState {
        let dir = tempdir().expect("create temp dir");
        let db_path = dir.path().join("todo.db");
        let db = connect_db(&db_path).await.expect("connect db");
        init_db(&db).await.expect("init db");
        std::mem::forget(dir);

        AppState {
            db,
            mode,
            static_dir: None,
            jwt_secret: "test-secret".to_string(),
            started_at: Instant::now(),
        }
    }

    async fn response_json(response: axum::response::Response) -> Value {
        let bytes = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("read response body");
        serde_json::from_slice(&bytes).expect("parse response json")
    }

    #[tokio::test]
    async fn desktop_mode_allows_categories_without_token() {
        let app = build_router(test_state(RunMode::Desktop).await);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/categories")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response_json(response).await;
        assert!(body.as_array().expect("categories array").len() >= 6);
    }

    #[tokio::test]
    async fn server_mode_requires_jwt_and_registers_users() {
        let app = build_router(test_state(RunMode::Server).await);
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/categories")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/auth/register")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"email":"user@example.com","password":"secret1","name":"User"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);
        let body = response_json(response).await;
        let token = body["token"].as_str().expect("token");

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/categories")
                    .header("authorization", format!("Bearer {token}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn migrates_legacy_tables_to_default_user() {
        let dir = tempdir().expect("create temp dir");
        let db_path = dir.path().join("legacy.db");
        let db = connect_db(&db_path).await.expect("connect db");

        sqlx::query(
            r#"
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL
      )
      "#,
        )
        .execute(&db)
        .await
        .unwrap();
        sqlx::query(
            r#"
      CREATE TABLE todos (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        date TEXT NOT NULL,
        categoryId TEXT
      )
      "#,
        )
        .execute(&db)
        .await
        .unwrap();
        sqlx::query("INSERT INTO categories (id, name, icon, color) VALUES ('work', 'Work', 'Briefcase', '#3b82f6')")
      .execute(&db)
      .await
      .unwrap();
        sqlx::query("INSERT INTO todos (id, text, completed, date, categoryId) VALUES ('todo-1', 'Legacy', 0, '2026-05-01T00:00:00.000Z', 'work')")
      .execute(&db)
      .await
      .unwrap();

        init_db(&db).await.expect("migrate db");

        let todo_user_id: String =
            sqlx::query_scalar("SELECT userId FROM todos WHERE id = 'todo-1'")
                .fetch_one(&db)
                .await
                .unwrap();
        let category_name: String =
            sqlx::query_scalar("SELECT name FROM categories WHERE id = 'work'")
                .fetch_one(&db)
                .await
                .unwrap();

        assert_eq!(todo_user_id, DEFAULT_USER_ID);
        assert_eq!(category_name, "工作");
    }
}
