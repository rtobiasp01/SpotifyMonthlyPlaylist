import "dotenv/config";

import express from "express";
import session from "express-session";
import swaggerUi from "swagger-ui-express";

import { AuthController } from "./controllers/AuthController.js";

import { openapi } from "./docs/openapi.js";

import { SpotifyController } from "./controllers/SpotifyController.js";

import { SpotifyApiRepository } from "./infrastructure/repositories/SpotifyApiRepository.js";

import { SpotifyAuthService } from "./services/SpotifyAuthService.js";

import { SpotifyUserService } from "./services/SpotifyUserService.js";

import { errorHandler } from "./shared/middleware/errorHandler.js";

import { createRequireSpotifyAuth } from "./shared/middleware/requireSpotifyAuth.js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is required.`);
  }

  return value;
}

const port = Number(process.env.PORT ?? 3000);

const spotifyRepository = new SpotifyApiRepository({
  clientId: getRequiredEnv("SPOTIFY_CLIENT_ID"),

  clientSecret: getRequiredEnv("SPOTIFY_CLIENT_SECRET"),

  redirectUri: getRequiredEnv("SPOTIFY_REDIRECT_URI"),
});

const spotifyAuthService = new SpotifyAuthService(spotifyRepository);

const spotifyUserService = new SpotifyUserService(spotifyRepository);

const authController = new AuthController(spotifyAuthService);

const spotifyController = new SpotifyController(spotifyUserService);

const requireSpotifyAuth = createRequireSpotifyAuth(spotifyAuthService);

const app = express();

app.disable("x-powered-by");

app.use(express.json());

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
    name: "spotify.sid",

    secret: getRequiredEnv("SESSION_SECRET"),

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: "lax",

      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.get("/", (_req, res) => {
  res.type("html").send(`
            <!doctype html>

            <html lang="es">
                <head>
                    <meta charset="UTF-8">

                    <title>
                        Spotify API
                    </title>
                </head>

                <body>
                    <h1>Spotify API</h1>

                    <a href="/auth/login">
                        Iniciar sesión con Spotify
                    </a>
                </body>
            </html>
        `);
});

app.get("/auth/login", authController.login);

app.get("/auth/callback", authController.callback);

app.post("/auth/logout", authController.logout);

app.get("/api/me", requireSpotifyAuth, spotifyController.me);

app.get("/api/top-tracks", requireSpotifyAuth, spotifyController.topTracks);

app.get("/api-docs/openapi.json", (_req, res) => {
  res.json(openapi);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/api-docs/openapi.json",
    },
  }),
);

app.use(errorHandler);

app.listen(port, "127.0.0.1", () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});
