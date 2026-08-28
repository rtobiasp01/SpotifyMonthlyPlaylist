import type { RequestHandler } from "express";

import type { SpotifyTimeRange } from "../domain/models/SpotifyTrack.js";

import type { SpotifyUserService } from "../services/SpotifyUserService.js";

import {
  BadRequestError,
  UnauthorizedError,
} from "../shared/errors/AppError.js";

export class SpotifyController {
  public constructor(private readonly spotifyUserService: SpotifyUserService) {}

  public me: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const accessToken = this.getAccessToken(req);

      const user = await this.spotifyUserService.getCurrentUser(accessToken);

      res.json({
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  public topTracks: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const accessToken = this.getAccessToken(req);

      const limit = this.parseLimit(req.query.limit);

      const timeRange = this.parseTimeRange(req.query.timeRange);

      const tracks = await this.spotifyUserService.getTopTracks(accessToken, {
        limit,
        timeRange,
      });

      res.json({
        data: tracks,
      });
    } catch (error) {
      next(error);
    }
  };

  private getAccessToken(req: Parameters<RequestHandler>[0]): string {
    const accessToken = req.session.spotifyAccessToken;

    if (!accessToken) {
      throw new UnauthorizedError("Spotify authentication required.");
    }

    return accessToken;
  }

  private parseLimit(value: unknown): number {
    if (value === undefined) {
      return 10;
    }

    if (typeof value !== "string") {
      throw new BadRequestError("Invalid limit.");
    }

    const limit = Number(value);

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new BadRequestError("Limit must be between 1 and 50.");
    }

    return limit;
  }

  private parseTimeRange(value: unknown): SpotifyTimeRange {
    if (value === undefined) {
      return "medium_term";
    }

    const allowedValues: SpotifyTimeRange[] = [
      "short_term",
      "medium_term",
      "long_term",
    ];

    if (
      typeof value !== "string" ||
      !allowedValues.includes(value as SpotifyTimeRange)
    ) {
      throw new BadRequestError("Invalid timeRange.");
    }

    return value as SpotifyTimeRange;
  }
}
