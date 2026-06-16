/**
 * Validadores Zod compartidos en todo el sistema.
 *
 * Convención:
 *  - Los primitivos no exportan strings (los errores van en cada `.refine` / mensaje).
 *  - Las cotas numéricas (edad, meses futuros, length máx) viven en `LIMITES`
 *    para que la UI pueda leerlas y mostrar hints consistentes.
 *  - Usar `dayjs` (no `new Date()`) para que respete timezone Argentina configurado.
 */

import { z } from "zod";
import { dayjs, todayYmd } from "@/lib/dayjs";
import { isValidPhoneNumber } from "@/lib/utils/phone.utils";

// =============================================================================
// LÍMITES — exportados para que la UI muestre hints consistentes
// =============================================================================

export const LIMITES = {
  // Personas
  nombrePersonaMin: 2,
  nombrePersonaMax: 60,

  // Email (RFC 5321 — 254 chars máx para la dirección completa)
  emailMax: 254,

  // Edad de paciente
  edadMaxAnios: 120,

  // Turnos
  mesesFuturoTurnoMax: 12,
  // Al editar un turno se permite reagendar al pasado (corrección retroactiva),
  // pero no más allá de N meses para evitar cambios accidentales en históricos.
  mesesPasadoEditarMax: 6,

  // Sesiones
  paqueteSesionesMin: 1,
  paqueteSesionesMax: 60,

  // Textos
  textoCortoMax: 120,
  textoLargoMax: 2000,
  observacionesMax: 1000,

  // Numéricos
  precioMax: 99_999_999,

  // DNI argentino
  dniMin: 7,
  dniMax: 8,
} as const;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Acepta string vacío / undefined y lo transforma a undefined.
 * Útil para inputs HTML que devuelven "" cuando el usuario no escribe nada.
 */
export const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : undefined));

// =============================================================================
// STRINGS
// =============================================================================

export const nombrePersona = (label = "nombre") =>
  z
    .string()
    .trim()
    .min(LIMITES.nombrePersonaMin, `El ${label} debe tener al menos ${LIMITES.nombrePersonaMin} caracteres.`)
    .max(LIMITES.nombrePersonaMax, `El ${label} no puede superar ${LIMITES.nombrePersonaMax} caracteres.`);

export const textoCorto = (label = "campo", max: number = LIMITES.textoCortoMax) =>
  z
    .string()
    .trim()
    .max(max, `El ${label} no puede superar ${max} caracteres.`);

export const textoLargo = (label = "campo", max: number = LIMITES.textoLargoMax) =>
  z
    .string()
    .trim()
    .max(max, `El ${label} no puede superar ${max} caracteres.`);

export const observaciones = textoLargo("observaciones", LIMITES.observacionesMax);

// =============================================================================
// IDENTIFICADORES
// =============================================================================

/** DNI argentino: 7 u 8 dígitos sin puntos. */
export const dniAR = z
  .string()
  .trim()
  .regex(/^\d{7,8}$/, `El DNI debe tener entre ${LIMITES.dniMin} y ${LIMITES.dniMax} dígitos, sin puntos.`);

// =============================================================================
// CONTACTO
// =============================================================================

export const telefono = z
  .string()
  .trim()
  .refine(isValidPhoneNumber, "Formato de teléfono inválido. Ej: 1166782051");

export const email = z
  .string()
  .trim()
  .max(LIMITES.emailMax, `El email no puede superar ${LIMITES.emailMax} caracteres.`)
  .email("Email inválido.");

// =============================================================================
// COLORES
// =============================================================================

export const colorHex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "El color debe tener formato #RRGGBB.");

// =============================================================================
// FECHAS
// =============================================================================

const esYmdValido = (v: string): boolean => {
  if (!v) return false;
  return dayjs(v, "YYYY-MM-DD", true).isValid();
};

/**
 * Fecha de nacimiento: válida, no futura, no más de 120 años atrás.
 */
export const fechaNacimiento = z
  .string()
  .refine(esYmdValido, "Fecha de nacimiento inválida (formato AAAA-MM-DD).")
  .refine((v) => {
    const d = dayjs(v).startOf("day");
    return d.valueOf() <= dayjs().endOf("day").valueOf();
  }, "La fecha de nacimiento no puede ser futura.")
  .refine((v) => {
    const d = dayjs(v).startOf("day");
    const limite = dayjs().subtract(LIMITES.edadMaxAnios, "year");
    return d.valueOf() >= limite.valueOf();
  }, `La fecha de nacimiento no puede ser de hace más de ${LIMITES.edadMaxAnios} años.`);

/**
 * Fecha de turno: válida, no en el pasado, no más de N meses adelante.
 * Usar cuando se CREA un turno. Para editar, ver `fechaTurnoEditable`.
 */
export const fechaTurno = z
  .string()
  .refine(esYmdValido, "Fecha de turno inválida (formato AAAA-MM-DD).")
  .refine((v) => {
    const d = dayjs(v).startOf("day");
    return d.valueOf() >= dayjs().startOf("day").valueOf();
  }, "La fecha del turno no puede ser pasada.")
  .refine((v) => {
    const d = dayjs(v).startOf("day");
    const limite = dayjs().add(LIMITES.mesesFuturoTurnoMax, "month");
    return d.valueOf() <= limite.valueOf();
  }, `La fecha del turno no puede ser de más de ${LIMITES.mesesFuturoTurnoMax} meses en el futuro.`);

/**
 * Igual a fechaTurno pero permite el pasado (para reagendar / corregir).
 * Mantiene la cota máxima a futuro y agrega cota mínima al pasado.
 */
export const fechaTurnoEditable = z
  .string()
  .refine(esYmdValido, "Fecha de turno inválida (formato AAAA-MM-DD).")
  .refine((v) => {
    const d = dayjs(v).startOf("day");
    const limite = dayjs().add(LIMITES.mesesFuturoTurnoMax, "month");
    return d.valueOf() <= limite.valueOf();
  }, `La fecha del turno no puede ser de más de ${LIMITES.mesesFuturoTurnoMax} meses en el futuro.`)
  .refine((v) => {
    const d = dayjs(v).startOf("day");
    const limite = dayjs().subtract(LIMITES.mesesPasadoEditarMax, "month").startOf("day");
    return d.valueOf() >= limite.valueOf();
  }, `La fecha del turno no puede ser de más de ${LIMITES.mesesPasadoEditarMax} meses en el pasado.`);

/** Hora HH:MM (24 hs). */
export const horaHHMM = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida (formato HH:MM).");

// =============================================================================
// NUMÉRICOS
// =============================================================================

export const precioMonetario = z
  .number()
  .nonnegative("El precio no puede ser negativo.")
  .max(LIMITES.precioMax, "Precio demasiado alto.");

export const cantidadSesiones = z
  .number()
  .int("Debe ser un número entero.")
  .min(LIMITES.paqueteSesionesMin, `Mínimo ${LIMITES.paqueteSesionesMin} sesión.`)
  .max(LIMITES.paqueteSesionesMax, `Máximo ${LIMITES.paqueteSesionesMax} sesiones.`);

// =============================================================================
// HELPERS PARA UI (HTML input attributes)
// =============================================================================

/** Valor `min` para `<input type="date">` aplicable a fecha de nacimiento. */
export const fechaNacimientoMinInput = (): string =>
  dayjs().subtract(LIMITES.edadMaxAnios, "year").format("YYYY-MM-DD");

/** Valor `max` para `<input type="date">` aplicable a fecha de nacimiento. */
export const fechaNacimientoMaxInput = (): string => todayYmd();

/** Valor `min` para `<input type="date">` aplicable a fecha de turno nuevo. */
export const fechaTurnoMinInput = (): string => todayYmd();

/** Valor `max` para `<input type="date">` aplicable a fecha de turno. */
export const fechaTurnoMaxInput = (): string =>
  dayjs().add(LIMITES.mesesFuturoTurnoMax, "month").format("YYYY-MM-DD");

/** Valor `min` para `<input type="date">` cuando se EDITA un turno (permite retroactivo). */
export const fechaTurnoEditarMinInput = (): string =>
  dayjs().subtract(LIMITES.mesesPasadoEditarMax, "month").format("YYYY-MM-DD");

// =============================================================================
// HELPERS PARA VALIDACIÓN INLINE EN MODALES
// =============================================================================

/**
 * Valida una fecha de turno y devuelve mensaje de error inline o null.
 * `modo='crear'` rechaza pasado; `modo='editar'` lo permite (para reagendar).
 * Acepta string vacío y devuelve null (sin error) para no spammear hasta que
 * el usuario haya escrito algo.
 */
export function validarFechaTurnoInline(
  fechaYmd: string,
  modo: "crear" | "editar" = "crear",
): string | null {
  if (!fechaYmd) return null;
  const d = dayjs(fechaYmd, "YYYY-MM-DD", true);
  if (!d.isValid()) return "Fecha inválida.";
  if (modo === "crear" && d.startOf("day").valueOf() < dayjs().startOf("day").valueOf()) {
    return "La fecha no puede ser pasada.";
  }
  if (modo === "editar") {
    const limitePasado = dayjs().subtract(LIMITES.mesesPasadoEditarMax, "month").startOf("day");
    if (d.startOf("day").valueOf() < limitePasado.valueOf()) {
      return `La fecha no puede ser de más de ${LIMITES.mesesPasadoEditarMax} meses en el pasado.`;
    }
  }
  const limite = dayjs().add(LIMITES.mesesFuturoTurnoMax, "month");
  if (d.startOf("day").valueOf() > limite.valueOf()) {
    return `La fecha no puede ser de más de ${LIMITES.mesesFuturoTurnoMax} meses en el futuro.`;
  }
  return null;
}

/**
 * Valida la combinación fecha+hora para detectar horario ya pasado.
 * Sólo aplica para creación de turnos.
 */
export function validarHoraPasadaInline(fechaYmd: string, horaHm: string): string | null {
  if (!fechaYmd || !horaHm) return null;
  const dt = dayjs(`${fechaYmd} ${horaHm}`, "YYYY-MM-DD HH:mm", true);
  if (!dt.isValid()) return null;
  if (dt.valueOf() < dayjs().valueOf()) {
    return "Este horario ya pasó.";
  }
  return null;
}

/** Valida fecha de nacimiento y devuelve mensaje inline o null. */
export function validarFechaNacimientoInline(fechaYmd: string): string | null {
  if (!fechaYmd) return null;
  const d = dayjs(fechaYmd, "YYYY-MM-DD", true);
  if (!d.isValid()) return "Fecha inválida.";
  if (d.startOf("day").valueOf() > dayjs().endOf("day").valueOf()) {
    return "La fecha de nacimiento no puede ser futura.";
  }
  const limite = dayjs().subtract(LIMITES.edadMaxAnios, "year");
  if (d.startOf("day").valueOf() < limite.valueOf()) {
    return `La fecha de nacimiento no puede ser de hace más de ${LIMITES.edadMaxAnios} años.`;
  }
  return null;
}
