/**
 * Acciones permitidas sobre un turno según su estado.
 *
 *  estado       | confirmar | cancelar | editar | eliminar
 *  ------------ | --------- | -------- | ------ | --------
 *  programado   |    ✓      |    ✓     |   ✓    |    ✓
 *  pendiente    |    ✓      |    ✓     |   ✓    |    ✓
 *  atendido     |    ·      |    ✓     |   ✓    |    ✓
 *  cancelado    |    ✓      |    ·     |   ✓    |    ✓
 *
 * "confirmar" = marcar como atendido (transiciona estado → 'atendido').
 * "cancelar" transiciona estado → 'cancelado'.
 * Las restricciones temporales (turno en el pasado) se aplican aparte y no
 * se manejan acá: este módulo cubre exclusivamente la lógica por estado.
 */

export type EstadoTurno = "programado" | "pendiente" | "atendido" | "cancelado" | (string & {});

const ESTADOS_CONFIRMABLES = new Set<string>(["programado", "pendiente", "cancelado"]);
const ESTADOS_CANCELABLES = new Set<string>(["programado", "pendiente", "atendido"]);

export function puedeConfirmar(estado: EstadoTurno | null | undefined): boolean {
  return !!estado && ESTADOS_CONFIRMABLES.has(estado);
}

export function puedeCancelar(estado: EstadoTurno | null | undefined): boolean {
  return !!estado && ESTADOS_CANCELABLES.has(estado);
}

export function puedeEditar(_estado: EstadoTurno | null | undefined): boolean {
  return true;
}

export function puedeEliminar(_estado: EstadoTurno | null | undefined): boolean {
  return true;
}

export const ESTADOS_PARA_CONFIRMAR = Array.from(ESTADOS_CONFIRMABLES);
export const ESTADOS_PARA_CANCELAR = Array.from(ESTADOS_CANCELABLES);

/**
 * Mapeo estado → estilos usados en la fila del listado desktop.
 * Mantener sincronizado con `getRowClassName` en `listado-turnos.tsx`.
 */
export const ESTADO_COLORES: Array<{
  estado: EstadoTurno;
  label: string;
  swatchClass: string;
}> = [
  {
    estado: "programado",
    label: "Programado",
    swatchClass: "bg-white border-l-4 border-l-gray-300",
  },
  {
    estado: "pendiente",
    label: "Pendiente",
    swatchClass: "bg-yellow-50 border-l-4 border-l-yellow-500",
  },
  {
    estado: "atendido",
    label: "Atendido",
    swatchClass: "bg-green-100 border-l-4 border-l-green-500",
  },
  {
    estado: "cancelado",
    label: "Cancelado",
    swatchClass: "bg-red-100 border-l-4 border-l-red-500",
  },
];
