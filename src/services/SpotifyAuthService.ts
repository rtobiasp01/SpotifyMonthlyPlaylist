import { randomBytes } from "node:crypto";

import type { SpotifyAuthTokens } from "../domain/models/SpotifyAuthTokens.js";

import type { SpotifyRepository } from "../domain/repositories/SpotifyRepository.js";

import { ForbiddenError } from "../shared/errors/AppError.js";

export interface SpotifyLogin {
  state: string;
  authorizationUrl: string;
}

export class SpotifyAuthService {
  // Cover requiere ugc-image-upload; migración Feb 2026: /tracks -> /items
  private readonly scopes = [
    "user-top-read",
    "playlist-modify-private",
    "playlist-modify-public",
    "ugc-image-upload",
  ];

  public constructor(private readonly spotifyRepository: SpotifyRepository) {}

  public createLogin(): SpotifyLogin {
    const state = randomBytes(32).toString("hex");

    const authorizationUrl = this.spotifyRepository.createAuthorizationUrl(
      state,
      this.scopes,
    );

    return {
      state,
      authorizationUrl,
    };
  }

  public validateState(receivedState: string, expectedState: string): void {
    if (receivedState !== expectedState) {
      throw new ForbiddenError("Invalid Spotify OAuth state.");
    }
  }

  public async exchangeCode(code: string): Promise<SpotifyAuthTokens> {
    return this.spotifyRepository.exchangeAuthorizationCode(code);
  }

  public async refreshToken(refreshToken: string): Promise<SpotifyAuthTokens> {
    return this.spotifyRepository.refreshAccessToken(refreshToken);
  }
}
