use tracing::{info, error};
use std::process::Command;

pub async fn decide_content(job_id: &str, intentions: &str, files: &[String]) -> anyhow::Result<String> {
    info!("[{}] AI Analyzing intentions: {}", job_id, intentions);
    
    // 1. Determine if we are in "Slideshow mode" (only images)
    let has_video = files.iter().any(|f| f.ends_with(".mp4") || f.ends_with(".mov") || f.ends_with(".webm"));
    let has_audio = files.iter().any(|f| f.ends_with(".mp3") || f.ends_with(".wav") || f.ends_with(".m4a"));

    let theme = if intentions.to_lowercase().contains("luxe") || intentions.to_lowercase().contains("premium") { "luxury" } else { "standard" };
    
    // 2. Decide Music
    let music = match theme {
        "luxury" => "assets/music/luxury_piano.mp3",
        _ => "assets/music/default_corporate.mp3",
    };
    info!("[{}] AI selected background music: {}", job_id, music);

    // 3. Generate Hyper-Realistic Voiceover Script
    let script = produce_marketing_script(intentions);
    info!("[{}] AI Copywriter produced script: {}", job_id, script);

    if intentions.to_lowercase().contains("voix") || intentions.to_lowercase().contains("parle") || !has_audio {
        generate_voice_file(job_id, &script).await?;
    }

    Ok(music.to_string())
}

fn produce_marketing_script(intentions: &str) -> String {
    if intentions.contains("CORRECTIONS") {
        return format!("Mise à jour demandée. {}. Nous avons ajusté selon vos retours.", intentions);
    }
    format!("Attention. {}. La perfection n'est plus un concept, c'est une réalité avec ProDesign. Tout ce que vous imaginez, nous le créons.", intentions.replace("fais une promo", "Préparez-vous à l'excellence"))
}

async fn generate_voice_file(job_id: &str, text: &str) -> anyhow::Result<()> {
    let output = format!("outputs/voice_{}.mp3", job_id);
    info!("[{}] Generating Hyper-Realistic Voiceover (SSML Ready)...", job_id);
    
    // Utilisation de edge-tts avec une voix neuronale naturelle
    let status = Command::new("edge-tts")
        .arg("--text")
        .arg(text)
        .arg("--voice")
        .arg("fr-FR-VivienneMultilingualNeural")
        .arg("--rate=+0%") 
        .arg("--pitch=+0Hz")
        .arg("--write-media")
        .arg(&output)
        .status()?;

    if !status.success() {
        error!("[{}] Failed to generate voiceover", job_id);
    }
    
    Ok(())
}
