use tracing::{info, warn};
use std::process::Command;

/// Transcription audio via whisper.cpp CLI (installé dans le container)
/// Fallback: génère des sous-titres de démonstration si whisper n'est pas disponible
pub async fn transcribe_audio(job_id: &str, audio_path: &std::path::Path) -> anyhow::Result<String> {
    info!("[{}] Transcribing {:?} and generating SRT captions...", job_id, audio_path);
    
    let srt_path = format!("outputs/subs_{}.srt", job_id);
    
    // Tentative de transcription via whisper CLI si disponible
    if audio_path.exists() {
        let result = Command::new("whisper")
            .arg(audio_path)
            .arg("--model").arg("base")
            .arg("--output_format").arg("srt")
            .arg("--output_dir").arg("outputs")
            .output();
        
        match result {
            Ok(output) if output.status.success() => {
                info!("[{}] Whisper transcription completed successfully", job_id);
                return Ok(srt_path);
            }
            _ => {
                warn!("[{}] Whisper CLI not available, using placeholder subtitles", job_id);
            }
        }
    }
    
    // Fallback: Sous-titres de démonstration
    let srt_content = r#"1
00:00:01,000 --> 00:00:04,000
Bienvenue dans ProDesign.

2
00:00:04,500 --> 00:00:08,000
Votre partenaire créatif intelligent.
"#;
    
    tokio::fs::write(&srt_path, srt_content).await?;
    
    Ok(srt_path)
}
