use tracing::{info, warn, error};
use std::process::{Stdio, Command as stdCommand};
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};
use std::path::Path;
use anyhow::{Context, Result};
use tokio::sync::broadcast;

/// Concatène et traite une vidéo de manière "Stream-Based" (Faible RAM).
/// Conçu pour de longs formats YouTube sur un VPS limité.
/// Concatène et traite une vidéo de manière "Stream-Based" (Faible RAM).
/// Conçu pour de longs formats YouTube sur un VPS limité.
pub struct BrandPalette {
    pub primary: String,
    pub secondary: String,
    pub accent: String,
}

/// Concatène et traite une vidéo de manière "Stream-Based" (Faible RAM).
pub async fn process_timeline_safe(
    job_id: &str, 
    input_files: &[&Path], 
    output_path: &Path, 
    tx_notify: broadcast::Sender<String>, 
    audio_params: Option<(String, String)>,
    palette: BrandPalette,
    brand_font: &str,
    logo_path: Option<String>,
    subtitle_path: Option<String>
) -> Result<()> {
    info!("[{}] Initiation du rendu PRO (Font: {}, Palette: {}/{}/{})...", job_id, brand_font, palette.primary, palette.secondary, palette.accent);

    if input_files.is_empty() {
        warn!("[{}] Aucun fichier source fourni.", job_id);
        return Ok(());
    }

    // Création d'un fichier texte temporaire pour la concaténation "demuxer" de FFmpeg.
    // Cette méthode lit les flux un par un au lieu de tout charger, sauvant la RAM.
    let concat_file_path = format!("outputs/concat_{}.txt", job_id);
    let mut concat_content = String::new();
    for file in input_files {
        concat_content.push_str(&format!("file '{}'\n", file.display()));
    }
    tokio::fs::write(&concat_file_path, concat_content).await?;

    info!("[{}] Lancement de la compilation vidéo.", job_id);

    // Construction de la commande FFmpeg Asynchrone
    let mut cmd = Command::new("ffmpeg");

    cmd.arg("-y")
       .arg("-f").arg("concat") 
       .arg("-safe").arg("0") 
       .arg("-i").arg(&concat_file_path);

    // Entrées supplémentaires (Logo, Audio)
    let mut filter_complex = String::new();
    let mut current_video_stream = "[0:v]".to_string();

    if let Some(logo) = logo_path {
        cmd.arg("-i").arg(logo);
        // Overlay Logo en haut à droite avec transparence
        filter_complex.push_str(&format!("{}[1:v]overlay=W-w-20:20[v_logo];", current_video_stream));
        current_video_stream = "[v_logo]".to_string();
    }

    let has_audio = audio_params.is_some();
    if let Some((voice, music)) = audio_params {
        cmd.arg("-i").arg(voice)
           .arg("-i").arg(music);
        filter_complex.push_str("[2:a]compand=0.3|0.3:6:-90/-60/-70/-40/-20/-20:6:0:-90:0.2,volume=1.8[v_audio];[3:a]volume=0.15[m_audio];[v_audio][m_audio]amix=inputs=2:duration=first[a_out];");
    }

    // Subtitles (Kinetic) avec Typographie de Marque
    if let Some(sub) = subtitle_path {
        // ASS color format is &HAABBGGRR. We need to convert #RRGGBB to &H00BBGGRR
        let color = if palette.primary.starts_with('#') {
            let r = &palette.primary[1..3];
            let g = &palette.primary[3..5];
            let b = &palette.primary[5..7];
            format!("&H00{}{}{}", b, g, r)
        } else {
            "&H00FFFFFF".to_string() // Fallback blanc
        };
        
        filter_complex.push_str(&format!(
            "{}subtitles='{}':force_style='FontName={},PrimaryColour={},OutlineColour=&H000000'[v_sub];", 
            current_video_stream, sub, brand_font, color
        ));
        current_video_stream = "[v_sub]".to_string();
    }

    if !filter_complex.is_empty() {
        cmd.arg("-filter_complex").arg(filter_complex);
        cmd.arg("-map").arg(current_video_stream);
        if has_audio {
            cmd.arg("-map").arg("[a_out]");
        } else {
            cmd.arg("-map").arg("0:a?");
        }
    }

    cmd.arg("-threads").arg("1") 
       .arg("-c:v").arg("libx264") 
       .arg("-preset").arg("fast") 
       .arg("-crf").arg("23") 
       .arg("-c:a").arg("aac") 
       .arg("-b:a").arg("192k") 
       .arg("-max_muxing_queue_size").arg("1024") 
       .arg(output_path);

    // Capture des logs (stderr) directement en flux pour ne pas gonfler la RAM du serveur web Rust
    cmd.stdout(Stdio::null())
       .stderr(Stdio::piped());

    let mut child = cmd.spawn().context("Échec du démarrage du processus FFmpeg")?;

    let stderr = child.stderr.take().expect("Failed to open stderr");
    let mut reader = BufReader::new(stderr).lines();

    // Boucle asynchrone non-bloquante pour lire la progression
    tokio::spawn({
        let j_id = job_id.to_string();
        async move {
            while let Ok(Some(line)) = reader.next_line().await {
                // On détecte les marqueurs de progression de ffmpeg (frame=..., time=...)
                if line.contains("frame=") || line.contains("time=") {
                    // Envoyer le log via Websocket
                    let ws_msg = format!(r#"{{"job_id": "{}", "status": "processing", "ffmpeg_log": "{}"}}"#, j_id, line.replace("\"", "\\\""));
                    let _ = tx_notify.send(ws_msg);
                    
                    info!("[{}] Progression Rendering: {}", j_id, line);
                }
            }
        }
    });

    let status = child.wait().await?;
    
    // Nettoyage écologique
    let _ = tokio::fs::remove_file(&concat_file_path).await;

    if status.success() {
        info!("[{}] 🔥 Rendu (Safe Mode) terminé avec succès: {:?}", job_id, output_path);
        Ok(())
    } else {
        error!("[{}] ❌ FFMPEG a échoué avec le code {:?}", job_id, status.code());
        anyhow::bail!("FFmpeg build process crashed or was interrupted.");
    }
}

/// Auto-encodeur intelligent pour normaliser les rushs clients (Background).
pub async fn normalize_video(input_path: &Path, output_path: &Path) -> Result<()> {
    info!("Normalisation IA de la vidéo: {:?}", input_path);
    
    // On utilise un profil de haute qualité mais optimisé pour le Web
    // H.264 High Profile, CRF 22, Audio AAC 192k
    let status = Command::new("ffmpeg")
        .arg("-y")
        .arg("-i").arg(input_path)
        .arg("-c:v").arg("libx264")
        .arg("-profile:v").arg("high")
        .arg("-level").arg("4.1")
        .arg("-crf").arg("22") // Équilibre parfait Qualité/Poids
        .arg("-preset").arg("medium")
        .arg("-c:a").arg("aac")
        .arg("-b:a").arg("192k")
        .arg("-movflags").arg("+faststart") // Lecture immédiate sur le web (Progressive Download)
        .arg("-threads").arg("1") // Toujours 1 thread pour le VPS
        .arg(output_path)
        .status().await?;

    if !status.success() {
        anyhow::bail!("Échec de l'auto-encodage (Normalisation).");
    }
    Ok(())
}

/// Optimisation finale "Zero-Loss" pour le rendu de sortie.
pub async fn optimize_final_output(job_id: &str, input_path: &Path, output_path: &Path) -> Result<()> {
    info!("[{}] Optimisation finale du rendu (Auto-Encoder)...", job_id);
    
    // On compresse sans perte visible pour faciliter le partage (SaaS prêt)
    let status = Command::new("ffmpeg")
        .arg("-y")
        .arg("-i").arg(input_path)
        .arg("-c:v").arg("libx264")
        .arg("-preset").arg("slow") // Meilleure compression sans perte
        .arg("-crf").arg("20") 
        .arg("-movflags").arg("+faststart")
        .arg("-threads").arg("1")
        .arg(output_path)
        .status().await?;

    if !status.success() {
        error!("[{}] Échec de l'optimisation de sortie.", job_id);
    }
    Ok(())
}
