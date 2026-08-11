import { z } from "zod";

// Política de contraseñas del sistema.
// Mínimo 6 (alineado con `minimum_password_length` en supabase/config.toml).
// El máximo 72 es el límite de bcrypt que usa Supabase Auth. Sin requisitos de
// complejidad: la longitud es la defensa principal y evita fricción innecesaria.
// NOTA: la auditoría de seguridad recomendó subir el mínimo (6 se marcó como
// débil); si se sube acá, subir también minimum_password_length en config.toml.
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`)
  .max(PASSWORD_MAX, `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`);
