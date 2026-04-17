mod models;
mod auth;
mod services;

use axum::{
    extract::{Json, State},
    routing::{get, post},
    Router,
    response::{IntoResponse, Response},
    extract::Path,
    http::StatusCode,
    middleware,
};
use axum::http::{Method, HeaderValue, header::{AUTHORIZATION, CONTENT_TYPE}};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use std::net::SocketAddr;
use std::sync::Arc;
use uuid::Uuid;
use printpdf::{self, PdfDocument, Mm, PdfLayerReference, BuiltinFont, ImageTransform, Rgb, Point, Line, Color as PdfColor, Rect as PdfRect};
use std::io::{BufWriter, Write};
use std::fs::File;
use textwrap;

use tiny_skia::{Pixmap, Paint, PixmapPaint, FillRule, Stroke, PathBuilder, PremultipliedColorU8, Transform};
use ab_glyph::{FontRef, Font, PxScale, ScaleFont};
use base64::Engine;
use printpdf::image_crate::GenericImageView;
use qrcode::QrCode;
use walkdir::WalkDir;
use chrono::{Utc, Duration};
use anyhow::Result as AnyResult;

use models::*;
use auth::{register_handler, login_handler, auth_middleware};

fn draw_qr_code(pixmap: &mut Pixmap, url: &str, x: f32, y: f32, size: f32) {
    if let Ok(code) = QrCode::new(url.as_bytes()) {
        let qw = code.width();
        let cell_size = size / qw as f32;

        let mut paint = Paint::default();
        paint.set_color(tiny_skia::Color::WHITE);
        if let Some(rect) = tiny_skia::Rect::from_xywh(x - 5.0, y - 5.0, size + 10.0, size + 10.0) {
            pixmap.fill_rect(rect, &paint, tiny_skia::Transform::identity(), None);
        }

        paint.set_color(tiny_skia::Color::BLACK);
        let colors = code.to_colors();
        for (i, color) in colors.iter().enumerate() {
            if *color == qrcode::Color::Dark {
                let nx = i % qw;
                let ny = i / qw;
                if let Some(rect) = tiny_skia::Rect::from_xywh(x + nx as f32 * cell_size, y + ny as f32 * cell_size, cell_size + 0.5, cell_size + 0.5) {
                    pixmap.fill_rect(rect, &paint, tiny_skia::Transform::identity(), None);
                }
            }
        }
    }
}

pub struct AppState {
    pub font_data: std::collections::HashMap<String, Vec<u8>>,
    pub redis_client: redis::Client,
    pub pg_pool: sqlx::PgPool,
    pub s3_storage: services::storage::S3Storage,
    pub start_time: std::time::Instant,
    pub jwt_secret: String,
}

// ============================================================
// POINT D'ENTRÉE
// ============================================================

#[tokio::main]
async fn main() -> AnyResult<()> {
    tracing_subscriber::fmt::init();

    let mut fonts = std::collections::HashMap::new();

    // 1. Scanner les dossiers de polices
    let font_dirs = ["./fonts", "/app/system_fonts"];
    for dir in font_dirs {
        if std::path::Path::new(dir).exists() {
            println!("🔍 Scanning font directory: {}", dir);
            for entry in WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        let ext_str = ext.to_string_lossy().to_lowercase();
                        if ext_str == "ttf" || ext_str == "otf" {
                            match std::fs::read(path) {
                                Ok(data) => {
                                    let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                                    fonts.insert(name, data);
                                }
                                Err(e) => eprintln!("⚠️ Failed to read font at {:?}: {}", path, e),
                            }
                        }
                    }
                }
            }
        }
    }
    
    println!("✅ Indexed {} fonts", fonts.len());

    // 2. Fallbacks
    if fonts.is_empty() {
        let candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ];
        for path in candidates {
            if let Ok(data) = std::fs::read(path) {
                fonts.insert("System".to_string(), data);
                break;
            }
        }
    }

    if fonts.is_empty() {
        return Err(anyhow::anyhow!("No usable fonts found. Engine cannot start."));
    }

    let _ = dotenvy::dotenv();

    let redis_url = std::env::var("REDIS_URL").map_err(|_| anyhow::anyhow!("REDIS_URL is required"))?;
    let client = redis::Client::open(redis_url).map_err(|e| anyhow::anyhow!("Invalid Redis URL: {}", e))?;
    
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| {
        eprintln!("⚠️ JWT_SECRET not set, using default for development only!");
        "dev_secret_change_me_in_prod".to_string()
    });

    let database_url = std::env::var("DATABASE_URL").map_err(|_| anyhow::anyhow!("DATABASE_URL is required"))?;
    let pg_pool = services::db::init_db(&database_url).await.map_err(|e| anyhow::anyhow!("Postgres init failed: {}", e))?;

    let minio_endpoint = std::env::var("MINIO_ENDPOINT").unwrap_or_else(|_| "minio:9000".to_string());
    let minio_access = std::env::var("MINIO_ACCESS_KEY").unwrap_or_default();
    let minio_secret = std::env::var("MINIO_SECRET_KEY").unwrap_or_default();
    
    let s3_storage = services::storage::S3Storage::new(&minio_endpoint, &minio_access, &minio_secret, "prodesign")
        .map_err(|e| anyhow::anyhow!("MinIO init failed: {}", e))?;

    let app_state = Arc::new(AppState { 
        font_data: fonts,
        redis_client: client,
        pg_pool,
        s3_storage,
        start_time: std::time::Instant::now(),
        jwt_secret,
    });

    println!("🚀 PRO-DESIGN BACKEND v2.1 – STABLE BUILD – INITIATED");
    let _ = std::fs::create_dir_all("./outputs");

    // ── CORS SÉCURISÉ ──
    let allowed_origins: Vec<HeaderValue> = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000,http://localhost:8080".to_string())
        .split(',')
        .filter_map(|o| o.trim().parse::<HeaderValue>().ok())
        .collect();

    let cors_layer = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);

    // ── ROUTES PUBLIQUES (pas d'auth) ──
    let public_routes = Router::new()
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/login", post(login_handler))
        .route("/api/fonts", get(list_fonts_handler))
        .route("/api/share/:token", get(get_share_handler))
        .route("/api/share/view/:id", get(view_share))
        .route("/api/pay/fedapay-webhook", post(fedapay_webhook_handler));

    // ── ROUTES PROTÉGÉES (JWT obligatoire) ──
    let protected_routes = Router::new()
        .route("/api/generate", post(generate_handler))
        .route("/api/rush", post(rush_handler))
        .route("/api/campaign", post(campaign_handler))
        .route("/api/photo-studio", post(photo_studio_handler))
        .route("/api/brand-identity", post(brand_identity_handler))
        .route("/api/brand-mockups", post(brand_mockups_handler))
        .route("/api/remove-bg", post(remove_bg_handler))
        .route("/api/share", post(create_share_handler))
        .route("/api/pay/fedapay", post(create_fedapay_checkout))
        .route("/api/feedback", post(feedback_handler))
        .route("/api/document/compose", post(document_compose_handler))
        .route("/api/presentation/generate", post(presentation_generate_handler))
        .layer(middleware::from_fn_with_state(app_state.clone(), auth_middleware));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .nest_service("/outputs", ServeDir::new("outputs"))
        .nest_service("/assets", ServeDir::new("assets"))
        .layer(cors_layer)
        .with_state(app_state)
        .fallback(get(|| async { "ProDesign API v2.1 – Secured Engine" }));

    // ── TASK: Nettoyage Disque Automatique (Toutes les heures) ──
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
            if let Ok(mut entries) = tokio::fs::read_dir("./outputs").await {
                while let Ok(Some(entry)) = entries.next_entry().await {
                    if let Ok(meta) = entry.metadata().await {
                        if let Ok(modified) = meta.modified() {
                            if let Ok(age) = modified.elapsed() {
                                if age.as_secs() > 3600 {
                                    let _ = tokio::fs::remove_file(entry.path()).await;
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("🚀 ProDesign v2.0 lancé sur http://localhost:8080");
    println!("   Supports: Logo, Photo de fond, Campagnes, Photo Studio (Lightroom), Webhooks FedaPay");

    let listener = tokio::net::TcpListener::bind(addr).await
        .map_err(|e| anyhow::anyhow!("Failed to bind port 8080: {}", e))?;
    
    axum::serve(listener, app).await.map_err(|e| anyhow::anyhow!("Server runtime error: {}", e))?;
    
    Ok(())
}

async fn list_fonts_handler(
    State(state): State<Arc<AppState>>,
) -> Response {
    let mut names: Vec<String> = state.font_data.keys().cloned().collect();
    names.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Json(names).into_response()
}

// Auth handlers importés depuis auth.rs

async fn remove_bg_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RemoveBgRequest>,
) -> Response {
    let mut con = match state.redis_client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::SERVICE_UNAVAILABLE, "Redis service unavailable").into_response(),
    };

    let id = Uuid::new_v4().to_string();
    let in_path = format!("./outputs/in_bg_{}.png", id);
    let out_path = format!("./outputs/out_bg_{}.png", id);

    let clean_b64 = match payload.image_base64.split(',').nth(1) {
        Some(s) => s,
        None => &payload.image_base64,
    }.trim();
        
    let img_data = match base64::engine::general_purpose::STANDARD.decode(clean_b64) {
        Ok(d) => d,
        Err(_) => match base64::engine::general_purpose::STANDARD_NO_PAD.decode(clean_b64) {
            Ok(d) => d,
            Err(_) => return (StatusCode::BAD_REQUEST, "Invalid image base64 encoding").into_response(),
        }
    };
        
    if let Err(e) = std::fs::write(&in_path, &img_data) {
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("Disk I/O error: {}", e)).into_response();
    }

    let job = serde_json::json!({
        "job_type": "remove_bg",
        "input": format!("/app/outputs/in_bg_{}.png", id),
        "output": format!("/app/outputs/out_bg_{}.png", id)
    });
    
    if let Err(e) = redis::AsyncCommands::rpush::<&str, String, ()>(&mut con, "image_processing_queue", job.to_string()).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to queue job: {}", e)).into_response();
    }

    // Polling du fichier de sortie
    for _ in 0..120 { 
        if std::path::Path::new(&out_path).exists() {
            return Json(RemoveBgResponse {
                url: format!("/outputs/out_bg_{}.png", id)
            }).into_response();
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    }

    (StatusCode::GATEWAY_TIMEOUT, "Background processing timed out").into_response()
}

#[axum::debug_handler]
async fn document_compose_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DocumentRequest>,
) -> Response {
    let pdf_id = Uuid::new_v4().to_string();
    let filename = format!("outputs/doc_{}.pdf", pdf_id);
    
    // 1. Générer la Couverture avec notre moteur algorithmique (Format A4 vertical ~ 1240 x 1754 px)
    // Cette étape est synchrone.
    let cover_req = DesignRequest {
        title: payload.title.clone(),
        overtitle: payload.overtitle.clone(),
        subtitle: payload.subtitle.clone(),
        text: None,
        context: Some(payload.institution.clone().unwrap_or_default()),
        primary_color: payload.theme_color.clone(),
        theme: payload.theme_color.clone(),
        font_family: Some("auto".to_string()),
        logo_base_64: None,
        background_base_64: None,
        extra_info: Some(format!("Généré par ProDesign AI")),
        inspiration_base_64: None,
        style: Some(payload.style.clone()),
        format: None,
        qr_code_url: None,
        web_dimension: None,
        is_print: false,
    };

    let (_, cover_bytes) = match create_composition(&cover_req, &state, 1240, 1754) {
        Ok(r) => r,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Erreur de génération de couverture").into_response(),
    };

    // 2. Génération du PDF (Isolée pour garantir le Drop avant l'upload S3 asynchrone)
    let pdf_bytes = {
        let (doc, page1, layer1) = PdfDocument::new(&payload.title, Mm(210.0), Mm(297.0), "Cover Layer");
        let current_layer = doc.get_page(page1).get_layer(layer1);

        // Incruster la Couverture Dimensionnée
        if !cover_bytes.is_empty() {
            if let Ok(pdf_dyn_img) = printpdf::image_crate::load_from_memory(&cover_bytes) {
                let pdf_image = printpdf::Image::from_dynamic_image(&pdf_dyn_img);
                pdf_image.add_to_layer(current_layer, ImageTransform {
                    translate_x: Some(Mm(0.0)),
                    translate_y: Some(Mm(0.0)),
                    scale_x: Some(0.48), 
                    scale_y: Some(0.48),
                    ..Default::default()
                });
            }
        }

        // 3. Typogaphie
        let font_body = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
        let font_title = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();
        let font_italic = doc.add_builtin_font(BuiltinFont::HelveticaOblique).unwrap();
        
        let mut toc_entries = Vec::new();
        let mut page_count = 1;

        // 4. Moteur de Pagination
        for (i, chapter) in payload.chapters.iter().enumerate() {
            page_count += 1;
            let (mut current_page, mut current_layer_id) = doc.add_page(Mm(210.0), Mm(297.0), format!("Chapter {}", i));
            toc_entries.push((chapter.title.clone(), page_count));
            
            let mut layer = doc.get_page(current_page).get_layer(current_layer_id);
            let mut cursor_y = 270.0;
            
            if let Some(ref wm_text) = payload.watermark {
                layer.save_graphics_state();
                layer.set_fill_color(PdfColor::Rgb(Rgb::new(0.9, 0.9, 0.9, None)));
                layer.use_text(wm_text.to_uppercase(), 60.0, Mm(30.0), Mm(100.0), &font_title); 
                layer.restore_graphics_state();
            }

            layer.use_text(format!("CHAPITRE {} : {}", i + 1, chapter.title.to_uppercase()), 18.0, Mm(25.0), Mm(cursor_y as f32), &font_title);
            cursor_y -= 15.0;
            
            let line = Line {
                points: vec![
                    (Point::new(Mm(25.0), Mm(cursor_y as f32 + 5.0)), false),
                    (Point::new(Mm(185.0), Mm(cursor_y as f32 + 5.0)), false),
                ],
                is_closed: false,
            };
            layer.add_line(line);
            cursor_y -= 10.0;
            
            let wrapped_text = textwrap::fill(&chapter.content, 85);
            for line_text in wrapped_text.lines() {
                if cursor_y < 35.0 { 
                    if payload.include_pagination.unwrap_or(true) {
                        layer.use_text(format!("Page {}", page_count), 9.0, Mm(180.0), Mm(15.0), &font_body);
                    }
                    let (new_page, new_layer_id) = doc.add_page(Mm(210.0), Mm(297.0), format!("Content {} Cont", i));
                    page_count += 1;
                    current_page = new_page;
                    current_layer_id = new_layer_id;
                    layer = doc.get_page(current_page).get_layer(current_layer_id);
                    cursor_y = 270.0;
                }
                layer.use_text(line_text.trim(), 11.0, Mm(25.0), Mm(cursor_y as f32), &font_body);
                cursor_y -= 6.0;
            }

            if payload.include_pagination.unwrap_or(true) {
                layer.use_text(format!("Page {}", page_count), 9.0, Mm(180.0), Mm(15.0), &font_body);
            }
        }

        if payload.include_toc.unwrap_or(true) {
            let (toc_page, toc_layer_id) = doc.add_page(Mm(210.0), Mm(297.0), "Table of Contents");
            let toc_layer = doc.get_page(toc_page).get_layer(toc_layer_id);
            toc_layer.use_text("SOMMAIRE RÉCAPITULATIF", 20.0, Mm(25.0), Mm(260.0), &font_title);
            let mut toc_y = 240.0;
            for (title, page_num) in toc_entries {
                toc_layer.use_text(format!("{} .................... p.{}", title.to_uppercase(), page_num), 12.0, Mm(25.0), Mm(toc_y), &font_body);
                toc_y -= 10.0;
            }
        }

        let mut b = Vec::new();
        {
            let mut writer = std::io::BufWriter::new(&mut b);
            doc.save(&mut writer).unwrap_or_default();
        }
        b
    };

    // 5. Upload vers MinIO S3 (.await possible maintenant que 'doc' est drop)
    let s3_path = format!("doc_{}.pdf", pdf_id);
    let final_url = match state.s3_storage.upload_file(&s3_path, &pdf_bytes, "application/pdf").await {
        Ok(s3_url) => s3_url,
        Err(e) => {
            eprintln!("⚠️ S3 Upload failed: {}, using local fallback", e);
            format!("/outputs/doc_{}.pdf", pdf_id)
        }
    };
    
    let uuid_val = match uuid::Uuid::parse_str(&pdf_id) {
        Ok(u) => u,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "UUID collision error").into_response(),
    };

    if let Err(e) = sqlx::query("INSERT INTO documents (id, title, url, doc_type) VALUES ($1, $2, $3, 'pdf')")
        .bind(uuid_val).bind(&payload.title).bind(&final_url)
        .execute(&state.pg_pool).await {
            eprintln!("❌ Database error: {}", e);
        }

    Json(DocumentResponse { pdf_id: pdf_id.clone(), url: final_url }).into_response()
}

async fn feedback_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<FeedbackRequest>,
) -> Response {
    use redis::AsyncCommands;
    match state.redis_client.get_multiplexed_async_connection().await {
        Ok(mut con) => {
            match serde_json::to_string(&payload) {
                Ok(feedback_json) => {
                    if let Err(e) = con.rpush::<&str, String, ()>("feedback_queue", feedback_json).await {
                        (StatusCode::INTERNAL_SERVER_ERROR, format!("Redis queue error: {}", e)).into_response()
                    } else {
                        (StatusCode::OK, "Feedback envoyé avec succès").into_response()
                    }
                }
                Err(_) => (StatusCode::BAD_REQUEST, "Invalid feedback payload").into_response()
            }
        }
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, "Redis connection failed").into_response()
    }
}

async fn photo_studio_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PhotoStudioRequest>,
) -> Response {
    use redis::AsyncCommands;
    let mut con = match state.redis_client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(_) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Redis indisponible").into_response(),
    };
    
    let mut results = Vec::new();

    for img_b64 in payload.images_base64 {
        let id = Uuid::new_v4().to_string();
        let _ = std::fs::create_dir_all("./outputs");
        let input_path = format!("./outputs/raw_{}.png", id);
        let output_path = format!("./outputs/pro_{}.png", id);

        // Sauvegarder le raw
        if let Some(pos) = img_b64.find(',') {
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(&img_b64[pos + 1..]) {
                let _ = std::fs::write(&input_path, bytes);
            }
        }

        // Pousser le job dans Redis pour le Worker Python Pro
        let job = serde_json::json!({
            "input": input_path,
            "output": output_path,
            "config": payload.config
        });

        let _: () = con.rpush("image_processing_queue", job.to_string()).await.unwrap_or_default();
        
        let url = format!("/outputs/pro_{}.png", id);
        results.push(DesignResponse {
            poster_id: id,
            url
        });
    }

    Json(RushResponse { results }).into_response()
}

async fn create_share_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateShareRequest>,
) -> impl IntoResponse {
    use redis::AsyncCommands;
    let mut con = state.redis_client.get_multiplexed_async_connection().await.expect("Redis connection failed");
    
    let token = Uuid::new_v4().to_string();
    let days = payload.days.unwrap_or(7);
    let expiry = Utc::now() + Duration::days(days);
    
    let share = ShareLink {
        id: token.clone(),
        photo_ids: payload.photo_ids,
        expires_at: expiry.timestamp(),
    };

    let serialized = serde_json::to_string(&share).unwrap_or_default();
    let _: () = con.set_ex(&format!("share:{}", token), serialized, (days * 24 * 3600) as usize).await.unwrap_or_default();

    let share_url = format!("/share/{}", token);
    Json(ShareResponse { share_url, expires_at: expiry.timestamp() }).into_response()
}

async fn get_share_handler(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
) -> Response {
    use redis::AsyncCommands;
    let mut con = state.redis_client.get_multiplexed_async_connection().await.expect("Redis connection failed");
    
    let data: Option<String> = con.get(&format!("share:{}", token)).await.unwrap_or_default();
    
    match data {
        Some(json_str) => {
            let share: ShareLink = serde_json::from_str(&json_str).unwrap();
            let mut results = Vec::new();
            for id in share.photo_ids {
                results.push(DesignResponse {
                    poster_id: id.clone(),
                    url: format!("/outputs/pro_{}.png", id),
                });
            }
            Json(RushResponse { results }).into_response()
        }
        None => {
            (axum::http::StatusCode::NOT_FOUND, "Lien expiré ou invalide").into_response()
        }
    }
}

async fn view_share(
    Path(id): Path<String>,
) -> Response {
    format!("ProDesign Share Viewer – Visualizing project: {}", id).into_response()
}

async fn track_event(redis_client: &redis::Client, event: &str) {
    if let Ok(mut con) = redis_client.get_multiplexed_async_connection().await {
        use redis::AsyncCommands;
        let today = Utc::now().format("%Y-%m-%d").to_string();
        let _: () = con.hincr(&format!("stats:{}", today), event, 1).await.unwrap_or_default();
        let _: () = con.incr("stats:total_actions", 1).await.unwrap_or_default();
    }
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

async fn upload_and_persist_image(id: String, title: &str, bytes: Vec<u8>, state: &Arc<AppState>, doc_type: &str) -> String {
    let s3_path = format!("{}_{}.png", doc_type, id);
    let final_url = match state.s3_storage.upload_file(&s3_path, &bytes, "image/png").await {
        Ok(url) => url,
        Err(e) => {
            println!("⚠️ Erreur MinIO (Image), fallback FS local: {}", e);
            let _ = std::fs::create_dir_all("./outputs");
            let fallback_path = format!("./outputs/{}", s3_path);
            let _ = std::fs::write(&fallback_path, &bytes);
            format!("/outputs/{}", s3_path)
        }
    };

    let uuid_val = uuid::Uuid::parse_str(&id).unwrap_or_else(|_| uuid::Uuid::new_v4());
    let _ = sqlx::query("INSERT INTO documents (id, title, url, doc_type) VALUES ($1, $2, $3, $4)")
        .bind(uuid_val)
        .bind(title)
        .bind(&final_url)
        .bind(doc_type)
        .execute(&state.pg_pool).await;

    final_url
}

async fn generate_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DesignRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    track_event(&state.redis_client, "generate_single").await;
    let mut w = 1080;
    let mut h = 1920;
    
    if let Some(dim) = &payload.web_dimension {
        if dim == "1080x1080" { w = 1080; h = 1080; }
        else if dim == "1080x1350" { w = 1080; h = 1350; }
    } else if let Some(format) = &payload.format {
        if format == "a4" { w = 2480; h = 3508; }
        else if format == "a3" { w = 3508; h = 4961; }
    }
    
    let state_for_task = state.clone();
    let payload_for_task = payload.clone();
    
    let result = tokio::task::spawn_blocking(move || {
        create_composition(&payload_for_task, &state_for_task, w, h)
    }).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erreur spawn : {}", e)))?
      .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Echec composition : {}", e)))?;

    let (id, png_bytes) = result;
    let url = upload_and_persist_image(id.clone(), &payload.title, png_bytes, &state, "design").await;
    Ok(Json(DesignResponse { poster_id: id, url }))
}

// Handler helper pour transformer Result en Response
impl IntoResponse for (StatusCode, String) {
    fn into_response(self) -> Response {
        (self.0, self.1).into_response()
    }
}

async fn rush_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DesignRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let formats = vec![
        ("post".to_string(), 1080, 1080),  
        ("story".to_string(), 1080, 1920), 
        ("flyer".to_string(), 2480, 3508), 
    ];

    let mut results = Vec::new();
    for (name, w, h) in formats {
        let state_for_task = state.clone();
        let payload_for_task = payload.clone();
        
        let result = tokio::task::spawn_blocking(move || {
            create_composition(&payload_for_task, &state_for_task, w as u32, h as u32)
        }).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erreur spawn : {}", e)))?
          .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Echec composition : {}", e)))?;

        let (id, png_bytes) = result;
        let poster_id = format!("{}_{}", name, id);
        let url = upload_and_persist_image(poster_id.clone(), &payload.title, png_bytes, &state, "rush").await;
        results.push(DesignResponse { poster_id, url });
    }

    Ok(Json(RushResponse { results }))
}

async fn campaign_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CampaignRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let formats = vec![
        ("post", 1080, 1080),  
        ("story", 1080, 1920), 
    ];

    let mut results = Vec::new();

    let items = if payload.products.is_empty() {
        vec![payload.base.title.clone()]
    } else {
        payload.products.clone()
    };

    for product in items {
        let mut req = payload.base.clone();
        req.title = product.clone();

        for (name, fw, fh) in &formats {
            let state_for_task = state.clone();
            let req_for_task = req.clone();
            let fw_val = *fw;
            let fh_val = *fh;

            let result = tokio::task::spawn_blocking(move || {
                create_composition(&req_for_task, &state_for_task, fw_val as u32, fh_val as u32)
            }).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erreur spawn : {}", e)))?
              .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Echec campaign : {}", e)))?;

            let (id_val, png_bytes) = result;
            let poster_id = format!("{}_{}_{}", name, product.replace(" ", "-").to_lowercase(), id_val.chars().take(4).collect::<String>());
            let url = upload_and_persist_image(poster_id.clone(), &req.title, png_bytes, &state, "campaign").await;
            results.push(DesignResponse { poster_id, url });
        }
    }

    Ok(Json(RushResponse { results }))
}

// ============================================================
// LOGO & BRAND IDENTITY ENGINE
// ============================================================

async fn brand_identity_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LogoRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    track_event(&state.redis_client, "generate_brand_identity").await;
    let mut results = Vec::new();
    
    let variants = vec!["accent", "black", "white"];
    for var in variants {
        let state_for_task = state.clone();
        let payload_for_task = payload.clone();
        let var_name = var.to_string();
        
        let result = tokio::task::spawn_blocking(move || {
            create_logo(&payload_for_task, &state_for_task, &var_name)
        }).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erreur spawn : {}", e)))?
          .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Echec logo : {}", e)))?;

        let (id, bytes) = result;
        let url = upload_and_persist_image(id.clone(), &payload.name, bytes, &state, &format!("logo_{}", var)).await;
        results.push(DesignResponse { poster_id: id, url });
    }

    let identity = BrandIdentity {
        primary_hex: payload.primary_color.clone(),
        palette: payload.secondary_colors.clone(),
        typography: vec!["Montserrat".to_string(), "Inter".to_string()],
        logo_variants: results,
        usage_guideline: "Espace de sécurité de 50px requis. Ne pas déformer.".to_string(),
        idea_brief: payload.idea_context.clone(),
    };

    Ok(Json(identity))
}

async fn brand_mockups_handler(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<MockupRequest>,
) -> Response {
    let mut results = Vec::new();
    
    // 4. Mockup Billboard (Roll-up Banner)
    let (id4, url4) = create_mockup(&payload.url, "assets/mockups/billboard_bg.jfif", 500.0, 400.0, 200.0);
    if id4 != "error" { results.push(DesignResponse { poster_id: id4, url: url4 }); }

    // 5. Mockup Coffee Mug (Black Matte)
    let (id5, url5) = create_mockup(&payload.url, "assets/mockups/mug_bg.jfif", 500.0, 450.0, 150.0);
    if id5 != "error" { results.push(DesignResponse { poster_id: id5, url: url5 }); }

    // 6. Mockup Cap (Baseball)
    let (id6, url6) = create_mockup(&payload.url, "assets/mockups/cap_bg.jfif", 500.0, 400.0, 180.0);
    if id6 != "error" { results.push(DesignResponse { poster_id: id6, url: url6 }); }

    // 7. Mockup Storefront Signage
    let (id7, url7) = create_mockup(&payload.url, "assets/mockups/storefront_bg.jfif", 600.0, 300.0, 300.0);
    if id7 != "error" { results.push(DesignResponse { poster_id: id7, url: url7 }); }

    // 8. Mockup ID Card (Orange 3D)
    let (id8, url8) = create_mockup(&payload.url, "assets/mockups/idcard_bg.jfif", 500.0, 500.0, 160.0);
    if id8 != "error" { results.push(DesignResponse { poster_id: id8, url: url8 }); }

    Json(RushResponse { results }).into_response()
}

fn create_mockup(logo_url: &str, template_path: &str, x: f32, y: f32, size: f32) -> (String, String) {
    let template_img = match printpdf::image_crate::open(template_path) {
        Ok(img) => img,
        Err(_) => return ("error".to_string(), "".to_string()),
    };
    let (w, h) = template_img.dimensions();
    let mut pixmap = Pixmap::new(w, h).unwrap();
    
    // Charger le template
    let template_rgba = template_img.to_rgba8();
    for (i, p) in template_rgba.pixels().enumerate() {
        let a = p[3] as f32 / 255.0;
        pixmap.pixels_mut()[i] = PremultipliedColorU8::from_rgba((p[0] as f32 * a) as u8, (p[1] as f32 * a) as u8, (p[2] as f32 * a) as u8, p[3]).unwrap();
    }

    // Overlay du logo
    let logo_path = format!(".{}", logo_url);
    if let Ok(logo_img) = printpdf::image_crate::open(&logo_path) {
        let resized_logo = logo_img.resize(size as u32, size as u32, printpdf::image_crate::imageops::FilterType::Lanczos3);
        let (lw, lh) = resized_logo.dimensions();
        let mut logo_pixmap = Pixmap::new(lw, lh).unwrap();
        let logo_rgba = resized_logo.to_rgba8();
        for (i, p) in logo_rgba.pixels().enumerate() {
            let a = p[3] as f32 / 255.0;
            logo_pixmap.pixels_mut()[i] = PremultipliedColorU8::from_rgba((p[0] as f32 * a) as u8, (p[1] as f32 * a) as u8, (p[2] as f32 * a) as u8, p[3]).unwrap();
        }
        pixmap.draw_pixmap((x - lw as f32 / 2.0) as i32, (y - lh as f32 / 2.0) as i32, logo_pixmap.as_ref(), &PixmapPaint::default(), Transform::identity(), None);
    }

    let id = Uuid::new_v4().to_string();
    let out_path = format!("./outputs/mockup_{}.png", id);
    let url_path = format!("/outputs/mockup_{}.png", id);
    pixmap.save_png(&out_path).unwrap();
    (id, url_path)
}

fn create_logo(req: &LogoRequest, state: &AppState, style_variant: &str) -> AnyResult<(String, Vec<u8>)> {
    let w = 1000;
    let h = 1000;
    let mut pixmap = Pixmap::new(w, h).unwrap();
    
    let canvas_bg = if style_variant == "white" {
        let (r, g, b) = hex_to_rgb(&req.primary_color);
        tiny_skia::Color::from_rgba8(r, g, b, 255)
    } else {
        tiny_skia::Color::TRANSPARENT
    };
    pixmap.fill(canvas_bg);

    let main_color = if style_variant == "black" {
        tiny_skia::Color::from_rgba8(0, 0, 0, 255)
    } else if style_variant == "white" {
        tiny_skia::Color::WHITE
    } else {
        let (r, g, b) = hex_to_rgb(&req.primary_color);
        tiny_skia::Color::from_rgba8(r, g, b, 255)
    };

    let font_bytes = state.font_data.get("Montserrat").or_else(|| state.font_data.values().next()).expect("No font");
    let font = FontRef::try_from_slice(font_bytes).unwrap();

    let mut paint = Paint::default();
    paint.set_color(main_color);
    paint.anti_alias = true;

    // Dessin de l'icône minimaliste (Cercle avec Initiale)
    let mut path = PathBuilder::new();
    path.push_circle(500.0, 400.0, 150.0);
    let path = path.finish().unwrap();
    pixmap.fill_path(&path, &paint, FillRule::Winding, tiny_skia::Transform::identity(), None);

    // Dessin du texte
    let scale = PxScale::from(120.0);
    let name_up = req.name.to_uppercase();
    let text_x = 500.0 - (name_up.len() as f32 * 35.0);
    
    draw_text_raster(&mut pixmap, &font, &name_up, scale, text_x, 700.0, main_color);

    if let Some(slogan) = &req.slogan {
        let slogan_scale = PxScale::from(40.0);
        let slogan_up = slogan.to_lowercase();
        let slogan_x = 500.0 - (slogan_up.len() as f32 * 10.0);
        draw_text_raster(&mut pixmap, &font, &slogan_up, slogan_scale, slogan_x, 780.0, main_color);
    }

    let id = Uuid::new_v4().to_string();
    let png_bytes = pixmap.encode_png().map_err(|e| anyhow::anyhow!(e))?;
    Ok((id, png_bytes))
}

fn hex_to_rgb(hex: &str) -> (u8, u8, u8) {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 { return (255, 255, 255); }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255);
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255);
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255);
    (r, g, b)
}

// ============================================================
// MOTEUR DE COMPOSITION (AUTO-AJUSTEMENT)
// ============================================================

fn create_composition(payload: &DesignRequest, state: &Arc<AppState>, mut width: u32, mut height: u32) -> AnyResult<(String, Vec<u8>)> {
    let mut bleed = 0;
    if payload.is_print {
        bleed = 80; // ~6.8mm à 300 DPI (standard sécurité)
        width += bleed * 2;
        height += bleed * 2;
    }

    let id = Uuid::new_v4().to_string();
    let w = width as f32;
    let h = height as f32;
    let margin = w * 0.08;
    let mut pixmap = Pixmap::new(width, height).expect("Erreur Pixmap");

    let theme = payload.theme.to_lowercase();
    let style = payload.style.as_deref().unwrap_or("default").to_lowercase();

    // SÉLECTION DE LA POLICE ET STYLE
    let chosen_font_str = match payload.font_family.as_deref() {
        Some("Montserrat") => "Montserrat",
        Some("Playfair") => "Playfair",
        Some("Lato") => "Lato",
        Some("Cinzel") => "Cinzel",
        Some("System") => "System",
        Some(custom) if state.font_data.contains_key(custom) => custom,
        _ => {
            match theme.as_str() {
                "church" | "église" | "luxury" | "luxe" => "Playfair",
                "tech" | "événement" | "event" => "Montserrat",
                _ => "Lato", 
            }
        }
    };

    let selected_font_bytes = state.font_data.get(chosen_font_str)
        .or_else(|| state.font_data.values().next())
        .expect("Aucune police chargée");

    let font = FontRef::try_from_slice(selected_font_bytes).expect("Police invalide");
    
    // ── EXTRACTION DE COULEUR AUTOMATIQUE ────────────────────
    let mut primary_color = parse_hex_color(&payload.primary_color);
    if payload.primary_color.to_lowercase() == "auto" {
        if let Some(ref inspo_b64) = payload.inspiration_base_64 {
            primary_color = extract_dominant_color(inspo_b64);
        } else if let Some(ref logo_b64) = payload.logo_base_64 {
            primary_color = extract_dominant_color(logo_b64);
        } else if let Some(ref bg_b64) = payload.background_base_64 {
            primary_color = extract_dominant_color(bg_b64);
        }
    }
    let valid_primary_color = primary_color.unwrap_or(tiny_skia::Color::from_rgba8(0, 224, 255, 255));

    // ── 1. FOND ──────────────────────────────────────────────
    if let Some(ref bg_b64) = payload.background_base_64 {
        if let Some(bg_pixmap) = decode_base64_image(bg_b64, width, height) {
            pixmap.draw_pixmap(0, 0, bg_pixmap.as_ref(), &PixmapPaint::default(), tiny_skia::Transform::identity(), None);
        } else {
            fill_solid_background(&mut pixmap, w, h, theme.as_str());
        }
    } else {
        fill_solid_background(&mut pixmap, w, h, theme.as_str());
    }

    // ── 2. OVERLAY DÉGRADÉ ─────────
    draw_gradient_overlay(&mut pixmap, w, h);

    // ── 3. LOGO ──────────────────────────────────────────────
    let logo_bottom_y = if let Some(ref logo_b64) = payload.logo_base_64 {
        draw_logo(&mut pixmap, logo_b64, w, h, theme.as_str())
    } else {
        h * 0.08
    };

    // ── 4. RENDU SELON LE STYLE ─────────────────────────────
    if style == "brutalist" {
        render_brutalist_style(&mut pixmap, payload, &font, w, h, valid_primary_color);
    } else if style == "cyber" || style == "neon" {
        render_cyber_style(&mut pixmap, payload, &font, w, h, valid_primary_color);
    } else if style == "minimalist" || style == "modern" {
        render_minimalist_style(&mut pixmap, payload, &font, w, h, valid_primary_color);
    } else if style == "luxury" {
        render_luxury_style(&mut pixmap, payload, &font, w, h, valid_primary_color);
    } else {
        render_classic_style(&mut pixmap, payload, &font, w, h, valid_primary_color, logo_bottom_y);
    }

    // ── 6. FILIGRANE ─────────────────────────────────────────
    let wm_scale = PxScale::from((w * 0.02).max(18.0));
    draw_text_raster(&mut pixmap, &font, "Design by ProDesign SaaS", wm_scale, margin, h - (h * 0.03), tiny_skia::Color::from_rgba8(255, 255, 255, 40));

    // ── 7. CODE QR (OPTIONNEL) ──────────────────────────────
    if let Some(ref qr_url) = payload.qr_code_url {
        if !qr_url.is_empty() {
            let qr_size = w * 0.15;
            draw_qr_code(&mut pixmap, qr_url, w - margin - qr_size, h - margin - qr_size, qr_size);
        }
    }

    // ── 7bis. TRAITS DE COUPE & MIRES (MODE IMPRIMERIE) ──────
    if payload.is_print && bleed > 0 {
        draw_crop_marks(&mut pixmap, bleed as f32, w, h);
        draw_color_calibration_bars(&mut pixmap, w, h);
    }

    // ── 8. SAUVEGARDE EN MEMOIRE ────────────────────────────────────────
    let png_bytes = pixmap.encode_png().map_err(|e| anyhow::anyhow!(e))?;

    Ok((id, png_bytes))
}


// ── FONCTIONS DE RENDU STYLISTIQUES ──

fn render_classic_style(pixmap: &mut Pixmap, payload: &DesignRequest, font: &FontRef, w: f32, h: f32, color: tiny_skia::Color, logo_bottom: f32) {
    let margin = w * 0.08;
    let mut curr_y = if payload.background_base_64.is_some() { h * 0.45 } else { logo_bottom + h * 0.1 };
    
    // 1. TITRE (Principal)
    let title_size = calculate_font_size(&payload.title, w, 0.85);
    let title_scale = PxScale::from(title_size.clamp(w * 0.08, w * 0.22));
    draw_text_raster(pixmap, font, &payload.title, title_scale, margin, curr_y, tiny_skia::Color::WHITE);
    curr_y += title_scale.y * 0.5;

    // 2. SURTITRE (Petit, au dessus ou juste dessous - ici dessous selon liste utilisateur)
    if let Some(over) = &payload.overtitle {
        let over_scale = PxScale::from(w * 0.04);
        draw_text_raster(pixmap, font, &over.to_uppercase(), over_scale, margin, curr_y, color);
        curr_y += over_scale.y * 1.5;
    } else {
        curr_y += title_scale.y * 0.4;
    }

    // Ligne d'accent
    draw_accent_line(pixmap, margin, curr_y, w * 0.2, 8.0, color);
    curr_y += 30.0;
    
    // 3. SOUS-TITRE
    let sub_scale = PxScale::from(w * 0.05);
    draw_text_raster(pixmap, font, &payload.subtitle, sub_scale, margin, curr_y, tiny_skia::Color::WHITE);
    curr_y += sub_scale.y * 1.8;

    // 4. TEXTE (Détails)
    if let Some(txt) = &payload.text {
        let txt_scale = PxScale::from(w * 0.03);
        // On pourrait faire du wrap, mais ici on simplifie
        draw_text_raster(pixmap, font, txt, txt_scale, margin, curr_y, tiny_skia::Color::from_rgba8(200, 200, 200, 255));
        // Finalisation de la position pour le prochain bloc
        // (Note: curr_y += ... est déjà géré par les blocs de boucle)
    }

    // 5. CONTEXTE (Brief transformé en "Note" ou caché - l'utilisateur a dit de le disposer)
    if let Some(ctx) = &payload.context {
        let ctx_scale = PxScale::from(w * 0.025);
        draw_text_raster(pixmap, font, &format!("CONTEXTE: {}", ctx), ctx_scale, margin, h - (h * 0.12), tiny_skia::Color::from_rgba8(255, 255, 255, 100));
    }
}

fn render_minimalist_style(pixmap: &mut Pixmap, payload: &DesignRequest, font: &FontRef, w: f32, h: f32, color: tiny_skia::Color) {
    // Ultra-minimalist: Centré, petit titre mais beaucoup d'espace, typographie élégante
    let title_scale = PxScale::from(w * 0.12);
    let center_x = (w - (payload.title.len() as f32 * title_scale.x * 0.5)) / 2.0;
    draw_text_raster(pixmap, font, &payload.title, title_scale, center_x.max(w * 0.1), h * 0.45, tiny_skia::Color::WHITE);
    
    let sub_scale = PxScale::from(w * 0.03);
    let sub_x = (w - (payload.subtitle.len() as f32 * sub_scale.x * 0.5)) / 2.0;
    draw_text_raster(pixmap, font, &payload.subtitle.to_uppercase(), sub_scale, sub_x.max(w * 0.1), h * 0.52, color);
}

fn render_brutalist_style(pixmap: &mut Pixmap, payload: &DesignRequest, font: &FontRef, w: f32, h: f32, _color: tiny_skia::Color) {
    // Brutalist: Gros texte, bords, contrastes violents (Noir/Blanc/Vert fluo)
    let title_scale = PxScale::from(w * 0.25);
    // On dessine le titre plusieurs fois avec décalage pour l'effet brutal
    draw_text_raster(pixmap, font, &payload.title, title_scale, w * 0.05, h * 0.3, tiny_skia::Color::from_rgba8(255, 255, 255, 50));
    draw_text_raster(pixmap, font, &payload.title, title_scale, w * 0.05 + 10.0, h * 0.3 + 10.0, tiny_skia::Color::WHITE);
    
    let sub_scale = PxScale::from(w * 0.06);
    draw_text_raster(pixmap, font, &payload.subtitle, sub_scale, w * 0.05, h * 0.8, tiny_skia::Color::from_rgba8(0, 255, 60, 255));
}

fn render_cyber_style(pixmap: &mut Pixmap, payload: &DesignRequest, font: &FontRef, w: f32, h: f32, color: tiny_skia::Color) {
    // Neon glow + Digital shapes
    // Cercles concentriques en fond
    let mut paint = Paint::default();
    paint.anti_alias = true;
    paint.set_color_rgba8((color.red() * 255.0) as u8, (color.green() * 255.0) as u8, (color.blue() * 255.0) as u8, 40);
    let mut pb = PathBuilder::new();
    pb.push_circle(w/2.0, h/2.0, w*0.3);
    if let Some(path) = pb.finish() {
        pixmap.stroke_path(&path, &paint, &Stroke::default(), tiny_skia::Transform::identity(), None);
    }
    
    let title_scale = PxScale::from(w * 0.15);
    draw_text_raster(pixmap, font, &payload.title, title_scale, w * 0.1, h * 0.4, tiny_skia::Color::WHITE);
    
    // Effet glitch/scanline simplifié
    for i in (0..pixmap.height()).step_by(10) {
        let mut p = Paint::default();
        p.set_color_rgba8(255, 255, 255, 10);
        pixmap.fill_rect(tiny_skia::Rect::from_xywh(0.0, i as f32, w as f32, 1.0).unwrap(), &p, tiny_skia::Transform::identity(), None);
    }
}

fn render_luxury_style(pixmap: &mut Pixmap, payload: &DesignRequest, font: &FontRef, w: f32, h: f32, _color: tiny_skia::Color) {
    // Or, Serif, Cadre fin
    let mut paint = Paint::default();
    paint.set_color_rgba8(180, 150, 80, 255); // Gold
    let stroke = Stroke { width: 4.0, ..Default::default() };
    let mut pb = PathBuilder::new();
    pb.push_rect(tiny_skia::Rect::from_xywh(w*0.05, h*0.05, w*0.9, h*0.9).unwrap());
    if let Some(path) = pb.finish() {
        pixmap.stroke_path(&path, &paint, &stroke, tiny_skia::Transform::identity(), None);
    }
    
    let title_scale = PxScale::from(w * 0.12);
    draw_text_raster(pixmap, font, &payload.title, title_scale, w * 0.1, h * 0.45, tiny_skia::Color::WHITE);
    draw_text_raster(pixmap, font, &payload.subtitle, PxScale::from(w*0.03), w * 0.1, h * 0.52, tiny_skia::Color::from_rgba8(180, 150, 80, 255));
}

// ============================================================
// RENDU TEXTE PAR RASTERISATION (ab_glyph natif)
// ============================================================

/// Dessine du texte en utilisant la rasterisation native d'ab_glyph.
/// Chaque glyphe est rasterisé pixel par pixel et peint sur le pixmap.
fn draw_text_raster(pixmap: &mut Pixmap, font: &FontRef, text: &str, scale: PxScale, x: f32, y: f32, color: tiny_skia::Color) {
    let scaled_font = font.as_scaled(scale);
    let mut curr_x = x;
    let pixmap_w = pixmap.width() as i32;
    let pixmap_h = pixmap.height() as i32;

    let cr = (color.red() * 255.0) as u8;
    let cg = (color.green() * 255.0) as u8;
    let cb = (color.blue() * 255.0) as u8;
    let ca = (color.alpha() * 255.0) as f32;

    for c in text.chars() {
        let glyph_id = font.glyph_id(c);
        let h_adv = scaled_font.h_advance(glyph_id);

        let glyph = ab_glyph::Glyph {
            id: glyph_id,
            scale,
            position: ab_glyph::point(curr_x, y),
        };

        if let Some(outlined) = font.outline_glyph(glyph) {
            let bounds = outlined.px_bounds();
            outlined.draw(|px, py, coverage| {
                let screen_x = bounds.min.x as i32 + px as i32;
                let screen_y = bounds.min.y as i32 + py as i32;

                if screen_x >= 0 && screen_x < pixmap_w && screen_y >= 0 && screen_y < pixmap_h {
                    let alpha = (coverage * ca) as u8;
                    if alpha > 0 {
                        let idx = (screen_y as u32 * pixmap.width() + screen_x as u32) as usize;
                        let pixels = pixmap.pixels_mut();
                        if idx < pixels.len() {
                            // Alpha blending avec le pixel existant
                            let existing = pixels[idx];
                            let ea = existing.alpha() as f32 / 255.0;
                            let er = existing.red() as f32;
                            let eg = existing.green() as f32;
                            let eb = existing.blue() as f32;

                            let sa = alpha as f32 / 255.0;
                            let sr = cr as f32 * sa;
                            let sg = cg as f32 * sa;
                            let sb = cb as f32 * sa;

                            let out_a = sa + ea * (1.0 - sa);
                            let out_r = if out_a > 0.0 { (sr + er * (1.0 - sa)) / out_a } else { 0.0 };
                            let out_g = if out_a > 0.0 { (sg + eg * (1.0 - sa)) / out_a } else { 0.0 };
                            let out_b = if out_a > 0.0 { (sb + eb * (1.0 - sa)) / out_a } else { 0.0 };

                            let final_a = (out_a * 255.0).min(255.0) as u8;
                            let final_r = (out_r * out_a).min(255.0) as u8;
                            let final_g = (out_g * out_a).min(255.0) as u8;
                            let final_b = (out_b * out_a).min(255.0) as u8;

                            if let Some(px_color) = PremultipliedColorU8::from_rgba(final_r, final_g, final_b, final_a) {
                                pixels[idx] = px_color;
                            }
                        }
                    }
                }
            });
        }

        curr_x += h_adv;
    }
}

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

fn decode_base64_image(b64: &str, target_w: u32, target_h: u32) -> Option<Pixmap> {
    let clean = if let Some(pos) = b64.find(',') {
        &b64[pos + 1..]
    } else {
        b64
    };

    let bytes = base64::engine::general_purpose::STANDARD.decode(clean).ok()?;
    let img = printpdf::image_crate::load_from_memory(&bytes).ok()?;
    let resized = img.resize_to_fill(target_w, target_h, printpdf::image_crate::imageops::FilterType::Lanczos3);
    let rgba = resized.to_rgba8();

    let mut pixmap = Pixmap::new(target_w, target_h)?;
    let pixels = pixmap.pixels_mut();

    for (i, pixel) in rgba.pixels().enumerate() {
        if i < pixels.len() {
            let a = pixel[3] as f32 / 255.0;
            pixels[i] = PremultipliedColorU8::from_rgba(
                (pixel[0] as f32 * a) as u8,
                (pixel[1] as f32 * a) as u8,
                (pixel[2] as f32 * a) as u8,
                pixel[3],
            ).unwrap_or_else(|| PremultipliedColorU8::from_rgba(0, 0, 0, 0).unwrap());
        }
    }

    Some(pixmap)
}

fn draw_logo(pixmap: &mut Pixmap, logo_b64: &str, canvas_w: f32, canvas_h: f32, theme: &str) -> f32 {
    let clean = if let Some(pos) = logo_b64.find(',') {
        &logo_b64[pos + 1..]
    } else {
        logo_b64
    };

    let bytes = match base64::engine::general_purpose::STANDARD.decode(clean) {
        Ok(b) => b,
        Err(_) => return canvas_h * 0.08,
    };

    let img = match printpdf::image_crate::load_from_memory(&bytes) {
        Ok(i) => i,
        Err(_) => return canvas_h * 0.08,
    };

    let max_logo_w = (canvas_w * 0.30) as u32;
    let max_logo_h = (canvas_h * 0.15) as u32;
    let resized = img.resize(max_logo_w, max_logo_h, printpdf::image_crate::imageops::FilterType::Lanczos3);
    let (lw, lh) = resized.dimensions();
    let rgba = resized.to_rgba8();

    let (logo_x, logo_y) = match theme {
        "church" | "église" => ((canvas_w / 2.0 - lw as f32 / 2.0) as i32, (canvas_h * 0.06) as i32),
        _ => ((canvas_w * 0.08) as i32, (canvas_h * 0.05) as i32),
    };

    if let Some(mut logo_pixmap) = Pixmap::new(lw, lh) {
        let pixels = logo_pixmap.pixels_mut();
        for (i, pixel) in rgba.pixels().enumerate() {
            if i < pixels.len() {
                let a = pixel[3] as f32 / 255.0;
                pixels[i] = PremultipliedColorU8::from_rgba(
                    (pixel[0] as f32 * a) as u8,
                    (pixel[1] as f32 * a) as u8,
                    (pixel[2] as f32 * a) as u8,
                    pixel[3],
                ).unwrap_or_else(|| PremultipliedColorU8::from_rgba(0, 0, 0, 0).unwrap());
            }
        }
        pixmap.draw_pixmap(logo_x, logo_y, logo_pixmap.as_ref(), &PixmapPaint::default(), Transform::identity(), None);
    }

    logo_y as f32 + lh as f32 + 20.0
}

fn fill_solid_background(pixmap: &mut Pixmap, w: f32, h: f32, theme: &str) {
    let mut paint = Paint::default();
    let (r, g, b) = match theme {
        "church" | "église" => (15, 12, 25),
        "luxury" | "luxe"   => (10, 10, 15),
        "tech"               => (5, 10, 20),
        "event" | "événement" => (20, 8, 15),
        "minimal"            => (245, 245, 240),
        _                    => (10, 10, 15),
    };
    paint.set_color(tiny_skia::Color::from_rgba8(r, g, b, 255));
    pixmap.fill_rect(tiny_skia::Rect::from_xywh(0.0, 0.0, w, h).unwrap(), &paint, tiny_skia::Transform::identity(), None);
}

fn draw_gradient_overlay(pixmap: &mut Pixmap, w: f32, h: f32) {
    let steps = 400;
    for i in 0..steps {
        let y = h - (i as f32 / steps as f32) * h * 0.65;
        let alpha = ((i as f32 / steps as f32) * 220.0) as u8;
        let mut paint = Paint::default();
        paint.set_color(tiny_skia::Color::from_rgba8(0, 0, 0, alpha));
        if let Some(rect) = tiny_skia::Rect::from_xywh(0.0, y, w, h * 0.65 / steps as f32 + 1.0) {
            pixmap.fill_rect(rect, &paint, tiny_skia::Transform::identity(), None);
        }
    }

    let top_steps = 150;
    for i in 0..top_steps {
        let y = (i as f32 / top_steps as f32) * h * 0.25;
        let alpha = (((top_steps - i) as f32 / top_steps as f32) * 120.0) as u8;
        let mut paint = Paint::default();
        paint.set_color(tiny_skia::Color::from_rgba8(0, 0, 0, alpha));
        if let Some(rect) = tiny_skia::Rect::from_xywh(0.0, y, w, h * 0.25 / top_steps as f32 + 1.0) {
            pixmap.fill_rect(rect, &paint, tiny_skia::Transform::identity(), None);
        }
    }
}

// ── EXTRACTION DE COULEUR DOMINANTE SIMPLE ─────────────────
fn extract_dominant_color(b64: &str) -> Option<tiny_skia::Color> {
    let clean = if let Some(pos) = b64.find(',') { &b64[pos + 1..] } else { b64 };
    let bytes = base64::engine::general_purpose::STANDARD.decode(clean).ok()?;
    let img = printpdf::image_crate::load_from_memory(&bytes).ok()?;
    let resized = img.resize(50, 50, printpdf::image_crate::imageops::FilterType::Nearest).to_rgba8();

    let (mut r_sum, mut g_sum, mut b_sum, mut count) = (0u64, 0u64, 0u64, 0u64);
    for pixel in resized.pixels() {
        if pixel[3] > 200 { 
            // Ignorer le blanc très pur et le noir très pur pour trouver une vraie "couleur" d'accent
            if !(pixel[0]>240 && pixel[1]>240 && pixel[2]>240) && !(pixel[0]<20 && pixel[1]<20 && pixel[2]<20) {
                r_sum += pixel[0] as u64;
                g_sum += pixel[1] as u64;
                b_sum += pixel[2] as u64;
                count += 1;
            }
        }
    }

    if count > 0 {
        let r = (r_sum / count) as u8;
        let g = (g_sum / count) as u8;
        let b = (b_sum / count) as u8;
        Some(tiny_skia::Color::from_rgba8(r, g, b, 255))
    } else {
        None
    }
}

fn draw_accent_line(pixmap: &mut Pixmap, x: f32, y: f32, width: f32, height: f32, color: tiny_skia::Color) {
    let mut paint = Paint::default();
    paint.set_color(color);
    paint.anti_alias = true;
    if let Some(rect) = tiny_skia::Rect::from_xywh(x, y, width, height) {
        pixmap.fill_rect(rect, &paint, tiny_skia::Transform::identity(), None);
    }
}

fn calculate_font_size(text: &str, canvas_width: f32, width_ratio: f32) -> f32 {
    let available_width = canvas_width * width_ratio;
    available_width / (text.len().max(1) as f32 * 0.55)
}

fn parse_hex_color(hex: &str) -> Option<tiny_skia::Color> {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 { return None; }
    let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
    let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
    let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
    Some(tiny_skia::Color::from_rgba8(r, g, b, 255))
}

// ── OUTILS IMPRIMERIE ──

fn draw_crop_marks(pixmap: &mut Pixmap, b: f32, w: f32, h: f32) {
    let mut paint = Paint::default();
    paint.set_color_rgba8(0, 0, 0, 255); // Noir de repérage
    let stroke = Stroke { width: 1.0, ..Default::default() };

    let mut pb = PathBuilder::new();
    
    // Top Left
    pb.move_to(b, 0.0); pb.line_to(b, b - 10.0);
    pb.move_to(0.0, b); pb.line_to(b - 10.0, b);

    // Top Right
    pb.move_to(w - b, 0.0); pb.line_to(w - b, b - 10.0);
    pb.move_to(w, b); pb.line_to(w - b + 10.0, b);

    // Bottom Left
    pb.move_to(b, h); pb.line_to(b, h - b + 10.0);
    pb.move_to(0.0, h - b); pb.line_to(b - 10.0, h - b);

    // Bottom Right
    pb.move_to(w - b, h); pb.line_to(w - b, h - b + 10.0);
    pb.move_to(w, h - b); pb.line_to(w - b + 10.0, h - b);

    if let Some(path) = pb.finish() {
        pixmap.stroke_path(&path, &paint, &stroke, tiny_skia::Transform::identity(), None);
    }
}

fn draw_color_calibration_bars(pixmap: &mut Pixmap, _w: f32, _h: f32) {
    let colors = [
        (0, 255, 255), // Cyan
        (255, 0, 255), // Magenta
        (255, 255, 0), // Yellow
        (0, 0, 0),     // Black
    ];
    let size = 25.0;
    for (i, (r, g, b)) in colors.iter().enumerate() {
        let mut p = Paint::default();
        p.set_color_rgba8(*r, *g, *b, 255);
        if let Some(rect) = tiny_skia::Rect::from_xywh(40.0 + (i as f32 * 35.0), 15.0, size, size) {
            pixmap.fill_rect(rect, &p, tiny_skia::Transform::identity(), None);
        }
    }
}

async fn create_fedapay_checkout(
    State(_): State<Arc<AppState>>,
    Json(payload): Json<FedaPayRequest>
) -> Response {
    let secret_key = std::env::var("FEDAPAY_SECRET").unwrap_or_else(|_| "sk_sandbox_mock_prodesign".to_string());
    let url = "https://api.fedapay.com/v1/transactions";

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "amount": payload.amount,
        "currency": { "iso": "XOF" },
        "description": payload.description,
        "callback_url": payload.callback_url,
        "include": "checkout_url"
    });

    match client.post(url)
        .header("Authorization", format!("Bearer {}", secret_key))
        .json(&body)
        .send()
        .await {
            Ok(resp) => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    if let Some(checkout_url) = data.get("v1/transaction").and_then(|t| t.get("checkout_url")).and_then(|u| u.as_str()) {
                        return Json(PaymentResponse { url: checkout_url.to_string() }).into_response();
                    }
                }
                (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Erreur API FedaPay").into_response()
            },
            Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Inaccessible").into_response()
        }
}

// ============================================================
// FEDAPAY WEBHOOK VERIFICATION (Asynchrone Backend)
// ============================================================
async fn fedapay_webhook_handler(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<serde_json::Value>
) -> Response {
    if let Some(event_name) = payload.get("name").and_then(|n| n.as_str()) {
        if event_name == "transaction.approved" || event_name == "transaction.successful" {
            // Un vrai webhook verifie la signature, ici on logge et simule l'enregistrement en DB
            if let Some(entity) = payload.get("entity") {
                if let Some(amount) = entity.get("amount") {
                    println!("💸 [WEBHOOK] FedaPay: Paiement approuvé! Montant: {}", amount);
                    // On pourrait ici créditer l'utilisateur dans PostgreSQL
                    // let _ = sqlx::query("UPDATE users SET credits = credits + $1 WHERE email = $2")
                    //    .bind(credits_value)
                    //    .bind(user_email)
                    //    .execute(&state.pg_pool).await;
                }
            }
        }
    }
    (axum::http::StatusCode::OK, "Webhook Processed").into_response()
}

// ============================================================
// MOTEUR GÉNÉRATEUR DE PITCH DECK (SANS I.A.) - TYPE GAMMA.APP
// ============================================================


#[axum::debug_handler]
async fn presentation_generate_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PresentationRequest>
) -> Response {
    use rand::Rng;
    let start_time = std::time::Instant::now();
    let total_slides: usize = payload.volume.parse().unwrap_or(10);
    let gemini_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
    let mut slides_content = Vec::new();

    // 1. APPEL IA GEMINI (Point d'attente asynchrone AVANT de créer le PDF non-Send)
    if !gemini_key.is_empty() {
        let client = reqwest::Client::builder().build().unwrap();
        let prompt = format!(
            "Génère exactement {} slides sur : '{}'. Format JSON STRICT: [{{'titre': '...', 'contenu': '...'}}]",
            total_slides, payload.idea
        );
        let req_body = serde_json::json!({ "contents": [{ "parts": [{"text": prompt}] }] });
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}", gemini_key);
        
        if let Ok(resp) = client.post(&url).json(&req_body).send().await {
            if let Ok(data) = resp.json::<serde_json::Value>().await {
                if let Some(text) = data["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                    let cleaned = text.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
                    if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(cleaned) {
                        for item in arr.iter().take(total_slides) {
                            slides_content.push((
                                item["titre"].as_str().unwrap_or("Titre Slide").to_string(),
                                item["contenu"].as_str().unwrap_or("Contenu.").to_string()
                            ));
                        }
                    }
                }
            }
        }
    }

    if slides_content.is_empty() {
        for i in 0..total_slides {
            slides_content.push((format!("Slide {}", i + 1), "Contenu algorithmique généré.".to_string()));
        }
    }

    // 2. GÉNÉRATION DU PDF (Bloc synchrone après l'await de Gemini)
    let pdf_bytes = {
        let (doc, page1, layer1) = PdfDocument::new("Pitch Deck", Mm(297.0), Mm(167.06), "Layer 1");
        let font_data = state.font_data.get("Montserrat-Bold").or_else(|| state.font_data.get("System")).cloned().unwrap_or_default();
        let font = doc.add_external_font(std::io::Cursor::new(font_data)).unwrap_or_else(|_| doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap());

        for (idx, (titre, contenu)) in slides_content.iter().enumerate() {
            let (page, layer_id) = if idx == 0 { (page1, layer1) } else { doc.add_page(Mm(297.0), Mm(167.06), format!("Slide {}", idx + 1)) };
            let layer = doc.get_page(page).get_layer(layer_id);
            layer.set_fill_color(PdfColor::Rgb(Rgb::new(0.08, 0.08, 0.08, None)));
            layer.add_rect(PdfRect::new(Mm(0.0), Mm(0.0), Mm(300.0), Mm(170.0)));
            layer.set_fill_color(PdfColor::Rgb(Rgb::new(1.0, 1.0, 1.0, None)));
            layer.use_text(titre.to_uppercase(), 24.0, Mm(20.0), Mm(140.0), &font);
            let wrapped = textwrap::fill(contenu, 90);
            let mut y = 110.0;
            for line in wrapped.lines() {
                layer.use_text(line.trim(), 16.0, Mm(20.0), Mm(y), &font);
                y -= 10.0;
            }
        }

        let mut b = Vec::new();
        {
            let mut writer = std::io::BufWriter::new(&mut b);
            doc.save(&mut writer).unwrap_or_default();
        }
        b
    };

    // 3. UPLOAD ET PERSISTANCE (.await asynchrone après le drop du PDF)
    let pdf_id = Uuid::new_v4().to_string();
    let final_url = upload_and_persist_image(pdf_id.clone(), "Neuro-Pitch Deck", pdf_bytes, &state, "presentation_pdf").await;

    Json(PresentationResponse {
        pdf_url: final_url,
        message: format!("Génération terminée en {:?}", start_time.elapsed()),
    }).into_response()
}
