use std::collections::HashMap;

pub struct Track {
    pub name: String,
    pub path: String,
    pub mood: &'static str,
}

pub fn get_tracks_by_mood() -> HashMap<&'static str, Vec<Track>> {
    let mut tracks = HashMap::new();
    
    tracks.insert("luxury", vec![
        Track { name: "Piano Elegance".to_string(), path: "assets/music/luxury_piano.mp3".to_string(), mood: "luxury" }
    ]);
    
    tracks.insert("high_energy", vec![
        Track { name: "Fast Beat".to_string(), path: "assets/music/high_energy.mp3".to_string(), mood: "high_energy" }
    ]);
    
    tracks
}
