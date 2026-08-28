import type { SpotifyAuthTokens } from "../../domain/models/SpotifyAuthTokens.js";

import type {
  SpotifyTopTracks,
  SpotifyTopTracksQuery,
  SpotifyTrack,
} from "../../domain/models/SpotifyTrack.js";

import type { SpotifyUser } from "../../domain/models/SpotifyUser.js";

import type { SpotifyRepository } from "../../domain/repositories/SpotifyRepository.js";

import { SpotifyApiError } from "../../shared/errors/SpotifyError.js";

interface SpotifyApiRepositoryConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface SpotifyTokenApiResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface SpotifyUserApiResponse {
  account_id: string;

  display_name: string | null;

  email?: string;

  images: Array<{
    url: string;
    width: number | null;
    height: number | null;
  }>;

  external_urls?: {
    spotify?: string;
  };
}

interface SpotifyTrackApiResponse {
  id: string;

  name: string;

  external_urls?: {
    spotify?: string;
  };

  artists: Array<{
    id: string;
    name: string;
  }>;

  album: {
    id: string;
    name: string;

    images: Array<{
      url: string;
      width: number | null;
      height: number | null;
    }>;
  };
}

interface SpotifyTopTracksApiResponse {
  items: SpotifyTrackApiResponse[];
  total: number;
  limit: number;
  offset: number;
}

export class SpotifyApiRepository implements SpotifyRepository {
  private static readonly API_URL = "https://api.spotify.com/v1";

  private static readonly ACCOUNTS_URL = "https://accounts.spotify.com";

  public constructor(private readonly config: SpotifyApiRepositoryConfig) {}

  public createAuthorizationUrl(state: string, scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(" "),
      state,
    });

    return (
      `${SpotifyApiRepository.ACCOUNTS_URL}` + `/authorize?${params.toString()}`
    );
  }

  public async exchangeAuthorizationCode(
    code: string,
  ): Promise<SpotifyAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
    });

    const response = await fetch(
      `${SpotifyApiRepository.ACCOUNTS_URL}/api/token`,
      {
        method: "POST",
        headers: {
          Authorization: this.createBasicAuthorizationHeader(),

          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const data = await this.parseResponse<SpotifyTokenApiResponse>(response);

    return this.mapTokens(data);
  }

  public async refreshAccessToken(
    refreshToken: string,
  ): Promise<SpotifyAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(
      `${SpotifyApiRepository.ACCOUNTS_URL}/api/token`,
      {
        method: "POST",
        headers: {
          Authorization: this.createBasicAuthorizationHeader(),

          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const data = await this.parseResponse<SpotifyTokenApiResponse>(response);

    return this.mapTokens(data);
  }

  public async getCurrentUser(accessToken: string): Promise<SpotifyUser> {
    const data = await this.spotifyGet<SpotifyUserApiResponse>(
      "/me",
      accessToken,
    );

    return {
      accountId: data.account_id,
      displayName: data.display_name,
      email: data.email ?? null,

      images: data.images.map((image) => ({
        url: image.url,
        width: image.width,
        height: image.height,
      })),

      spotifyUrl: data.external_urls?.spotify ?? null,
    };
  }

  public async getTopTracks(
    accessToken: string,
    query: SpotifyTopTracksQuery = {},
  ): Promise<SpotifyTopTracks> {
    const params = new URLSearchParams({
      limit: String(query.limit ?? 10),
      offset: String(query.offset ?? 0),
      time_range: query.timeRange ?? "medium_term",
    });

    const data = await this.spotifyGet<SpotifyTopTracksApiResponse>(
      `/me/top/tracks?${params.toString()}`,
      accessToken,
    );

    return {
      items: data.items.map((track) => this.mapTrack(track)),

      total: data.total,
      limit: data.limit,
      offset: data.offset,
    };
  }

  private async spotifyGet<T>(
    endpoint: string,
    accessToken: string,
  ): Promise<T> {
    const response = await fetch(`${SpotifyApiRepository.API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return this.parseResponse<T>(response);
  }

  private createBasicAuthorizationHeader(): string {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    return `Basic ${credentials}`;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const message = await response.text();

      throw new SpotifyApiError(
        `Spotify request failed: ${message}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  }

  private mapTokens(data: SpotifyTokenApiResponse): SpotifyAuthTokens {
    return {
      accesToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      tokenType: data.token_type,
    };
  }

  private mapTrack(track: SpotifyTrackApiResponse): SpotifyTrack {
    return {
      id: track.id,
      name: track.name,

      artists: track.artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),

      album: {
        id: track.album.id,
        name: track.album.name,
        imageUrl: track.album.images[0]?.url ?? null,
      },

      spotifyUrl: track.external_urls?.spotify ?? null,
    };
  }
}
