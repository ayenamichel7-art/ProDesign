use axum::{extract::{Json, State, Request}, response::{IntoResponse, Response}, http::StatusCode, middleware::Next};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use chrono::{Utc, Duration};
use jsonwebtoken::{encode, decode, Header as JwtHeader, Validation, EncodingKey, DecodingKey};
use crate::AppState;

#[derive(Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

#[derive(Deserialize)]
pub struct AuthRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthTokenResponse {
    pub token: String,
    pub email: String,
}

pub async fn register_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AuthRequest>,
) -> Response {
    use redis::AsyncCommands;
    if payload.email.is_empty() || payload.password.len() < 6 {
        return (StatusCode::BAD_REQUEST, "Email requis et mot de passe >= 6 caractères").into_response();
    }
    let mut con = match state.redis_client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Erreur Redis").into_response(),
    };
    let existing: Option<String> = con.get(&format!("user:{}", payload.email)).await.unwrap_or(None);
    if existing.is_some() {
        return (StatusCode::CONFLICT, "Cet email est déjà utilisé").into_response();
    }
    let hashed = match bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Erreur de hashage").into_response(),
    };
    let _: () = con.set(&format!("user:{}", payload.email), &hashed).await.unwrap_or(());
    let claims = Claims {
        sub: payload.email.clone(),
        exp: (Utc::now() + Duration::days(30)).timestamp() as usize,
    };
    let token = encode(&JwtHeader::default(), &claims, &EncodingKey::from_secret(state.jwt_secret.as_bytes())).unwrap();
    Json(AuthTokenResponse { token, email: payload.email }).into_response()
}

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AuthRequest>,
) -> Response {
    use redis::AsyncCommands;
    let mut con = match state.redis_client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Erreur Redis").into_response(),
    };
    let hash: Option<String> = con.get(&format!("user:{}", payload.email)).await.unwrap_or(None);
    match hash {
        Some(h) => {
            if bcrypt::verify(&payload.password, &h).unwrap_or(false) {
                let claims = Claims {
                    sub: payload.email.clone(),
                    exp: (Utc::now() + Duration::days(30)).timestamp() as usize,
                };
                let token = encode(&JwtHeader::default(), &claims, &EncodingKey::from_secret(state.jwt_secret.as_bytes())).unwrap();
                Json(AuthTokenResponse { token, email: payload.email }).into_response()
            } else {
                (StatusCode::UNAUTHORIZED, "Email ou mot de passe incorrect").into_response()
            }
        }
        None => (StatusCode::UNAUTHORIZED, "Email ou mot de passe incorrect").into_response()
    }
}

pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: Next,
) -> Response {
    let auth_header = req.headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string());

    match auth_header {
        Some(token) => {
            match decode::<Claims>(&token, &DecodingKey::from_secret(state.jwt_secret.as_bytes()), &Validation::default()) {
                Ok(_data) => next.run(req).await,
                Err(_) => (StatusCode::UNAUTHORIZED, "Token invalide ou expiré").into_response()
            }
        }
        None => (StatusCode::UNAUTHORIZED, "Authentification requise").into_response()
    }
}
