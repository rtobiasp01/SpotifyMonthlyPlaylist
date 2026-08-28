export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface SpotifyTrack {
  id: string;
  name: string;

  artists: SpotifyArtist[];

  album: SpotifyAlbum;

  spotifyUrl: string | null;
}

export interface SpotifyTopTracks {
  items: SpotifyTrack[];
  total: number;
  limit: number;
  offset: number;
}

export type SpotifyTimeRange = "short_term" | "medium_term" | "long_term";

export interface SpotifyTopTracksQuery {
  limit?: number;
  offset?: number;
  timeRange?: SpotifyTimeRange;
}
