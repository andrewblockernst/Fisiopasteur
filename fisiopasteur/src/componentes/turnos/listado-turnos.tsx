"use client";

export default function TablaTurnos({ turnos }: { turnos: any[] }) {
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="p-3 text-left">Fecha</th>
            <th className="p-3 text-left">Hora</th>
            <th className="p-3 text-left">Paciente</th>
            <th className="p-3 text-left">Especialista</th>
            <th className="p-3 text-left">Box</th>
            <th className="p-3 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {turnos?.map((t) => (
            <tr key={t.id_turno} className="border-t">
              <td className="p-3">{t.fecha}</td>
              <td className="p-3">{t.hora}</td>
              <td className="p-3">
                {t.paciente ? `${t.paciente.apellido}, ${t.paciente.nombre}` : "—"}
              </td>
              <td className="p-3">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: t.especialista?.color || "#9C1838" }} />
                  {t.especialista ? `${t.especialista.apellido}, ${t.especialista.nombre}` : "—"}
                </span>
              </td>
              <td className="p-3">{t.box?.numero ?? "—"}</td>
              <td className="p-3 capitalize">{t.estado ?? "programado"}</td>
            </tr>
          ))}
          {!turnos?.length && (
            <tr><td className="p-6 text-center text-gray-500" colSpan={6}>Sin resultados</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
