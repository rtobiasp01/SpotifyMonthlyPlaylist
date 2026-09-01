import "dotenv/config";

import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import swaggerUi from "swagger-ui-express";

import { AuthController } from "./controllers/AuthController.js";

import { openapi } from "./docs/openapi.js";

import { SpotifyController } from "./controllers/SpotifyController.js";

import { SpotifyApiRepository } from "./infrastructure/repositories/SpotifyApiRepository.js";

import { CreateTopTracksPlaylistService } from "./services/CreateTopTracksPlaylistService.js";

import { PlaylistCoverService } from "./services/PlaylistCoverService.js";

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

const playlistCoverService = new PlaylistCoverService();

const createTopTracksPlaylistService = new CreateTopTracksPlaylistService(
  spotifyRepository,
  playlistCoverService,
);

const authController = new AuthController(spotifyAuthService);

const spotifyController = new SpotifyController(
  spotifyUserService,
  createTopTracksPlaylistService,
);

const requireSpotifyAuth = createRequireSpotifyAuth(spotifyAuthService);

const app = express();

app.disable("x-powered-by");

app.use(express.json());

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const MemoryStore = createMemoryStore(session);

app.use(
  session({
    name: "spotify.sid",

    secret: getRequiredEnv("SESSION_SECRET"),

    resave: false,

    saveUninitialized: false,

    store: new MemoryStore({
      checkPeriod: 1000 * 60 * 60, // prune cada hora
    }),

    cookie: {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: "lax",

      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f0c29"/><stop offset="55%" stop-color="#302b63"/><stop offset="100%" stop-color="#1DB954"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#g)"/><text x="16" y="22" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="white">♪</text></svg>`;

app.get("/favicon.svg", (_req, res) => {
  res.type("image/svg+xml").setHeader("Cache-Control", "public, max-age=86400").send(faviconSvg);
});

app.get("/favicon.ico", (_req, res) => {
  res.type("image/svg+xml").setHeader("Cache-Control", "public, max-age=86400").send(faviconSvg);
});

app.get("/", (_req, res) => {
  res.type("html").send(`
            <!doctype html>
            <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
                    <link rel="alternate icon" href="/favicon.ico">
                    <title>SpotifyMonthly - Tu top mensual</title>
                    <style>
                        * { box-sizing: border-box; }
                        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 32px 20px; background: #121212; color: #fff; min-height: 100vh; }
                        h1 { font-size: 2rem; margin: 0 0 8px; }
                        .subtitle { color: #b3b3b3; margin: 0 0 24px; }
                        .card { background: #1e1e1e; border: 1px solid #2a2a2a; border-radius: 16px; padding: 24px; margin: 16px 0; }
                        .hidden { display: none !important; }
                        a.button, button.button { display: inline-block; background: #1DB954; color: #fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 700; border: none; cursor: pointer; font-size: 1rem; }
                        a.button.secondary, button.secondary { background: #2a2a2a; color: #fff; }
                        button.button:disabled { opacity: 0.6; cursor: not-allowed; }
                        button.button:hover:not(:disabled), a.button:hover { filter: brightness(1.08); }
                        .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
                        label { font-size: 0.9rem; color: #b3b3b3; }
                        select, input { background: #2a2a2a; color: #fff; border: 1px solid #3a3a3a; border-radius: 8px; padding: 8px 10px; }
                        .status { margin-top: 16px; padding: 12px 14px; border-radius: 10px; font-size: 0.95rem; }
                        .status.error { background: #3a1a1a; border: 1px solid #6a2a2a; color: #ffb3b3; }
                        .status.success { background: #143a1a; border: 1px solid #1f6a2a; color: #b3ffb3; }
                        .status.info { background: #1a2a3a; border: 1px solid #2a4a6a; color: #b3d4ff; }
                        .track { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #2a2a2a; align-items: center; }
                        .track img { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; background: #2a2a2a; }
                        .track .meta { flex: 1; min-width: 0; }
                        .track .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        .track .artists { color: #b3b3b3; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        code { background: #2a2a2a; padding: 2px 6px; border-radius: 6px; font-size: 0.85rem; }
                    </style>
                </head>
                <body>
                    <h1>🎵 SpotifyMonthly</h1>
                    <p class="subtitle">Genera una playlist privada con tu top mensual de canciones escuchadas.</p>

                    <div id="loading" class="card">Cargando...</div>

                    <div id="logged-out" class="card hidden">
                        <h2>Conecta tu Spotify</h2>
                        <p style="color:#b3b3b3">Inicia sesión para crear tu playlist personalizada del último mes (<code>short_term</code>).</p>
                        <a class="button" href="/auth/login">Iniciar sesión con Spotify</a>
                    </div>

                    <div id="logged-in" class="card hidden">
                        <h2 id="welcome">¡Hola!</h2>
                        <p id="user-detail" style="color:#b3b3b3"></p>

                        <div class="row">
                            <label>Canciones: <select id="limit"><option value="10">10</option><option value="25">25</option><option value="50" selected>50</option></select></label>
                            <label>Periodo: <select id="timeRange"><option value="short_term" selected>Últimas 4 semanas (mensual)</option><option value="medium_term">Últimos 6 meses</option><option value="long_term">Todo el tiempo</option></select></label>
                        </div>

                        <div class="row">
                            <button id="btn-preview" class="button secondary">Ver mi top</button>
                            <button id="btn-generate" class="button">✨ Generar playlist mensual</button>
                            <button id="btn-logout" class="button secondary">Cerrar sesión</button>
                        </div>

                        <div id="status" class="hidden"></div>
                    </div>

                    <div id="playlist-result" class="card hidden"></div>
                    <div id="tracks" class="card hidden"></div>

                    <script>
                        const $ = (s) => document.querySelector(s);
                        const loading = $("#loading");
                        const loggedOut = $("#logged-out");
                        const loggedIn = $("#logged-in");
                        const welcome = $("#welcome");
                        const userDetail = $("#user-detail");
                        const statusEl = $("#status");
                        const playlistResult = $("#playlist-result");
                        const tracksEl = $("#tracks");
                        const btnGenerate = $("#btn-generate");
                        const btnPreview = $("#btn-preview");
                        const btnLogout = $("#btn-logout");

                        function showStatus(msg, type) {
                            statusEl.textContent = msg;
                            statusEl.className = "status " + type;
                            statusEl.classList.remove("hidden");
                        }
                        function hideStatus() { statusEl.classList.add("hidden"); }
                        function escapeHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

                        async function checkAuth() {
                            try {
                                const res = await fetch("/api/me", { credentials: "same-origin" });
                                if (!res.ok) throw new Error();
                                const json = await res.json();
                                const user = json.data;
                                loading.classList.add("hidden");
                                loggedIn.classList.remove("hidden");
                                welcome.textContent = "¡Hola, " + (user.displayName || user.accountId) + "!";
                                userDetail.innerHTML = user.email ? escapeHtml(user.email) + " · " + '<a href="' + escapeHtml(user.spotifyUrl || '#') + '" target="_blank" rel="noopener" style="color:#1DB954">Abrir en Spotify</a>' : "";
                                // Mostrar última playlist si existe en sesión via /success datos? Intenta leer de session via query? No, se muestra tras generar.
                            } catch {
                                loading.classList.add("hidden");
                                loggedOut.classList.remove("hidden");
                            }
                        }

                        btnGenerate.addEventListener("click", async () => {
                            hideStatus();
                            playlistResult.classList.add("hidden");
                            const limit = $("#limit").value;
                            const timeRange = $("#timeRange").value;
                            btnGenerate.disabled = true;
                            btnGenerate.textContent = "Generando...";
                            showStatus("Creando playlist con tu top (" + limit + " canciones, " + timeRange + ")...", "info");
                            try {
                                const res = await fetch("/api/playlists/top-tracks", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "same-origin",
                                    body: JSON.stringify({ limit: Number(limit), timeRange })
                                });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json?.error?.message || "Error al crear playlist");
                                const pl = json.data;
                                showStatus("¡Playlist creada!", "success");
                                const url = pl.spotifyUrl || ("https://open.spotify.com/playlist/" + encodeURIComponent(pl.id));
                                playlistResult.innerHTML = '<h3>🎉 ' + escapeHtml(pl.name) + '</h3><p style="color:#b3b3b3">Playlist privada creada con ' + limit + ' canciones.</p><a class="button" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Abrir en Spotify</a> <a class="button secondary" href="/success?playlist=' + encodeURIComponent(pl.id) + '">Ver detalle</a>';
                                playlistResult.classList.remove("hidden");
                            } catch (e) {
                                showStatus(e.message || "Error inesperado", "error");
                            } finally {
                                btnGenerate.disabled = false;
                                btnGenerate.textContent = "✨ Generar playlist mensual";
                            }
                        });

                        btnPreview.addEventListener("click", async () => {
                            hideStatus();
                            tracksEl.classList.add("hidden");
                            btnPreview.disabled = true;
                            showStatus("Cargando tu top...", "info");
                            try {
                                const limit = $("#limit").value;
                                const timeRange = $("#timeRange").value;
                                const res = await fetch("/api/top-tracks?limit=" + encodeURIComponent(limit) + "&timeRange=" + encodeURIComponent(timeRange), { credentials: "same-origin" });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json?.error?.message || "Error al cargar top tracks");
                                const items = json.data.items;
                                if (items.length === 0) { showStatus("No hay canciones para ese periodo. Prueba otro rango.", "error"); return; }
                                hideStatus();
                                tracksEl.innerHTML = "<h3>Tu top (" + items.length + ")</h3>" + items.map(function(t, i){
                                    return '<div class="track"><span style="color:#b3b3b3; width:22px">' + (i+1) + '</span>' + (t.album.imageUrl ? '<img src="' + escapeHtml(t.album.imageUrl) + '" alt="">' : '<div style="width:48px;height:48px;background:#2a2a2a;border-radius:6px"></div>') + '<div class="meta"><div class="name">' + escapeHtml(t.name) + '</div><div class="artists">' + escapeHtml(t.artists.map(function(a){return a.name}).join(", ")) + ' · ' + escapeHtml(t.album.name) + '</div></div>' + (t.spotifyUrl ? '<a href="' + escapeHtml(t.spotifyUrl) + '" target="_blank" rel="noopener" style="color:#1DB954">↗</a>' : '') + '</div>';
                                }).join("");
                                tracksEl.classList.remove("hidden");
                            } catch (e) {
                                showStatus(e.message || "Error inesperado", "error");
                            } finally {
                                btnPreview.disabled = false;
                            }
                        });

                        btnLogout.addEventListener("click", async () => {
                            await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
                            location.reload();
                        });

                        checkAuth();
                    </script>
                </body>
            </html>
        `);
});

app.get("/success", (req, res) => {
  const playlistId =
    (req.query.playlist as string | undefined) ??
    req.session.spotifyPlaylistId;

  const playlistName =
    req.session.spotifyPlaylistName ?? "🔥 Mis favoritas";

  const playlistUrl = req.session.spotifyPlaylistUrl;

  if (!playlistId) {
    res.status(400).type("html").send(`
            <!doctype html>
            <html lang="es">
                <head><meta charset="UTF-8"><title>Error</title></head>
                <body>
                    <h1>⚠️ No hay playlist</h1>
                    <p>No se encontró ninguna playlist. Intenta iniciar sesión de nuevo.</p>
                    <a href="/auth/login">Iniciar sesión con Spotify</a>
                </body>
            </html>
        `);
    return;
  }

  const spotifyLink = playlistUrl ?? `https://open.spotify.com/playlist/${encodeURIComponent(playlistId)}`;

  res.type("html").send(`
            <!doctype html>
            <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Playlist creada</title>
                    <style>
                        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
                        .card { border: 1px solid #ddd; border-radius: 12px; padding: 24px; }
                        a.button { display: inline-block; background: #1DB954; color: #fff; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 600; margin-top: 16px; }
                        a.secondary { color: #333; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>🎉 Playlist creada</h1>
                        <p>Hemos creado:</p>
                        <h2>${playlistName}</h2>
                        <p>con tus 50 canciones favoritas de las últimas semanas (time_range=short_term).</p>
                        <a class="button" href="${spotifyLink}" target="_blank" rel="noopener">Abrir en Spotify</a>
                        <p style="margin-top: 16px;"><a class="secondary" href="/api/me">Ver mi perfil</a> · <a class="secondary" href="/api/top-tracks?limit=50&timeRange=short_term">Ver top tracks</a></p>
                    </div>
                </body>
            </html>
        `);
});

app.get("/auth/login", authController.login);

app.get("/auth/callback", authController.callback);

app.post("/auth/logout", authController.logout);

app.get("/api/me", requireSpotifyAuth, spotifyController.me);

app.get("/api/top-tracks", requireSpotifyAuth, spotifyController.topTracks);

app.post("/api/playlists/top-tracks", requireSpotifyAuth, spotifyController.createTopPlaylist);

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

const host = process.env.HOST ?? "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
