import { z } from "zod";
import { textoCorto, textoLargo, optionalString, LIMITES } from "@/lib/validators/common";

/**
 * Cotas pensadas para el formulario clínico:
 *  - Campos de una línea: 120 chars.
 *  - Textareas (cirugías, observaciones, otras afecciones, objetivos): 2000.
 *  - TA (presión arterial): patrón "120/80".
 *
 * Toda la sección es opcional — el modal permite guardar parcialmente.
 */

const lineaCorta = optionalString.pipe(textoCorto("campo").optional());
const areaLarga = optionalString.pipe(textoLargo("campo").optional());

const tensionArterial = optionalString.pipe(
  z
    .string()
    .regex(
      /^\d{2,3}\/\d{2,3}$/,
      "La TA debe tener el formato sistólica/diastólica (ej: 120/80).",
    )
    .optional(),
);

export const evaluacionInicialSchema = z.object({
  // Obra social y datos administrativos
  obra_social: lineaCorta,
  numero_afiliado: lineaCorta,

  // Profesional / laboral
  medico_actual: lineaCorta,
  trabajo_actual: lineaCorta,
  trabajo_anterior: z.boolean().optional(),
  trabajo_anterior_cual: lineaCorta,

  // Deportes
  realiza_deportes: z.boolean().optional(),
  deporte_cual: lineaCorta,

  // Dolor
  tiempo_con_dolor: lineaCorta,
  momento_mas_dolor: lineaCorta,
  traumatismo: z.boolean().optional(),
  traumatismo_descripcion: lineaCorta,

  // Antecedentes
  tratamiento_fk_anterior: z.boolean().optional(),
  antecedentes_familiares: z.boolean().optional(),
  antecedentes_familiares_quien: lineaCorta,
  toma_medicamentos: lineaCorta,

  // Diagnósticos por imagen
  diagnostico_rx: z.boolean().optional(),
  diagnostico_rm: z.boolean().optional(),
  diagnostico_tac: z.boolean().optional(),
  diagnostico_eco: z.boolean().optional(),
  diagnostico_observaciones: areaLarga,

  // Historia clínica adicional
  cirugias: areaLarga,
  otras_afecciones: areaLarga,
  ta: tensionArterial,
  artritis: z.boolean().optional(),
  fuma: z.boolean().optional(),
  toma_alcohol: z.boolean().optional(),
  dbt: z.boolean().optional(),
  fracturas: lineaCorta,

  // Específico mujeres
  embarazada: z.boolean().optional(),
  menopausia: z.boolean().optional(),
  diu: z.boolean().optional(),

  // Tratamiento
  objetivos_tratamiento: areaLarga,

  // Diagrama de dolor — array libre, no se valida contenido
  diagrama_dolor: z.array(z.any()).optional(),
});

export type EvaluacionInicialInput = z.infer<typeof evaluacionInicialSchema>;

export { LIMITES };
