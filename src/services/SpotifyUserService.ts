import type {
  SpotifyTopTracks,
  SpotifyTopTracksQuery,
} from "../domain/models/SpotifyTrack.js";

import type { SpotifyUser } from "../domain/models/SpotifyUser.js";

import type { SpotifyRepository } from "../domain/repositories/SpotifyRepository.js";

export class SpotifyUserService {
  public constructor(private readonly spotifyRepository: SpotifyRepository) {}

  public async getCurrentUser(accessToken: string): Promise<SpotifyUser> {
    return this.spotifyRepository.getCurrentUser(accessToken);
  }

  public async getTopTracks(
    accessToken: string,
    query?: SpotifyTopTracksQuery,
  ): Promise<SpotifyTopTracks> {
    return this.spotifyRepository.getTopTracks(accessToken, query);
  }
}
