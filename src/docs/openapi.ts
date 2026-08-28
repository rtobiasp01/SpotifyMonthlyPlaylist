export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Spotify API",
    version: "1.0.0",
    description: "API para autenticacion de usuarios mediante Spotify.",
  },
  servers: [
    {
      url: "http://localhost:3000",
    },
  ],
  tags: [
    {
      name: "Autenticacion",
    },
    {
      name: "Spotify",
    },
  ],
  components: {
    securitySchemes: {
      spotifySession: {
        type: "apiKey",
        in: "cookie",
        name: "spotify.sid",
        description: "Cookie de sesion creada tras completar el login de Spotify.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                example: "UNAUTHORIZED",
              },
              message: {
                type: "string",
                example: "Spotify authentication required.",
              },
            },
          },
        },
      },
      SpotifyImage: {
        type: "object",
        required: ["url", "width", "height"],
        properties: {
          url: { type: "string", format: "uri" },
          width: { type: "integer", nullable: true },
          height: { type: "integer", nullable: true },
        },
      },
      SpotifyUser: {
        type: "object",
        required: ["accountId", "displayName", "email", "images", "spotifyUrl"],
        properties: {
          accountId: { type: "string", example: "user-123" },
          displayName: { type: "string", nullable: true },
          email: { type: "string", format: "email", nullable: true },
          images: {
            type: "array",
            items: { $ref: "#/components/schemas/SpotifyImage" },
          },
          spotifyUrl: { type: "string", format: "uri", nullable: true },
        },
      },
      SpotifyArtist: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
      SpotifyAlbum: {
        type: "object",
        required: ["id", "name", "imageUrl"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          imageUrl: { type: "string", format: "uri", nullable: true },
        },
      },
      SpotifyTrack: {
        type: "object",
        required: ["id", "name", "artists", "album", "spotifyUrl"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          artists: {
            type: "array",
            items: { $ref: "#/components/schemas/SpotifyArtist" },
          },
          album: { $ref: "#/components/schemas/SpotifyAlbum" },
          spotifyUrl: { type: "string", format: "uri", nullable: true },
        },
      },
      TopTracksResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "object",
            required: ["items", "total", "limit", "offset"],
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/SpotifyTrack" },
              },
              total: { type: "integer" },
              limit: { type: "integer" },
              offset: { type: "integer" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/auth/login": {
      get: {
        tags: ["Autenticacion"],
        summary: "Inicia el login con Spotify",
        responses: {
          "302": {
            description: "Redireccion a la autorizacion de Spotify.",
          },
        },
      },
    },
    "/auth/callback": {
      get: {
        tags: ["Autenticacion"],
        summary: "Procesa el callback OAuth de Spotify",
        parameters: [
          {
            name: "code",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "state",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "error",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "302": {
            description: "Redireccion a los datos del usuario autenticado.",
          },
          "400": {
            description: "Parametros OAuth invalidos.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Autenticacion"],
        summary: "Cierra la sesion actual",
        security: [{ spotifySession: [] }],
        responses: {
          "204": { description: "Sesion cerrada." },
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Spotify"],
        summary: "Obtiene el usuario autenticado",
        security: [{ spotifySession: [] }],
        responses: {
          "200": {
            description: "Usuario actual.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: {
                    data: { $ref: "#/components/schemas/SpotifyUser" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Sesion de Spotify ausente o expirada.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/top-tracks": {
      get: {
        tags: ["Spotify"],
        summary: "Obtiene las canciones mas escuchadas",
        security: [{ spotifySession: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Cantidad de canciones, entre 1 y 50.",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
          },
          {
            name: "timeRange",
            in: "query",
            description: "Periodo de escucha de Spotify.",
            required: false,
            schema: {
              type: "string",
              enum: ["short_term", "medium_term", "long_term"],
              default: "medium_term",
            },
          },
        ],
        responses: {
          "200": {
            description: "Canciones mas escuchadas.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TopTracksResponse" },
              },
            },
          },
          "400": {
            description: "Parametros de consulta invalidos.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Sesion de Spotify ausente o expirada.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
} as const;
