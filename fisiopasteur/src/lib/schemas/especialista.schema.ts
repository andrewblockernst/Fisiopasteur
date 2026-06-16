import { z } from "zod";
import {
  nombrePersona,
  email,
  telefono,
  colorHex,
  optionalString,
  LIMITES,
} from "@/lib/validators/common";

export const especialistaBaseSchema = z.object({
  nombre: nombrePersona("nombre"),
  apellido: nombrePersona("apellido"),
  email,
  telefono,
  color: colorHex.default("#3B82F6"),
  especialidades: z
    .array(z.number())
    .min(1, "Seleccioná al menos una especialidad."),
});

export const especialistaCreateSchema = especialistaBaseSchema.extend({
  contraseña: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(72, "La contraseña no puede superar 72 caracteres."),
});

export const especialistaUpdateSchema = especialistaBaseSchema.extend({
  contraseña: optionalString.pipe(
    z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres.")
      .max(72, "La contraseña no puede superar 72 caracteres.")
      .optional(),
  ),
});

export type EspecialistaCreateInput = z.infer<typeof especialistaCreateSchema>;
export type EspecialistaUpdateInput = z.infer<typeof especialistaUpdateSchema>;

export { LIMITES };
