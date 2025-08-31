import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
  },
  images: {
    //ALMACENAMIENTO DE IMAGENES EN SUPABASE EN CASO DE AGREGAR ALGUNA
    domains: ['qasrvhpdcerymjtvcfed.supabase.co'] 
  },
  reactStrictMode: true,
};

export default nextConfig;