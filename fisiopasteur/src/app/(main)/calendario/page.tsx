import React from "react";
import CalendarioClientQuery from "../../../componentes/calendario/calendario-client-query";
import { obtenerEspecialistas } from "@/lib/actions/turno.action";
import { createClient } from "@/lib/supabase/server";
import { puedeGestionarTurnos } from "@/lib/constants/roles";

export default async function CalendarioPage() {
  const supabase = await createClient();

  const [resEspecialistas, { data: { user } }] = await Promise.all([
    obtenerEspecialistas(),
    supabase.auth.getUser(),
  ]);

  let especialistas = resEspecialistas.success ? resEspecialistas.data || [] : [];
  let initialEspecialistasFiltro: string[] = [];

  if (user) {
    const { data: usuario } = await supabase
      .from('usuario')
      .select('id_usuario, id_rol')
      .eq('id_usuario', user.id)
      .maybeSingle();

    if (usuario && !puedeGestionarTurnos(usuario.id_rol ?? undefined)) {
      const esEspecialista = especialistas.some((esp: any) => esp.id_usuario === usuario.id_usuario);
      if (esEspecialista) {
        // Pre-selecciona al usuario en el filtro inicial pero no lo restringe:
        // puede destildar/tildar a otros especialistas o usar "Todos".
        initialEspecialistasFiltro = [usuario.id_usuario];
      }
    }
  }

  return (
    <CalendarioClientQuery
      especialistas={especialistas}
      initialEspecialistasFiltro={initialEspecialistasFiltro}
    />
  );
}
