"use server";

/**
 * Configuración de branding para la clínica
 */
export type BrandingConfig = {
  nombre: string;
  telefonoContacto: string | null;
  emailContacto: string | null;
  cuitCuil: string | null;
};

const DEFAULT_BRANDING: BrandingConfig = {
  nombre: "Fisiopasteur",
  telefonoContacto: null,
  emailContacto: null,
  cuitCuil: null,
};

/**
 * Obtiene la configuración de branding de la clínica
 */
export async function getBrandingConfig(): Promise<{
  success: boolean;
  data?: BrandingConfig;
  error?: string;
}> {
  return { success: true, data: DEFAULT_BRANDING };
}

/**
 * Formatea el nombre de la clínica para usar en mensajes
 */
export async function getNombreOrganizacion(): Promise<string> {
  return DEFAULT_BRANDING.nombre;
}
