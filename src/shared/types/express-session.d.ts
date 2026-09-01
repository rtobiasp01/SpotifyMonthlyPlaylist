import "express-session";

declare module "express-session" {
  interface SessionData {
    spotifyState?: string;

    spotifyAccessToken?: string;

    spotifyRefreshToken?: string;

    spotifyExpiresAt?: number;

    spotifyPlaylistId?: string;

    spotifyPlaylistUrl?: string | null;

    spotifyPlaylistName?: string;
  }
}
