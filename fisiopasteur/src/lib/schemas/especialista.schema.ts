import { z } from "zod";
import {
  nombrePersona,
  email,
  telefono,
  colorHex,
  optionalString,
  LIMITES,
} from "@/lib/validators/common";
import { passwordSchema } from "@/lib/schemas/password.schema";

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
  contraseña: passwordSchema,
});

export const especialistaUpdateSchema = especialistaBaseSchema.extend({
  contraseña: optionalString.pipe(passwordSchema.optional()),
});

export type EspecialistaCreateInput = z.infer<typeof especialistaCreateSchema>;
export type EspecialistaUpdateInput = z.infer<typeof especialistaUpdateSchema>;

export { LIMITES };
