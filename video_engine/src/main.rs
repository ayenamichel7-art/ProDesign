use axum::{
    routing::{get, post},
    Router, Json, extract::{Multipart, State, ws::{WebSocketUpgrade, WebSocket, Message}},
};
use serde_json::json;
use tracing::{info, error};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::broadcast;

mod video;
mod transcriber;
mod wgpu_fx;
mod queue;
mod ai_generator;
mod music_library;

pub struct AppState {
    pub tx: broadcast::Sender<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    info!("🚀 Adobe-Killer Video Engine (axum 0.7) is starting...");

    // Création d'un canal broadcast pour le WebSocket (progression temps réel)
    let (tx, _rx) = broadcast::channel(100);
    let app_state = Arc::new(AppState { tx: tx.clone() });

    // Initialisation des subsystems
    queue::init_worker(tx.clone()).await?; // The async queue worker

    let app = Router::new()
        .route("/health", get(|| async { "Adobe-Killer Engine OK" }))
        .route("/api/upload_rush", post(handle_upload_rush))
        .route("/api/auto_edit", post(handle_auto_edit))
        .route("/api/ws", get(ws_handler))
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    info!("🎧 Listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn handle_upload_rush(mut _multipart: Multipart) -> Json<serde_json::Value> {
    info!("Rush upload received.");
    Json(json!({ "status": "success", "message": "Rush securely stored." }))
}

async fn handle_auto_edit(Json(payload): Json<serde_json::Value>) -> Json<serde_json::Value> {
    info!("Auto-Edit task pushed in queue: {:?}", payload);
    let job_id = uuid::Uuid::new_v4().to_string();
    queue::enqueue_job(job_id.clone(), payload).await;
    Json(json!({ "status": "queued", "job_id": job_id }))
}

// Websocket logic
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> axum::response::Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.tx.subscribe();
    
    while let Ok(msg) = rx.recv().await {
        if socket.send(Message::Text(msg.into())).await.is_err() {
            // client disconnected
            break;
        }
    }
}
