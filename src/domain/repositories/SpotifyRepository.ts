import type { SpotifyAuthTokens } from "../models/SpotifyAuthTokens.js";

import type { SpotifyPlaylist } from "../models/SpotifyPlaylist.js";

import type {
  SpotifyTopTracks,
  SpotifyTopTracksQuery,
} from "../models/SpotifyTrack.js";

import type { SpotifyUser } from "../models/SpotifyUser.js";

export interface SpotifyRepository {
  createAuthorizationUrl(state: string, scopes: string[]): string;

  exchangeAuthorizationCode(code: string): Promise<SpotifyAuthTokens>;

  refreshAccessToken(refreshToken: string): Promise<SpotifyAuthTokens>;

  getCurrentUser(accessToken: string): Promise<SpotifyUser>;

  getTopTracks(
    accessToken: string,
    query?: SpotifyTopTracksQuery,
  ): Promise<SpotifyTopTracks>;

  createPlaylist(
    accessToken: string,
    name: string,
    description: string,
  ): Promise<SpotifyPlaylist>;

  addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackIds: string[],
  ): Promise<void>;
}
