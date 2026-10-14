export type TablaAuditada = "turno" | "evolucion_clinica" | "paciente" | "evaluacion_inicial";

export type FilaAuditoria = {
  operacion: "INSERT" | "UPDATE" | "DELETE";
  fecha: string;
  usuario: { nombre: string | null; apellido: string | null } | null;
};

export type Sello = { nombre: string; fecha: string };
export type Estampa = { creado?: Sello; editado?: Sello };

function sello(f: FilaAuditoria): Sello {
  const nombre = f.usuario ? [f.usuario.nombre, f.usuario.apellido].filter(Boolean).join(" ") : "";
  return { nombre: nombre || "Sistema", fecha: f.fecha };
}

/** creado = INSERT mas antiguo; editado = UPDATE mas reciente. Actor nulo = "Sistema". */
export function reducirEstampa(filas: FilaAuditoria[]): Estampa {
  const ts = (f: FilaAuditoria) => new Date(f.fecha).getTime();
  const inserts = filas.filter((f) => f.operacion === "INSERT").sort((a, b) => ts(a) - ts(b));
  const updates = filas.filter((f) => f.operacion === "UPDATE").sort((a, b) => ts(b) - ts(a));
  return {
    ...(inserts[0] && { creado: sello(inserts[0]) }),
    ...(updates[0] && { editado: sello(updates[0]) }),
  };
}
