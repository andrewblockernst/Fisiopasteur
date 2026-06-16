import { useState, useTransition } from "react";
import { EditarEspecialistaDialog } from "./editar-especialista-dialog";
import { DeleteEspecialistaDialog } from "./eliminar-especialista-dialog";
import type { Tables } from "@/lib/database.types";
import { formatoNumeroTelefono } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toggleEspecialistaActivo } from "@/lib/actions/especialista.action";
import { useToastStore } from "@/stores/toast-store";
import { useAuth } from "@/hooks/usePerfil";
import { Loader2, Plus, Pencil, UserX, UserCheck } from "lucide-react";
import CompactListTable from "@/componentes/tablas/compact-list-table";
import { EntityListCard } from "@/componentes/tablas/entity-list-card";
import { Badge, IconButton } from "@/componentes/ui";

type Especialidad = Tables<"especialidad">;

// ✅ Tipo que coincide con getEspecialistas()
type EspecialistaConDatos = {
  id_usuario: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  color: string | null;
  activo: boolean;
  id_rol: number;
  rol: {
    id: number;
    nombre: string;
  };
  especialidades: Array<{
    id_especialidad: number;
    nombre: string;
    precio_particular: number | null;
    precio_obra_social: number | null;
  }>;
  usuario_especialidad: Array<{
    precio_particular: number | null;
    precio_obra_social: number | null;
    activo: boolean | null;
    especialidad: {
      id_especialidad: number;
      nombre: string;
    };
  }>;
};

interface EspecialistasTableProps {
  especialistas: EspecialistaConDatos[];
  onEspecialistaDeleted?: () => void;
  onEspecialistaUpdated?: () => void;
  especialidades: Especialidad[];
  setShowDialog: (show: boolean) => void;
}

export function EspecialistasTable({ 
  especialistas, 
  onEspecialistaDeleted, 
  onEspecialistaUpdated,
  especialidades,
  setShowDialog
}: EspecialistasTableProps) {
  const [editingEspecialista, setEditingEspecialista] = useState<EspecialistaConDatos | null>(null);
  const [deletingEspecialista, setDeletingEspecialista] = useState<EspecialistaConDatos | null>(null);
  const [isPending, startTransition] = useTransition();
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [isNavigating, startNavigationTransition] = useTransition();
  const { addToast } = useToastStore();
  const { user } = useAuth();
  const router = useRouter();

  // Navega al perfil del especialista. Usamos useTransition para que isPending
  // se mantenga en true hasta que Next termine la transición de ruta, así
  // mostramos un spinner en la fila clickeada mientras carga.
  const handleNavigateToEspecialista = (id: string) => {
    if (navigatingId) return; // evita dobles clics
    setNavigatingId(id);
    startNavigationTransition(() => {
      router.push(`/especialistas/${id}`);
    });
  };

  const handleEditClose = () => {
    setEditingEspecialista(null);
    if (onEspecialistaUpdated) {
      onEspecialistaUpdated();
    }
  };

  const handleToggleActivo = (especialista: EspecialistaConDatos) => {
    startTransition(async () => {
      const res = await toggleEspecialistaActivo(especialista.id_usuario, !especialista.activo);

      if (!res.success) {
        addToast({
          variant: "error",
          message: "Error al actualizar estado",
          description: res.error || "No se pudo actualizar el estado del especialista"
        });
        return;
      } else {
        addToast({
          variant: res.success ? "success" : "error",
          message: "Estado actualizado",
          description: `El especialista ahora está ${!especialista.activo ? "activo" : "inactivo"}`,
        });
      }

      
      if (onEspecialistaUpdated) onEspecialistaUpdated();
    });
  };

  return (
    <>
      {/* Tabla desktop (≥lg) */}
      <div className="hidden lg:block h-full">
        <CompactListTable className="flex-1 min-h-0">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Especialidades</th>
              <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Color</th>
              <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Teléfono</th>
              <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
              {user?.puedeGestionarTurnos && (
                <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {especialistas.map((especialista) => {
              const isRowNavigating = navigatingId === especialista.id_usuario;
              const rowDisabled = Boolean(navigatingId);
              return (
                <tr
                  key={especialista.id_usuario}
                  onClick={() => handleNavigateToEspecialista(especialista.id_usuario)}
                  className={`${!especialista.activo ? "opacity-60" : ""} ${isRowNavigating ? "bg-muted/40" : ""} ${rowDisabled && !isRowNavigating ? "pointer-events-none opacity-70" : ""} hover:bg-muted/30 transition-colors cursor-pointer`}
                >
                  <td className="px-4 py-1 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      {isRowNavigating && (
                        <Loader2 className="w-4 h-4 animate-spin text-brand shrink-0" aria-label="Cargando perfil" />
                      )}
                      <span>{especialista.nombre} {especialista.apellido}</span>
                    </div>
                  </td>
                  <td className="px-4 py-1 whitespace-nowrap text-sm text-foreground">
                    {especialista.email}
                  </td>
                  <td className="px-4 py-1 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {especialista.especialidades && especialista.especialidades.length > 0 ? (
                        especialista.especialidades.map((especialidad) => (
                          <Badge
                            key={especialidad.id_especialidad}
                            variant="default"
                            size="sm"
                            pill
                          >
                            {especialidad.nombre}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin especialidades</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-1 whitespace-nowrap">
                    <div
                      className="w-5 h-5 rounded border border-border"
                      style={{ backgroundColor: especialista.color || "var(--muted-foreground)" }}
                      aria-label={`Color del especialista: ${especialista.color || 'sin definir'}`}
                    />
                  </td>
                  <td className="px-4 py-1 whitespace-nowrap text-sm text-foreground">
                    {formatoNumeroTelefono(especialista.telefono || "No disponible")}
                  </td>
                  <td className="px-4 py-1 whitespace-nowrap">
                    <Badge
                      variant={especialista.activo ? "success" : "default"}
                      size="sm"
                      pill
                    >
                      {especialista.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  {user?.puedeGestionarTurnos && (
                    <td
                      className="px-4 py-1 whitespace-nowrap text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-1">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar especialista"
                          title="Editar"
                          icon={<Pencil className="w-4 h-4" />}
                          onClick={() => setEditingEspecialista(especialista)}
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          aria-label={especialista.activo ? "Desactivar especialista" : "Activar especialista"}
                          title={especialista.activo ? "Desactivar" : "Activar"}
                          className={especialista.activo ? "text-destructive hover:bg-destructive/10" : "text-success hover:bg-success/10"}
                          icon={especialista.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          onClick={() =>
                            especialista.activo
                              ? setDeletingEspecialista(especialista)
                              : handleToggleActivo(especialista)
                          }
                        />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </CompactListTable>
      </div>

      {/* NIVEL 2: Vista tablet (md..<lg) — cards unificadas */}
      <div className="hidden md:block lg:hidden p-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {especialistas.map((especialista) => {
            const isRowNavigating = navigatingId === especialista.id_usuario;
            const rowDisabled = Boolean(navigatingId);
            const especialidadesNode =
              especialista.especialidades && especialista.especialidades.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {especialista.especialidades.map((esp) => (
                    <Badge key={esp.id_especialidad} variant="default" size="sm" pill>
                      {esp.nombre}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Sin especialidades</span>
              );

            return (
              <EntityListCard
                key={especialista.id_usuario}
                title={`${especialista.nombre} ${especialista.apellido}`}
                colorDot={especialista.color}
                inactive={!especialista.activo}
                onClick={rowDisabled ? undefined : () => handleNavigateToEspecialista(especialista.id_usuario)}
                className={rowDisabled && !isRowNavigating ? "pointer-events-none" : undefined}
                leadingIndicator={
                  isRowNavigating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand" aria-label="Cargando perfil" />
                  ) : null
                }
                badge={
                  <Badge variant={especialista.activo ? 'success' : 'default'} size="sm" pill>
                    {especialista.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                }
                fields={[
                  { label: 'Email', value: especialista.email || '...' },
                  { label: 'Teléfono', value: formatoNumeroTelefono(especialista.telefono || 'No disponible') },
                  { label: 'Especialidades', value: especialidadesNode, fullWidth: true },
                ]}
                actions={
                  user?.puedeGestionarTurnos ? (
                    <>
                      <IconButton
                        variant="secondary"
                        size="sm"
                        aria-label="Editar especialista"
                        title="Editar"
                        icon={<Pencil className="w-4 h-4" />}
                        onClick={() => setEditingEspecialista(especialista)}
                      />
                      <IconButton
                        variant={especialista.activo ? 'destructive' : 'success'}
                        size="sm"
                        disabled={isPending}
                        aria-label={especialista.activo ? 'Desactivar especialista' : 'Activar especialista'}
                        title={especialista.activo ? 'Desactivar' : 'Activar'}
                        icon={especialista.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        onClick={() =>
                          especialista.activo
                            ? setDeletingEspecialista(especialista)
                            : handleToggleActivo(especialista)
                        }
                      />
                    </>
                  ) : null
                }
              />
            );
          })}
        </div>
      </div>

      {/* NIVEL 1: Vista mobile (<md) — 1 fila por especialista */}
      <div className="block md:hidden bg-background relative min-h-full flex flex-col">
        <div className="divide-y divide-border">
          {especialistas.map((especialista) => {
            const isRowNavigating = navigatingId === especialista.id_usuario;
            const rowDisabled = Boolean(navigatingId);
            return (
              <div
                key={especialista.id_usuario}
                className={`px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors ${isRowNavigating ? "bg-muted/40" : ""} ${rowDisabled && !isRowNavigating ? "pointer-events-none opacity-70" : ""}`}
                onClick={() => handleNavigateToEspecialista(especialista.id_usuario)}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-foreground font-medium truncate">
                    {especialista.nombre} {especialista.apellido}
                  </p>
                  {isRowNavigating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand shrink-0" aria-label="Cargando perfil" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: especialista.color || "var(--muted-foreground)" }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Espacio en blanco al final + FAB sticky dentro del scroll — solo admin/programadores */}
        {user?.puedeGestionarTurnos && (
          <>
            <div className="mt-auto h-20 shrink-0" aria-hidden />
            <div className="sticky bottom-4 z-20 -mt-16 flex justify-end pr-4 pointer-events-none">
              <button
                type="button"
                aria-label="Agregar nuevo especialista"
                onClick={() => setShowDialog(true)}
                className="pointer-events-auto h-14 w-14 rounded-full bg-brand text-brand-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </>
        )}
      </div>

      {editingEspecialista && (
        <EditarEspecialistaDialog
          isOpen={true}
          onClose={handleEditClose}
          especialidades={especialidades}
          especialista={editingEspecialista}
        />
      )}

      {deletingEspecialista && (
        <DeleteEspecialistaDialog
          isOpen={true}
          onClose={() => {
            setDeletingEspecialista(null);
            if (onEspecialistaUpdated) onEspecialistaUpdated();
          }}
          especialista={{
            id_usuario: deletingEspecialista.id_usuario,
            nombre: deletingEspecialista.nombre,
            apellido: deletingEspecialista.apellido,
            email: deletingEspecialista.email,
            telefono: deletingEspecialista.telefono,
            color: deletingEspecialista.color,
            activo: deletingEspecialista.activo,
            contraseña: '',
            created_at: null,
            id_especialidad: null,
            updated_at: null,
            id_rol: deletingEspecialista.id_rol,
          }}
          handleToast={addToast}
        />
      )}
    </>
  );
}