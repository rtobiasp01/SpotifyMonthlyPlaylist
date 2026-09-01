import type { SpotifyPlaylist } from "../domain/models/SpotifyPlaylist.js";

import type {
  SpotifyTimeRange,
} from "../domain/models/SpotifyTrack.js";

import type { SpotifyRepository } from "../domain/repositories/SpotifyRepository.js";

import { BadRequestError } from "../shared/errors/AppError.js";

import type { PlaylistCoverService } from "./PlaylistCoverService.js";

export interface CreateTopTracksPlaylistOptions {
  limit?: number;
  timeRange?: SpotifyTimeRange;
}

export class CreateTopTracksPlaylistService {
  public constructor(
    private readonly spotifyRepository: SpotifyRepository,
    private readonly playlistCoverService?: PlaylistCoverService,
  ) {}

  public async execute(
    accessToken: string,
    options: CreateTopTracksPlaylistOptions = {},
  ): Promise<SpotifyPlaylist> {
    const limit = options.limit ?? 50;
    const timeRange = options.timeRange ?? "short_term";

    const topTracks = await this.spotifyRepository.getTopTracks(accessToken, {
      limit,
      timeRange,
    });

    if (topTracks.items.length === 0) {
      throw new BadRequestError(
        "No hay canciones en tu top para este periodo. Escucha más música o prueba con otro rango (medium_term / long_term).",
      );
    }

    const playlist = await this.spotifyRepository.createPlaylist(
      accessToken,
      this.createPlaylistName(),
      `Tus ${topTracks.items.length} canciones favoritas. Generado con SpotifyMonthly.`,
    );

    await this.spotifyRepository.addTracksToPlaylist(
      accessToken,
      playlist.id,
      topTracks.items.map((track) => track.id),
    );

    // Portada personalizada: no bloquear si falla (ej. falta scope ugc-image-upload)
    if (this.playlistCoverService) {
      try {
        const base64 = await this.playlistCoverService.generate(new Date());
        await this.spotifyRepository.uploadPlaylistCover(
          accessToken,
          playlist.id,
          base64,
        );
      } catch (error) {
        console.warn("No se pudo subir portada personalizada:", error);
      }
    }

    return playlist;
  }

  private createPlaylistName(): string {
    const formatter = new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
    });

    return `🔥 Mis favoritas · ${formatter.format(new Date())}`;
  }
}
