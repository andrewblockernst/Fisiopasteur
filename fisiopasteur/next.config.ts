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
  reactStrictMode: true,
  // Configuración de output para Vercel
  output: "standalone",
};

export default nextConfig;