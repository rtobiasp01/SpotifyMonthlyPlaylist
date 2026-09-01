import sharp from "sharp";

export class PlaylistCoverService {
  public async generate(date: Date = new Date()): Promise<string> {
    const year = String(date.getFullYear());
    const monthRaw = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(date);
    const month = monthRaw.toUpperCase(); // ej: SEPTIEMBRE

    const svg = `
<svg width="640" height="640" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0c29"/>
      <stop offset="55%" stop-color="#302b63"/>
      <stop offset="100%" stop-color="#1DB954"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="white" stop-opacity="0.0"/>
      <stop offset="50%" stop-color="white" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.0"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="640" height="640" fill="url(#bg)"/>

  <!-- círculos sutiles para profundidad -->
  <circle cx="520" cy="110" r="180" fill="white" opacity="0.06"/>
  <circle cx="90" cy="560" r="160" fill="white" opacity="0.05"/>
  <rect y="0" width="640" height="640" fill="url(#shine)" opacity="0.6"/>

  <!-- borde interior sutil -->
  <rect x="18" y="18" width="604" height="604" rx="28" fill="none" stroke="white" stroke-opacity="0.10" stroke-width="2"/>

  <!-- etiqueta superior -->
  <text x="320" y="150" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="10" fill="white" opacity="0.78">MIS FAVORITAS</text>
  <rect x="270" y="168" width="100" height="2" rx="1" fill="white" opacity="0.35"/>

  <!-- AÑO en grande -->
  <text x="320" y="340" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="172" font-weight="900" letter-spacing="-8" fill="white" filter="url(#shadow)">${year}</text>

  <!-- MES -->
  <text x="320" y="410" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="42" font-weight="700" letter-spacing="14" fill="white" opacity="0.92">${month}</text>

  <!-- separador y spotify dot -->
  <g opacity="0.9">
    <circle cx="320" cy="452" r="3" fill="white" opacity="0.7"/>
    <text x="320" y="488" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="4" fill="white" opacity="0.70">SPOTIFY MONTHLY</text>
  </g>
</svg>`.trim();

    const jpegBuffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    // Spotify exige <256KB - nuestro jpeg ~ 60-90KB está bien
    if (jpegBuffer.length > 256 * 1024) {
      const smaller = await sharp(jpegBuffer).jpeg({ quality: 75 }).toBuffer();
      return smaller.toString("base64");
    }

    return jpegBuffer.toString("base64");
  }
}
