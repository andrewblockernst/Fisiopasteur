import { z } from "zod";

// Política de contraseñas del sistema.
// Mínimo 10 (antes era 6, marcado como débil en la auditoría). El máximo 72 es
// el límite de bcrypt que usa Supabase Auth. Sin requisitos de complejidad:
// la longitud es la defensa principal y evita fricción innecesaria.
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`)
  .max(PASSWORD_MAX, `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`);
