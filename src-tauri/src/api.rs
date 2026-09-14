use keyring::{Entry, Error as KeyringError};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::{
    env,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::State;
use tokio::sync::Mutex;
use url::Url;

const SERVER_ORIGIN: &str = "https://sjows.vercel.app";
const CREDENTIAL_SERVICE: &str = "kr.hs.samsung.calendarwidget";
const CREDENTIAL_ACCOUNT: &str = "sjows-refresh-token";
const DEVICE_GRANT: &str = "urn:ietf:params:oauth:grant-type:device_code";

#[derive(Default)]
struct AuthState {
    pending: Option<PendingConnection>,
    access_token: Option<String>,
    access_expires_at: u64,
}

#[derive(Clone)]
struct PendingConnection {
    device_code: String,
    expires_at: u64,
    interval: u64,
}

pub struct ApiState {
    client: Client,
    auth: Mutex<AuthState>,
}

impl ApiState {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(concat!("SJcalendar/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("failed to create HTTP client");
        Self {
            client,
            auth: Mutex::new(AuthState::default()),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    code: String,
    message: String,
}

impl CommandError {
    fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
        }
    }
    fn network() -> Self {
        Self::new("NETWORK_ERROR", "서버에 연결할 수 없습니다.")
    }
}

type CommandResult<T> = Result<T, CommandError>;

#[derive(Deserialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody {
    code: String,
    message: String,
    retry_after: Option<u64>,
}

#[derive(Deserialize)]
struct DeviceStartResponse {
    device_code: String,
    user_code: String,
    verification_uri_complete: String,
    expires_in: u64,
    interval: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceConnection {
    user_code: String,
    verification_url: String,
    expires_in: u64,
    interval: u64,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
    refresh_token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PollStatus {
    status: String,
    retry_after: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    id: String,
    title: String,
    kind: String,
    date: String,
    end_date: Option<String>,
    all_day: bool,
    start_time: Option<String>,
    end_time: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarResponse {
    schema_version: u32,
    timezone: String,
    generated_at: String,
    events: Vec<CalendarEvent>,
}

fn unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn credential_entry() -> CommandResult<Entry> {
    Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_ACCOUNT).map_err(|_| {
        CommandError::new(
            "CREDENTIAL_ERROR",
            "Windows 자격 증명 저장소를 열 수 없습니다.",
        )
    })
}

fn read_refresh_token() -> CommandResult<Option<String>> {
    match credential_entry()?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(_) => Err(CommandError::new(
            "CREDENTIAL_ERROR",
            "저장된 로그인을 읽을 수 없습니다.",
        )),
    }
}

fn save_refresh_token(token: &str) -> CommandResult<()> {
    credential_entry()?.set_password(token).map_err(|_| {
        CommandError::new("CREDENTIAL_ERROR", "로그인을 안전하게 저장하지 못했습니다.")
    })
}

fn delete_refresh_token() -> CommandResult<()> {
    match credential_entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(_) => Err(CommandError::new(
            "CREDENTIAL_ERROR",
            "저장된 로그인을 삭제하지 못했습니다.",
        )),
    }
}

fn device_name() -> String {
    env::var("COMPUTERNAME")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "Windows PC".to_string())
}

async fn response_error(response: reqwest::Response, fallback_code: &str) -> CommandError {
    let status = response.status();
    match response.json::<ErrorEnvelope>().await {
        Ok(body) => CommandError::new(&body.error.code, body.error.message),
        Err(_) if status == StatusCode::UNAUTHORIZED => {
            CommandError::new("AUTH_REQUIRED", "다시 연결해 주세요.")
        }
        Err(_) if status == StatusCode::FORBIDDEN => {
            CommandError::new("STAFF_REQUIRED", "교직원 권한을 확인해 주세요.")
        }
        Err(_) => CommandError::new(fallback_code, "서버 요청을 처리하지 못했습니다."),
    }
}

fn apply_tokens(auth: &mut AuthState, tokens: TokenResponse) -> CommandResult<()> {
    save_refresh_token(&tokens.refresh_token)?;
    auth.access_token = Some(tokens.access_token);
    auth.access_expires_at = unix_seconds().saturating_add(tokens.expires_in);
    auth.pending = None;
    Ok(())
}

async fn refresh_access(state: &ApiState, auth: &mut AuthState) -> CommandResult<String> {
    if auth.access_expires_at > unix_seconds().saturating_add(30) {
        if let Some(token) = &auth.access_token {
            return Ok(token.clone());
        }
    }
    let refresh_token = read_refresh_token()?
        .ok_or_else(|| CommandError::new("AUTH_REQUIRED", "학교 계정을 연결해 주세요."))?;
    let response = state
        .client
        .post(format!("{SERVER_ORIGIN}/api/widget/device/token"))
        .json(&serde_json::json!({ "grant_type": "refresh_token", "refresh_token": refresh_token }))
        .send()
        .await
        .map_err(|_| CommandError::network())?;
    if !response.status().is_success() {
        let status = response.status();
        let error = response_error(response, "TOKEN_REFRESH_FAILED").await;
        if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
            let _ = delete_refresh_token();
            auth.access_token = None;
            auth.access_expires_at = 0;
        }
        return Err(error);
    }
    let tokens = response
        .json::<TokenResponse>()
        .await
        .map_err(|_| CommandError::new("INVALID_RESPONSE", "서버 인증 응답을 읽지 못했습니다."))?;
    let access_token = tokens.access_token.clone();
    apply_tokens(auth, tokens)?;
    Ok(access_token)
}

#[tauri::command]
pub async fn has_saved_login() -> CommandResult<bool> {
    Ok(read_refresh_token()?.is_some())
}

#[tauri::command]
pub async fn start_device_connection(
    state: State<'_, ApiState>,
) -> CommandResult<DeviceConnection> {
    let response = state
        .client
        .post(format!("{SERVER_ORIGIN}/api/widget/device/start"))
        .json(&serde_json::json!({ "device_name": device_name() }))
        .send()
        .await
        .map_err(|_| CommandError::network())?;
    if !response.status().is_success() {
        return Err(response_error(response, "CONNECTION_START_FAILED").await);
    }
    let started = response
        .json::<DeviceStartResponse>()
        .await
        .map_err(|_| CommandError::new("INVALID_RESPONSE", "기기 연결 응답을 읽지 못했습니다."))?;
    let parsed = Url::parse(&started.verification_uri_complete).map_err(|_| {
        CommandError::new("INVALID_RESPONSE", "서버의 연결 주소가 올바르지 않습니다.")
    })?;
    if parsed.origin().ascii_serialization() != SERVER_ORIGIN || parsed.path() != "/widget/connect"
    {
        return Err(CommandError::new(
            "INVALID_RESPONSE",
            "승인되지 않은 연결 주소입니다.",
        ));
    }
    state.auth.lock().await.pending = Some(PendingConnection {
        device_code: started.device_code,
        expires_at: unix_seconds().saturating_add(started.expires_in),
        interval: started.interval.max(5),
    });
    Ok(DeviceConnection {
        user_code: started.user_code,
        verification_url: started.verification_uri_complete,
        expires_in: started.expires_in,
        interval: started.interval.max(5),
    })
}

#[tauri::command]
pub async fn open_connection_page(url: String) -> CommandResult<()> {
    let parsed = Url::parse(&url)
        .map_err(|_| CommandError::new("INVALID_URL", "연결 주소를 확인하세요."))?;
    if parsed.origin().ascii_serialization() != SERVER_ORIGIN || parsed.path() != "/widget/connect"
    {
        return Err(CommandError::new(
            "INVALID_URL",
            "승인되지 않은 주소는 열 수 없습니다.",
        ));
    }
    open::that(url)
        .map_err(|_| CommandError::new("OPEN_BROWSER_FAILED", "기본 브라우저를 열지 못했습니다."))
}

#[tauri::command]
pub async fn open_office_calendar() -> CommandResult<()> {
    open::that(format!("{SERVER_ORIGIN}/calendar"))
        .map_err(|_| CommandError::new("OPEN_BROWSER_FAILED", "교무실 페이지를 열지 못했습니다."))
}

#[tauri::command]
pub async fn poll_device_connection(state: State<'_, ApiState>) -> CommandResult<PollStatus> {
    let mut auth = state.auth.lock().await;
    let pending = auth
        .pending
        .clone()
        .ok_or_else(|| CommandError::new("NO_PENDING_CONNECTION", "새 연결을 시작해 주세요."))?;
    if pending.expires_at <= unix_seconds() {
        auth.pending = None;
        return Err(CommandError::new(
            "EXPIRED_TOKEN",
            "연결 코드가 만료되었습니다.",
        ));
    }
    let response = state
        .client
        .post(format!("{SERVER_ORIGIN}/api/widget/device/token"))
        .json(
            &serde_json::json!({ "grant_type": DEVICE_GRANT, "device_code": pending.device_code }),
        )
        .send()
        .await
        .map_err(|_| CommandError::network())?;
    if !response.status().is_success() {
        let status = response.status();
        let parsed = response.json::<ErrorEnvelope>().await.ok();
        if let Some(body) = parsed {
            if body.error.code == "AUTHORIZATION_PENDING" || body.error.code == "SLOW_DOWN" {
                let retry_after = body.error.retry_after.unwrap_or(pending.interval).max(5);
                if let Some(current) = auth.pending.as_mut() {
                    current.interval = retry_after;
                }
                return Ok(PollStatus {
                    status: "pending".to_string(),
                    retry_after,
                });
            }
            if body.error.code == "EXPIRED_TOKEN"
                || body.error.code == "ACCESS_DENIED"
                || body.error.code == "INVALID_GRANT"
            {
                auth.pending = None;
            }
            return Err(CommandError::new(&body.error.code, body.error.message));
        }
        return Err(CommandError::new(
            if status == StatusCode::TOO_MANY_REQUESTS {
                "RATE_LIMITED"
            } else {
                "CONNECTION_FAILED"
            },
            "기기 연결을 확인하지 못했습니다.",
        ));
    }
    let tokens = response
        .json::<TokenResponse>()
        .await
        .map_err(|_| CommandError::new("INVALID_RESPONSE", "서버 인증 응답을 읽지 못했습니다."))?;
    apply_tokens(&mut auth, tokens)?;
    Ok(PollStatus {
        status: "connected".to_string(),
        retry_after: 0,
    })
}

#[tauri::command]
pub async fn fetch_calendar(
    from: String,
    to: String,
    state: State<'_, ApiState>,
) -> CommandResult<CalendarResponse> {
    let access_token = {
        let mut auth = state.auth.lock().await;
        refresh_access(&state, &mut auth).await?
    };
    let response = state
        .client
        .get(format!("{SERVER_ORIGIN}/api/widget/calendar"))
        .query(&[("from", from), ("to", to)])
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|_| CommandError::network())?;
    if !response.status().is_success() {
        let status = response.status();
        let error = response_error(response, "CALENDAR_FAILED").await;
        if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
            let _ = delete_refresh_token();
            let mut auth = state.auth.lock().await;
            auth.access_token = None;
            auth.access_expires_at = 0;
        }
        return Err(error);
    }
    response
        .json::<CalendarResponse>()
        .await
        .map_err(|_| CommandError::new("INVALID_RESPONSE", "학사일정 응답을 읽지 못했습니다."))
}

#[tauri::command]
pub async fn logout(state: State<'_, ApiState>) -> CommandResult<()> {
    let refresh_token = read_refresh_token()?;
    if let Some(token) = refresh_token {
        let _ = state
            .client
            .post(format!("{SERVER_ORIGIN}/api/widget/device/revoke"))
            .json(&serde_json::json!({ "refresh_token": token }))
            .send()
            .await;
    }
    delete_refresh_token()?;
    *state.auth.lock().await = AuthState::default();
    Ok(())
}
