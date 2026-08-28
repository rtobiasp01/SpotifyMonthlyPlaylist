import { AppError } from "./AppError.js";

export class SpotifyApiError extends AppError {
  public constructor(
    message: string,
    public readonly spotifyStatusCode: number,
  ) {
    super(message, 502, "SPOTIFY_API_ERROR");
  }
}
