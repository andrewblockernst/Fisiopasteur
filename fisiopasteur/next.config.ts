import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/auth-helpers-nextjs']
  },
  images: {
    //ALMACENAMIENTO DE IMAGENES EN SUPABASE EN CASO DE AGREGAR ALGUNA
    domains: ['qasrvhpdcerymjtvcfed.supabase.co'] 
  },
};

export default nextConfig;