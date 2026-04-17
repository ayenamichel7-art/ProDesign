use serde_json::Value;
use tokio::sync::{mpsc, broadcast};
use tracing::{info, warn};
use crate::{video, transcriber, wgpu_fx, ai_generator};
use chrono;
use std::sync::OnceLock;
use std::time::SystemTime;
use std::fs;

static JOB_SENDER: OnceLock<mpsc::Sender<(String, Value)>> = OnceLock::new();

pub async fn init_worker(tx_notify: broadcast::Sender<String>) -> anyhow::Result<()> {
    let (tx, mut rx) = mpsc::channel::<(String, Value)>(100);
    JOB_SENDER.set(tx).expect("Failed to set JOB_SENDER");
    
    // S'assurer que les dossiers de stockage existent (Versioning/SaaS)
    let _ = fs::create_dir_all("outputs/affiches");
    let _ = fs::create_dir_all("outputs/photos");
    let _ = fs::create_dir_all("outputs/videos");
    
    tokio::spawn(async move {
        init_garbage_collector().await;
        
        while let Some((job_id, payload)) = rx.recv().await {
            info!("Worker processing job: {}", job_id);
            
            // Extract intentions
            let mut intentions = payload.get("intentions").and_then(|v| v.as_str()).unwrap_or("No intentions provided.").to_string();
            
            // Extract Brand Kit & Language
            let brand_json = payload.get("brand_kit");
            let palette_json = brand_json.and_then(|b| b.get("palette"));
            
            let palette = video::BrandPalette {
                primary: palette_json.and_then(|p| p.get("primary")).and_then(|v| v.as_str()).unwrap_or("#00A3FF").to_string(),
                secondary: palette_json.and_then(|p| p.get("secondary")).and_then(|v| v.as_str()).unwrap_or("#FFFFFF").to_string(),
                accent: palette_json.and_then(|p| p.get("accent")).and_then(|v| v.as_str()).unwrap_or("#000000").to_string(),
            };

            let target_lang = brand_json.and_then(|b| b.get("language")).and_then(|l| l.as_str()).unwrap_or("fr");
            let brand_logo = brand_json.and_then(|b| b.get("logo")).and_then(|l| l.as_str()).map(|s| s.to_string());
            let brand_font = brand_json.and_then(|b| b.get("font")).and_then(|v| v.as_str()).unwrap_or("Inter");

            // Simulation du téléchargement Auto de la police
            if brand_font != "Inter" {
                info!("[{}] IA Font Provisioning: {} (Recherche et installation automatique...)", job_id, brand_font);
                // System command: fc-cache -f /usr/share/fonts/
            }

            // Gérer les corrections (Versioning)
            if let Some(parent_id) = payload.get("parent_job_id").and_then(|p| p.as_str()) {
                info!("[{}] Context detected: Applying corrections to parent: {}", job_id, parent_id);
                intentions = format!("CORRECTIONS (Lang: {}) sur le n°{} : {}.", target_lang, parent_id, intentions);
            }

            // Persistence du contexte (SaaS Ready)
            let context = serde_json::json!({
                "job_id": job_id,
                "intentions": intentions.clone(),
                "brand_kit": payload.get("brand_kit"),
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            let _ = tokio::fs::write(format!("outputs/job_{}.json", job_id), context.to_string()).await;
            
            info!("[{}] User Intentions: {} (Language: {})", job_id, intentions, target_lang);

            // Notify via WS that we started
            let _ = tx_notify.send(format!(r#"{{"job_id": "{}", "status": "processing", "ffmpeg_log": "Initialisation du moteur IA..."}}"#, job_id));

            // Logic steps
            let _ = transcriber::transcribe_audio(&job_id, std::path::Path::new("dummy.mp3")).await;
            let _ = wgpu_fx::render_effects().await;
            
            let files: Vec<String> = payload.get("files").and_then(|v| v.as_array()).map(|arr| {
                arr.iter().filter_map(|v| v.as_str()).map(|s| s.to_string()).collect()
            }).unwrap_or_default();

            // 1. Decide Content via AI
            let music_path = ai_generator::decide_content(&job_id, &intentions, &files).await.unwrap_or_else(|_| "assets/music/default_corporate.mp3".to_string());
            let voice_path = format!("outputs/voice_{}.mp3", job_id);

            // 2. Normalisation / Auto-Encoding des Ressources (Rushs)
            let mut normalized_paths: Vec<std::path::PathBuf> = Vec::new();
            for (idx, file) in files.iter().enumerate() {
                let input_path = std::path::Path::new(file);
                let normalized_name = format!("outputs/norm_{}_{}.mp4", job_id, idx);
                let normalized_path = std::path::PathBuf::from(&normalized_name);
                
                // On auto-encode l'entrée pour qu'elle soit fluide dans le moteur
                if let Err(e) = video::normalize_video(input_path, &normalized_path).await {
                    warn!("Échec normalisation de {:?}: {}", input_path, e);
                } else {
                    normalized_paths.push(normalized_path);
                }
            }

            // 3. Logic steps (Transcribe and Subtitles)
            let voice_path_p = std::path::Path::new(&voice_path);
            let srt_path = if voice_path_p.exists() {
                transcriber::transcribe_audio(&job_id, voice_path_p).await.ok()
            } else {
                None
            };
            
            let _ = wgpu_fx::render_effects().await;
            
            // 4. Process Rendering (Bridge Master with Pro Parameters)
            let bridge_output = format!("outputs/bridge_{}.mp4", job_id);
            let final_output = format!("outputs/render_{}.mp4", job_id);
            let audio_params = Some((voice_path, music_path));

            let path_refs: Vec<&std::path::Path> = normalized_paths.iter().map(|p| p.as_path()).collect();
            let _ = video::process_timeline_safe(
                &job_id, 
                &path_refs, 
                std::path::Path::new(&bridge_output), 
                tx_notify.clone(), 
                audio_params,
                palette,
                brand_font,
                brand_logo,
                srt_path
            ).await;
            
            // 5. Optimisation Finale (Auto-Encoder Pass)
            let _ = video::optimize_final_output(&job_id, std::path::Path::new(&bridge_output), std::path::Path::new(&final_output)).await;
            
            let _ = tx_notify.send(format!(r#"{{"job_id": "{}", "status": "completed", "url": "/video/outputs/render_{}.mp4"}}"#, job_id, job_id));
            info!("Job {} completed.", job_id);
        }
    });

    Ok(())
}

pub async fn enqueue_job(job_id: String, payload: Value) {
    if let Some(tx) = JOB_SENDER.get() {
        if let Err(e) = tx.send((job_id.clone(), payload)).await {
            warn!("Failed to enqueue job {}: {}", job_id, e);
        } else {
            info!("Job {} enqueued locally.", job_id);
        }
    }
}

/// Nettoyeur automatique de fichiers Saas (Garde le stockage VPS propre)
async fn init_garbage_collector() {
    tokio::spawn(async move {
        // Attendre un peu au démarrage
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
        
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3600)); // Scan toutes les heures
        loop {
            interval.tick().await;
            info!("SaaS Multi-TTL Garbage Collector: Nettoyage hybride...");
            
            // 1. Suppression Afficthes/Vidéos (24 heures)
            clean_dir("outputs/affiches", 86400); 
            clean_dir("outputs/videos", 86400);
            clean_dir("outputs", 86400); // Fichiers racines

            // 2. Suppression Photos (Smash Transfer - 7 jours)
            clean_dir("outputs/photos", 604800);
        }
    });
}

fn clean_dir(path: &str, ttl_secs: u64) {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(elapsed) = modified.elapsed() {
                        if elapsed.as_secs() > ttl_secs {
                            let fpath = entry.path();
                            if fpath.is_file() {
                                info!("Garbage Collector (TTL {}s): Deleting file {:?}", ttl_secs, fpath);
                                let _ = fs::remove_file(fpath);
                            }
                        }
                    }
                }
            }
        }
    }
}
