import type { RequestHandler } from "express";

import type { SpotifyAuthService } from "../services/SpotifyAuthService.js";

import { BadRequestError } from "../shared/errors/AppError.js";

export class AuthController {
  public constructor(
    private readonly spotifyAuthService: SpotifyAuthService,
  ) {}

  public login: RequestHandler = (req, res, next): void => {
    try {
      const { state, authorizationUrl } = this.spotifyAuthService.createLogin();

      req.session.spotifyState = state;

      res.redirect(authorizationUrl);
    } catch (error) {
      next(error);
    }
  };

  public callback: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const code = req.query.code;
      const state = req.query.state;
      const spotifyError = req.query.error;

      if (typeof spotifyError === "string") {
        throw new BadRequestError(
          `Spotify authorization rejected: ${spotifyError}`,
        );
      }

      if (typeof code !== "string") {
        throw new BadRequestError("Spotify authorization code missing.");
      }

      if (typeof state !== "string") {
        throw new BadRequestError("Spotify OAuth state missing.");
      }

      const expectedState = req.session.spotifyState;

      if (!expectedState) {
        throw new BadRequestError("Spotify OAuth session state missing.");
      }

      this.spotifyAuthService.validateState(state, expectedState);

      delete req.session.spotifyState;

      const tokens = await this.spotifyAuthService.exchangeCode(code);

      const accessToken = tokens.accessToken ?? tokens.accesToken;

      if (!accessToken) {
        throw new BadRequestError("Spotify access token missing.");
      }

      if (typeof tokens.expiresIn !== "number") {
        throw new BadRequestError("Spotify token expiration missing.");
      }

      req.session.spotifyAccessToken = accessToken;
      req.session.spotifyExpiresAt = Date.now() + tokens.expiresIn * 1000;

      if (tokens.refreshToken) {
        req.session.spotifyRefreshToken = tokens.refreshToken;
      }

      // Ya no se crea la playlist automáticamente: el usuario la generará con el botón en la web "/"
      res.redirect("/");
    } catch (error) {
      next(error);
    }
  };

  public logout: RequestHandler = (req, res, next): void => {
    req.session.destroy((error) => {
      if (error) {
        next(error);

        return;
      }

      res.clearCookie("connect.sid");

      res.status(204).send();
    });
  };
}
