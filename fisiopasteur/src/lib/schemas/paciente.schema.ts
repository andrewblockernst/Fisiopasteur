import { z } from "zod";
import {
  nombrePersona,
  telefono,
  email,
  dniAR,
  fechaNacimiento,
  textoCorto,
  optionalString,
  LIMITES,
} from "@/lib/validators/common";

export const pacienteBaseSchema = z.object({
  nombre: nombrePersona("nombre"),
  apellido: nombrePersona("apellido"),
  telefono,
  email: optionalString.pipe(email.optional()),
  dni: optionalString.pipe(dniAR.optional()),
  fecha_nacimiento: optionalString.pipe(fechaNacimiento.optional()),
  direccion: optionalString.pipe(textoCorto("dirección").optional()),
});

export const pacienteCreateSchema = pacienteBaseSchema.extend({
  notif_confirmacion: z.boolean().default(true),
  notif_recordatorios: z.boolean().default(true),
});

export const pacienteUpdateSchema = pacienteBaseSchema.extend({
  notif_confirmacion: z.boolean().default(true),
  notif_recordatorios: z.boolean().default(true),
});

export type PacienteCreateInput = z.infer<typeof pacienteCreateSchema>;
export type PacienteUpdateInput = z.infer<typeof pacienteUpdateSchema>;

// Re-export límites para que los modales muestren hints/atributos HTML consistentes
export { LIMITES };
