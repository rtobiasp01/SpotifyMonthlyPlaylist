import type { RequestHandler } from "express";

import type { SpotifyAuthService } from "../../services/SpotifyAuthService.js";

import { UnauthorizedError } from "../errors/AppError.js";

export function createRequireSpotifyAuth(
  spotifyAuthService: SpotifyAuthService,
): RequestHandler {
  return async (req, _res, next) => {
    try {
      const accessToken = req.session.spotifyAccessToken;

      const expiresAt = req.session.spotifyExpiresAt;

      if (!accessToken || !expiresAt) {
        throw new UnauthorizedError("Spotify authentication required.");
      }

      const refreshThreshold = 60_000;

      const tokenHasExpired = Date.now() >= expiresAt - refreshThreshold;

      if (!tokenHasExpired) {
        next();

        return;
      }

      const refreshToken = req.session.spotifyRefreshToken;

      if (!refreshToken) {
        clearSpotifySession(req);

        throw new UnauthorizedError("Spotify session expired.");
      }

      try {
        const tokens = await spotifyAuthService.refreshToken(refreshToken);

        if (tokens.expiresIn === undefined) {
          throw new Error("Spotify token expiration is missing.");
        }

        req.session.spotifyAccessToken = tokens.accesToken;

        req.session.spotifyExpiresAt = Date.now() + tokens.expiresIn * 1000;

        if (tokens.refreshToken) {
          req.session.spotifyRefreshToken = tokens.refreshToken;
        }

        next();
      } catch {
        clearSpotifySession(req);

        throw new UnauthorizedError(
          "Spotify authorization expired. Please log in again.",
        );
      }
    } catch (error) {
      next(error);
    }
  };
}

function clearSpotifySession(req: Parameters<RequestHandler>[0]): void {
  delete req.session.spotifyAccessToken;
  delete req.session.spotifyRefreshToken;
  delete req.session.spotifyExpiresAt;
}
