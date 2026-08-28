export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyUser {
  accountId: string;
  displayName: string | null;
  email: string | null;
  images: SpotifyImage[];
  spotifyUrl: string | null;
}
