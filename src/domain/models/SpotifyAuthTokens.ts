export interface SpotifyAuthTokens {
  accessToken?: string;
  /** @deprecated usa accessToken */
  accesToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType: string;
}
