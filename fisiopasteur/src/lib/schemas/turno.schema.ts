import { z } from "zod";
import {
  fechaTurno,
  fechaTurnoEditable,
  horaHHMM,
  observaciones as observacionesValidator,
  precioMonetario,
  cantidadSesiones,
  optionalString,
  textoCorto,
  LIMITES,
} from "@/lib/validators/common";

/**
 * Shape mínimo compartido entre crear/editar.
 * Server side recibe el objeto y hace `safeParse`. UI no necesita usarlo
 * directamente; los modales validan a mano + los HTML constraints. La fuente
 * de verdad es este schema en el server action.
 */

const baseShape = {
  hora: horaHHMM,
  id_especialista: z.string().uuid("Especialista inválido."),
  id_paciente: z.number().int().positive("Paciente inválido."),
  id_especialidad: z.number().int().positive("Especialidad inválida."),
  id_box: z.number().int().positive().nullable().optional(),
  observaciones: optionalString.pipe(observacionesValidator.optional()),
  tipo_plan: z.enum(["particular", "obra_social"]).optional(),
  estado: z.string().optional(),
  precio: precioMonetario.nullable().optional(),
};

/** Validación al CREAR turno individual: fecha no puede ser pasada. */
export const turnoCreateSchema = z.object({
  ...baseShape,
  fecha: fechaTurno,
  titulo_tratamiento: optionalString.pipe(textoCorto("título del tratamiento").optional()),
});

/** Validación al EDITAR turno: permite reagendar al pasado (correcciones). */
export const turnoUpdateSchema = z.object({
  ...baseShape,
  fecha: fechaTurnoEditable,
});

/**
 * Validación de paquete de sesiones.
 *
 * El horario puede resolverse de dos formas:
 *  - `mantenerHorario=true`: se usa `horaBase` para todos los días.
 *  - `mantenerHorario=false`: cada día seleccionado debe tener su entrada en
 *    `horariosPorDia`.
 *
 * En modo "por día", `horaBase` puede llegar vacía/null y el schema no debe
 * romper. La consistencia (cada día tiene horario) se chequea con un `superRefine`.
 */
export const paqueteSesionesSchema = z
  .object({
    fechaBase: fechaTurno,
    horaBase: optionalString.pipe(horaHHMM.optional()),
    numeroSesiones: cantidadSesiones,
    diasSeleccionados: z
      .array(z.number().int().min(1).max(7))
      .min(1, "Seleccioná al menos un día de la semana."),
    mantenerHorario: z.boolean().optional(),
    horariosPorDia: z.record(z.string(), z.string()).optional(),
    id_especialista: z.string().uuid("Especialista inválido."),
    id_paciente: z.number().int().positive("Paciente inválido."),
    id_especialidad: z.number().int().positive("Especialidad inválida."),
    id_box: z.number().int().positive().nullable().optional(),
    observaciones: optionalString.pipe(observacionesValidator.optional()),
    tipo_plan: z.enum(["particular", "obra_social"]),
    titulo_tratamiento: optionalString.pipe(textoCorto("título del tratamiento").optional()),
  })
  .superRefine((data, ctx) => {
    const usaHoraBase = data.mantenerHorario !== false;
    if (usaHoraBase) {
      if (!data.horaBase) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["horaBase"],
          message: "La hora base es obligatoria cuando se mantiene el mismo horario.",
        });
      }
    } else {
      const horarios = data.horariosPorDia ?? {};
      const faltantes = data.diasSeleccionados.filter((d) => {
        const v = horarios[String(d)];
        return !v || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      });
      if (faltantes.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["horariosPorDia"],
          message: "Asigná un horario válido a cada día seleccionado.",
        });
      }
    }
  });

export type TurnoCreateInput = z.infer<typeof turnoCreateSchema>;
export type TurnoUpdateInput = z.infer<typeof turnoUpdateSchema>;
export type PaqueteSesionesInput = z.infer<typeof paqueteSesionesSchema>;

export { LIMITES };
