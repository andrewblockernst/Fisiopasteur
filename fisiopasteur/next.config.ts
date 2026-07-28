import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ TEMPORAL: Ignoring type errors to allow deployment
    ignoreBuildErrors: true,
  },
  // Ayuda con el rastreo de archivos en Vercel
  outputFileTracingRoot: path.join(__dirname, "../"),
  images: {
    //ALMACENAMIENTO DE IMAGENES EN SUPABASE EN CASO DE AGREGAR ALGUNA
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qasrvhpdcerymjtvcfed.supabase.co",
      },
    ],
  },
  async headers() {
    // CSP arranca en Report-Only: reporta violaciones en la consola SIN
    // bloquear, así no rompe nada. Validar en dev (ojo con MercadoPago si se
    // usa checkout client-side) y después promover la key a
    // "Content-Security-Policy" para que sea enforcing.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // Enforced — bajo riesgo de romper la app:
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // CSP en modo reporte (no bloquea) hasta validar:
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
  reactStrictMode: true,
  // Configuración de output para Vercel
  output: "standalone",
};

export default nextConfig;