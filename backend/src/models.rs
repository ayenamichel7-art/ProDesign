use serde::{Deserialize, Serialize};

#[derive(Deserialize, Clone)]
pub struct DesignRequest {
    pub title: String,
    pub overtitle: Option<String>,
    pub subtitle: String,
    pub text: Option<String>,
    pub context: Option<String>,
    pub primary_color: String,
    #[serde(default)]
    pub theme: String,
    #[serde(default)]
    pub font_family: Option<String>,
    #[serde(default)]
    pub logo_base_64: Option<String>,
    #[serde(default)]
    pub background_base_64: Option<String>,
    #[serde(default)]
    pub extra_info: Option<String>,
    #[serde(default)]
    pub inspiration_base_64: Option<String>,
    #[serde(default)]
    pub style: Option<String>,
    #[serde(default)]
    pub format: Option<String>,
    #[serde(default)]
    pub qr_code_url: Option<String>,
    #[serde(default)]
    pub web_dimension: Option<String>,
    #[serde(default)]
    pub is_print: bool,
}

#[derive(Serialize)]
pub struct DesignResponse {
    pub poster_id: String,
    pub url: String,
}

#[derive(Deserialize)]
pub struct DocumentRequest {
    pub title: String,
    pub overtitle: Option<String>,
    pub subtitle: String,
    pub author: String,
    pub date: String,
    pub institution: Option<String>,
    pub chapters: Vec<Chapter>,
    pub theme_color: String,
    pub style: String,
    #[serde(default)]
    pub include_toc: Option<bool>,
    #[serde(default)]
    pub include_pagination: Option<bool>,
    #[serde(default)]
    pub watermark: Option<String>,
}

#[derive(Deserialize)]
pub struct Chapter {
    pub title: String,
    pub content: String,
}

#[derive(Serialize)]
pub struct DocumentResponse {
    pub pdf_id: String,
    pub url: String,
}

#[derive(Serialize)]
pub struct RushResponse {
    pub results: Vec<DesignResponse>,
}

#[derive(Deserialize)]
pub struct CampaignRequest {
    pub base: DesignRequest,
    pub products: Vec<String>,
}

#[derive(Deserialize)]
pub struct PhotoStudioRequest {
    pub images_base64: Vec<String>,
    pub config: PhotoConfig,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct PhotoConfig {
    #[serde(default = "default_one")]
    pub exposure: f32,
    #[serde(default = "default_one_one")]
    pub contrast: f32,
    #[serde(default = "default_one_two")]
    pub saturation: f32,
    #[serde(default = "default_true")]
    pub sharpen: bool,
    #[serde(default = "default_true")]
    pub denoise: bool,
    #[serde(default = "default_target_size")]
    pub target_size: String,
    #[serde(default = "default_false")]
    pub restoration: bool,
    #[serde(default = "default_true")]
    pub auto_wb: bool,
    #[serde(default = "default_one")]
    pub gamma: f32,
}

fn default_false() -> bool { false }
fn default_target_size() -> String { "4x5".to_string() }
fn default_one() -> f32 { 1.0 }
fn default_one_one() -> f32 { 1.1 }
fn default_one_two() -> f32 { 1.2 }
fn default_true() -> bool { true }

#[derive(Deserialize)]
pub struct LogoRequest {
    pub name: String,
    pub slogan: Option<String>,
    pub primary_color: String,
    #[serde(default)]
    pub secondary_colors: Vec<String>,
    #[serde(default)]
    pub idea_context: Option<String>,
    pub style: String,
}

#[derive(Deserialize)]
pub struct RemoveBgRequest {
    pub image_base64: String,
}

#[derive(Serialize)]
pub struct RemoveBgResponse {
    pub url: String,
}

#[derive(Serialize)]
pub struct BrandIdentity {
    pub primary_hex: String,
    pub palette: Vec<String>,
    pub typography: Vec<String>,
    pub logo_variants: Vec<DesignResponse>,
    pub usage_guideline: String,
    pub idea_brief: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ShareLink {
    pub id: String,
    pub photo_ids: Vec<String>,
    pub expires_at: i64,
}

#[derive(Deserialize)]
pub struct CreateShareRequest {
    pub photo_ids: Vec<String>,
    pub days: Option<i64>,
}

#[derive(Serialize)]
pub struct ShareResponse {
    pub share_url: String,
    pub expires_at: i64,
}

#[derive(Deserialize, Serialize)]
pub struct FeedbackRequest {
    pub rating: Option<i32>,
    pub comment: Option<String>,
    pub design_id: Option<String>,
    pub email: Option<String>,
}

#[derive(Deserialize)]
pub struct FedaPayRequest {
    pub amount: i32,
    pub description: String,
    pub callback_url: String,
}

#[derive(Serialize)]
pub struct PaymentResponse {
    pub url: String,
}

#[derive(Deserialize)]
pub struct MockupRequest {
    pub url: String,
}

#[derive(Deserialize, Clone)]
pub struct PresentationRequest {
    pub idea: String,
    pub volume: String,
    pub structure: String,
    pub tone: String,
}

#[derive(Serialize)]
pub struct PresentationResponse {
    pub pdf_url: String,
    pub message: String,
}
