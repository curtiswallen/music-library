export interface Album {
  id: number;
  mbid: string | null;
  artist: string;
  album: string;
  country: string;
  year: number | null;
  genre: string;
  subgenres: string; // JSON-encoded string[]
  rating: number | null;
  notes: string;
  fav_tracks: string; // JSON-encoded string[]
  recommended: number; // 0 | 1
  cover_url: string | null;
  created_at: string;
}
