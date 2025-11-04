"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/utils/auth-context";
import type { Organizacion } from "@/types/extended-database.types";

/**
 * Configuración de branding para una organización
 * Usada en headers, mensajes de WhatsApp, PDFs, etc.
 */
export type BrandingConfig = {
  nombre: string;
  telefonoContacto: string | null;
  emailContacto: string | null;
  cuitCuil: string | null;
  // En el futuro se puede extender con:
  // logo?: string;
  // colorPrimario?: string;
  // colorSecundario?: string;
  // direccion?: string;
};

/**
 * Obtiene la configuración de branding de la organización actual
 * @param orgId - ID opcional de la organización. Si no se pasa, se usa la del contexto
 * @returns Configuración de branding
 */
export async function getBrandingConfig(orgId?: string): Promise<{
  success: boolean;
  data?: BrandingConfig;
  error?: string;
}> {
  try {
    // Si no se pasa orgId, obtenerlo del contexto
    if (!orgId) {
      orgId = await getCurrentOrgId();
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizacion")
      .select("nombre, telefono_contacto, email_contacto, cuit_cuil")
      .eq("id_organizacion", orgId)
      .eq("activo", true)
      .single();

    if (error) {
      console.error("Error obteniendo branding de organización:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "Organización no encontrada" };
    }

    const branding: BrandingConfig = {
      nombre: data.nombre,
      telefonoContacto: data.telefono_contacto,
      emailContacto: data.email_contacto,
      cuitCuil: data.cuit_cuil,
    };

    return { success: true, data: branding };
  } catch (error) {
    console.error("Error inesperado obteniendo branding:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Obtiene los datos completos de una organización
 * @param orgId - ID de la organización
 * @returns Datos completos de la organización
 */
export async function getOrganizacion(orgId: string): Promise<{
  success: boolean;
  data?: Organizacion;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizacion")
      .select("*")
      .eq("id_organizacion", orgId)
      .single();

    if (error) {
      console.error("Error obteniendo organización:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Organizacion };
  } catch (error) {
    console.error("Error inesperado obteniendo organización:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Formatea el nombre de la organización para usar en mensajes
 * Ejemplo: "Hola, te escribimos de Fisiopasteur..."
 * @param orgId - ID opcional de la organización
 * @returns Nombre de la organización o string por defecto
 */
export async function getNombreOrganizacion(orgId?: string): Promise<string> {
  const result = await getBrandingConfig(orgId);
  return result.success && result.data ? result.data.nombre : "nuestra clínica";
}
