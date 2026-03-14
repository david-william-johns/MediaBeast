use serde::{Deserialize, Serialize};
use crate::error::{AppError, Result};

const MB_BASE: &str = "https://musicbrainz.org/ws/2";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackRecord {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub year: String,
    pub duration_ms: Option<u64>,
}

impl TrackRecord {
    pub fn duration_formatted(&self) -> String {
        match self.duration_ms {
            Some(ms) => {
                let total_secs = ms / 1000;
                format!("{}:{:02}", total_secs / 60, total_secs % 60)
            }
            None => String::new(),
        }
    }
}

#[derive(Deserialize)]
struct MbArtistSearch {
    artists: Vec<MbArtist>,
}

#[derive(Deserialize)]
struct MbArtist {
    id: String,
    name: String,
}

#[derive(Deserialize)]
struct MbReleaseGroupPage {
    #[serde(rename = "release-groups")]
    release_groups: Vec<MbReleaseGroup>,
    #[serde(rename = "release-group-count")]
    total: u64,
}

#[derive(Deserialize)]
struct MbReleaseGroup {
    id: String,
    title: String,
    #[serde(rename = "first-release-date", default)]
    first_release_date: String,
    #[serde(rename = "secondary-types", default)]
    secondary_types: Vec<String>,
}

#[derive(Deserialize)]
struct MbReleasePage {
    releases: Vec<MbRelease>,
}

#[derive(Deserialize)]
struct MbRelease {
    media: Vec<MbMedia>,
}

#[derive(Deserialize)]
struct MbMedia {
    tracks: Vec<MbTrack>,
}

#[derive(Deserialize)]
struct MbTrack {
    recording: MbRecording,
    #[serde(default)]
    position: u32,
}

#[derive(Deserialize)]
struct MbRecording {
    id: String,
    title: String,
    #[serde(default)]
    length: Option<u64>,
}

#[derive(Deserialize)]
struct MbRecordingSearch {
    recordings: Vec<MbRecordingEntry>,
}

#[derive(Deserialize)]
struct MbRecordingEntry {
    id: String,
    title: String,
    #[serde(default)]
    length: Option<u64>,
    #[serde(rename = "artist-credit", default)]
    artist_credit: Vec<MbArtistCredit>,
    releases: Option<Vec<MbReleaseRef>>,
}

#[derive(Deserialize)]
struct MbArtistCredit {
    artist: MbArtistRef,
}

#[derive(Deserialize)]
struct MbArtistRef {
    name: String,
}

#[derive(Deserialize)]
struct MbReleaseRef {
    title: String,
    date: Option<String>,
}

fn year_from_date(date: &str) -> String {
    date.get(..4).unwrap_or("").to_string()
}

fn is_filtered_secondary_type(types: &[String]) -> bool {
    let blocked = ["Live", "Compilation", "Remix", "Demo", "Interview",
                   "Mixtape/Street", "DJ-mix", "Spokenword", "Audiobook"];
    types.iter().any(|t| blocked.contains(&t.as_str()))
}

fn normalize_title(title: &str) -> String {
    let lower = title.to_lowercase();
    // Remove parenthetical annotations
    let re = regex::Regex::new(r"\(.*?\)|\[.*?\]").unwrap();
    let stripped = re.replace_all(&lower, "");
    // Collapse whitespace and non-alphanumeric
    let re2 = regex::Regex::new(r"[^a-z0-9]+").unwrap();
    re2.replace_all(stripped.trim(), " ").trim().to_string()
}

pub struct MusicBrainzClient {
    client: reqwest::Client,
}

impl MusicBrainzClient {
    pub fn new(client: reqwest::Client) -> Self {
        Self { client }
    }

    async fn get_json<T: for<'de> Deserialize<'de>>(&self, url: &str) -> Result<T> {
        let resp = self.client
            .get(url)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| AppError::MusicBrainz(e.to_string()))?;

        if !resp.status().is_success() {
            return Err(AppError::MusicBrainz(format!("HTTP {}", resp.status())));
        }

        resp.json::<T>().await.map_err(|e| AppError::MusicBrainz(e.to_string()))
    }

    async fn rate_limit() {
        tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    }

    /// Resolve artist MBID from name
    pub async fn find_artist(&self, name: &str) -> Result<(String, String)> {
        let url = format!("{}/artist?query=artist:{}&fmt=json&limit=1",
            MB_BASE, urlencoding::encode(name));
        let data: MbArtistSearch = self.get_json(&url).await?;
        data.artists.into_iter().next()
            .map(|a| (a.id, a.name))
            .ok_or_else(|| AppError::MusicBrainz(format!("Artist '{}' not found", name)))
    }

    /// Fetch all tracks for an artist by MBID, returning deduplicated TrackRecords
    pub async fn fetch_discography(
        &self,
        mbid: &str,
        artist_name: &str,
    ) -> Result<Vec<TrackRecord>> {
        let mut offset = 0u64;
        let limit = 100u64;
        let mut all_groups: Vec<MbReleaseGroup> = Vec::new();

        loop {
            let url = format!(
                "{}/release-group?artist={}&type=album|single|ep&inc=&fmt=json&limit={}&offset={}",
                MB_BASE, mbid, limit, offset
            );
            let page: MbReleaseGroupPage = self.get_json(&url).await?;
            let total = page.total;
            all_groups.extend(page.release_groups);
            offset += limit;
            if offset >= total { break; }
            Self::rate_limit().await;
        }

        // Filter secondary types
        all_groups.retain(|rg| !is_filtered_secondary_type(&rg.secondary_types));

        let mut tracks: Vec<TrackRecord> = Vec::new();
        let mut seen_titles: std::collections::HashSet<String> = std::collections::HashSet::new();

        for rg in &all_groups {
            let url = format!(
                "{}/release?release-group={}&inc=recordings&fmt=json&limit=1",
                MB_BASE, rg.id
            );
            let page: MbReleasePage = match self.get_json(&url).await {
                Ok(p) => p,
                Err(_) => { Self::rate_limit().await; continue; }
            };

            let year = year_from_date(&rg.first_release_date);

            for release in &page.releases {
                for medium in &release.media {
                    for track in &medium.tracks {
                        let norm = normalize_title(&track.recording.title);
                        if seen_titles.insert(norm) {
                            tracks.push(TrackRecord {
                                id: track.recording.id.clone(),
                                title: track.recording.title.clone(),
                                artist: artist_name.to_string(),
                                album: rg.title.clone(),
                                year: year.clone(),
                                duration_ms: track.recording.length,
                            });
                        }
                    }
                }
                break; // Only take first release per group
            }
            Self::rate_limit().await;
        }

        Ok(tracks)
    }

    /// Search by song title — returns one record per distinct artist
    pub async fn search_by_title(&self, title: &str) -> Result<Vec<TrackRecord>> {
        let url = format!(
            "{}/recording?query=recording:{}&fmt=json&limit=100",
            MB_BASE, urlencoding::encode(title)
        );
        let data: MbRecordingSearch = self.get_json(&url).await?;

        let mut seen_artists: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut tracks: Vec<TrackRecord> = Vec::new();

        for rec in data.recordings {
            let artist = rec.artist_credit.into_iter()
                .next()
                .map(|ac| ac.artist.name)
                .unwrap_or_default();

            if artist.is_empty() || !seen_artists.insert(artist.clone()) {
                continue;
            }

            let (album, year) = rec.releases
                .and_then(|mut r| r.pop())
                .map(|r| (r.title, r.date.unwrap_or_default()))
                .unwrap_or_default();

            tracks.push(TrackRecord {
                id: rec.id,
                title: rec.title,
                artist,
                album,
                year: year_from_date(&year),
                duration_ms: rec.length,
            });

            if tracks.len() >= 100 { break; }
        }

        Ok(tracks)
    }
}
