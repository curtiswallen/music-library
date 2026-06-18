// ── Track types ────────────────────────────────────────────────────────────────

export interface CanonicalTrack {
  pos: number;
  title: string;
  length: number | null;  // seconds
}

export interface TrackAnnotation {
  pos: number;
  rating: number | null;  // 0–100
  notable?: boolean;
  note: string;
}

/** Merged view used for display and edit forms */
export interface Track extends CanonicalTrack, TrackAnnotation {}

// ── DB row types ───────────────────────────────────────────────────────────────

/** Canonical album facts — artist/album/year/country/cover are objective */
export interface Album {
  id: number;
  mbid: string | null;
  slug: string;
  artist: string;
  album: string;
  country: string;
  year: number | null;
  cover_url: string | null;
  tracks: string;     // JSON: CanonicalTrack[] (may also have legacy full-Track data pre-setup)
  created_at: string;
}

/** Per-user subjective data for one album */
export interface UserAlbum {
  id: number;
  user_id: number;
  album_id: number;
  genre: string;
  subgenres: string;      // JSON: string[]
  rating: number | null;
  notes: string;
  tracks_data: string;    // JSON: TrackAnnotation[]
  recommended: number;    // 0 | 1
  is_hidden: number;      // 0 | 1
  added_at: string;
  release_mbid: string | null;
  release_title: string | null;
  release_data: string | null;  // JSON: ReleaseData
  descriptors: string;          // JSON: string[]
}

/** Flat JOIN result used in most queries */
export interface LibraryEntry {
  // from albums
  id: number;
  mbid: string | null;
  slug: string;
  artist: string;
  album: string;
  country: string;
  year: number | null;
  cover_url: string | null;
  // from user_albums
  genre: string;
  subgenres: string;
  descriptors: string;
  rating: number | null;
  notes: string;
  recommended: number;
  is_hidden: number;    // 0 | 1
  added_at: string;
}

export interface User {
  id: number;
  google_id: string;
  email: string;
  username: string;
  display_name: string | null;
  profile_url: string | null;
  is_private: number;     // 0 | 1
  hide_added_at: number;  // 0 | 1
  avatar_url: string | null;
  is_admin: number;     // 0 | 1
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: number;
  expires_at: number;  // unix timestamp
}
