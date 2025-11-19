# 📚 EJEMPLOS DE USO: SISTEMA MULTI-ORGANIZACIÓN

Este documento contiene ejemplos concretos de cómo implementar las funciones actualizadas con el nuevo sistema multi-organización.

---

## 📖 ÍNDICE
1. [Server Actions](#server-actions)
2. [Server Components](#server-components)
3. [Client Components](#client-components)
4. [API Routes](#api-routes)
5. [Servicios](#servicios)

---

## 1. SERVER ACTIONS

### Ejemplo: Action de Turnos
```typescript
// src/lib/actions/turno.action.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/utils/auth-context";
import { revalidatePath } from "next/cache";

export async function obtenerTurnos(filtros?: { fecha?: string }) {
  const supabase = await createClient();
  
  try {
    // ✅ 1. Obtener contexto organizacional
    const { orgId, userId } = await getAuthContext();

    // ✅ 2. Query con filtro de organización
    let query = supabase
      .from("turno")
      .select("*, paciente(*), especialista(*)")
      .eq("id_organizacion", orgId) // 🔑 CLAVE: Filtrar por org
      .order("fecha", { ascending: true });

    // 3. Aplicar filtros adicionales
    if (filtros?.fecha) {
      query = query.eq("fecha", filtros.fecha);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    // Si no hay org seleccionada, getAuthContext() lanza error
    return { success: false, error: error.message };
  }
}

export async function crearTurno(datos: any) {
  const supabase = await createClient();
  
  try {
    // ✅ 1. Obtener contexto
    const { orgId, userId } = await getAuthContext();

    // ✅ 2. Inyectar orgId en los datos
    const turnoConOrg = {
      ...datos,
      id_organizacion: orgId,
    };

    // 3. Insertar
    const { data, error } = await supabase
      .from("turno")
      .insert(turnoConOrg)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 4. Revalidar caché
    revalidatePath("/turnos");
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### Ejemplo: Action de Pacientes
```typescript
// src/lib/actions/paciente.action.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/utils/auth-context";

export async function getPacientes(search?: string) {
  const supabase = await createClient();
  
  try {
    const { orgId } = await getAuthContext();

    let query = supabase
      .from("paciente")
      .select("*")
      .eq("id_organizacion", orgId) // 🔑 Filtrar por org
      .order("apellido");

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPaciente(formData: FormData) {
  const supabase = await createClient();
  
  try {
    const { orgId } = await getAuthContext();

    const pacienteData = {
      nombre: formData.get("nombre") as string,
      apellido: formData.get("apellido") as string,
      email: formData.get("email") as string,
      telefono: formData.get("telefono") as string,
      dni: formData.get("dni") as string,
      id_organizacion: orgId, // 🔑 Inyectar orgId
    };

    const { data, error } = await supabase
      .from("paciente")
      .insert(pacienteData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### Ejemplo: Action de Especialistas (NUEVO MODELO)
```typescript
// src/lib/actions/especialista.action.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";
import { getAuthContext } from "@/lib/utils/auth-context";

export async function getEspecialistas() {
  const supabase = await createClient();
  
  try {
    const { orgId } = await getAuthContext();

    // ✅ CAMBIO: Consultar usuario_organizacion, NO usuario
    const { data, error } = await supabase
      .from("usuario_organizacion")
      .select(`
        id_usuario_organizacion,
        id_usuario,
        id_rol,
        color_calendario,
        activo,
        usuario:id_usuario(
          id_usuario,
          nombre,
          apellido,
          email,
          telefono
        ),
        usuario_especialidad(
          id_usuario_especialidad,
          id_especialidad,
          precio_particular,
          precio_obra_social,
          especialidad:id_especialidad(
            id_especialidad,
            nombre
          )
        )
      `)
      .eq("id_organizacion", orgId) // 🔑 Filtrar por org
      .eq("activo", true)
      .in("id_rol", [1, 2]); // Administrador y Especialista

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createEspecialista(formData: FormData) {
  try {
    const { orgId } = await getAuthContext();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const nombre = formData.get("nombre") as string;
    const apellido = formData.get("apellido") as string;
    const color = formData.get("color") as string;

    // 1. Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = 
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre, apellido },
      });

    if (authError || !authUser.user) {
      return { success: false, error: authError?.message };
    }

    // 2. Crear en tabla usuario
    const { error: usuarioError } = await supabaseAdmin
      .from("usuario")
      .insert({
        id_usuario: authUser.user.id,
        nombre,
        apellido,
        email,
        activo: true,
        contraseña: "**AUTH**", // Placeholder
      });

    if (usuarioError) {
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: usuarioError.message };
    }

    // 3. ✅ NUEVO: Asignar a la organización
    const { data: usuarioOrg, error: orgError } = await supabaseAdmin
      .from("usuario_organizacion")
      .insert({
        id_usuario: authUser.user.id,
        id_organizacion: orgId, // 🔑 Asignar a esta org
        id_rol: 2, // Especialista
        color_calendario: color,
        activo: true,
      })
      .select()
      .single();

    if (orgError || !usuarioOrg) {
      // Rollback completo
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin
        .from("usuario")
        .delete()
        .eq("id_usuario", authUser.user.id);
      return { success: false, error: orgError?.message };
    }

    // 4. ✅ CAMBIO: Asignar especialidades referenciando usuario_organizacion
    const especialidades = formData.getAll("especialidades");
    for (const espId of especialidades) {
      await supabaseAdmin
        .from("usuario_especialidad")
        .insert({
          id_usuario_organizacion: usuarioOrg.id_usuario_organizacion, // ✅ NO id_usuario
          id_especialidad: Number(espId),
          precio_particular: Number(formData.get(`precio_${espId}_particular`)),
          precio_obra_social: Number(formData.get(`precio_${espId}_obra_social`)),
        });
    }

    return { success: true, data: usuarioOrg };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

---

## 2. SERVER COMPONENTS

### Ejemplo: Página de Turnos
```typescript
// src/app/(main)/turnos/page.tsx
import { getAuthContext } from "@/lib/utils/auth-context";
import { getBrandingConfig } from "@/lib/services/branding.service";
import { obtenerTurnos } from "@/lib/actions/turno.action";
import { TurnosList } from "@/componentes/turnos/turnos-list";

export default async function TurnosPage() {
  // 1. Obtener contexto (esto valida que hay user y org)
  const { orgId, userId } = await getAuthContext();

  // 2. Obtener branding de la organización
  const brandingResult = await getBrandingConfig(orgId);
  const branding = brandingResult.data;

  // 3. Obtener datos filtrados por org
  const turnosResult = await obtenerTurnos();

  if (!turnosResult.success) {
    return <div>Error: {turnosResult.error}</div>;
  }

  return (
    <div>
      <header>
        <h1>{branding?.nombre || "Sistema"} - Turnos</h1>
      </header>
      <TurnosList turnos={turnosResult.data} />
    </div>
  );
}
```

### Ejemplo: Layout con Branding
```typescript
// src/app/(main)/layout.tsx
import { getAuthContext } from "@/lib/utils/auth-context";
import { getBrandingConfig } from "@/lib/services/branding.service";
import { Header } from "@/componentes/barra/header";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { orgId, userId } = await getAuthContext();
  const brandingResult = await getBrandingConfig(orgId);
  const branding = brandingResult.data;

  return (
    <div>
      <Header 
        organizacionNombre={branding?.nombre || "Sistema"}
        organizacionLogo={branding?.logo || null}
      />
      <main>{children}</main>
      <footer>
        <p>
          {branding?.nombre} | {branding?.telefonoContacto} | {branding?.emailContacto}
        </p>
      </footer>
    </div>
  );
}
```

---

## 3. CLIENT COMPONENTS

### Ejemplo: Formulario de Turno
```typescript
// src/componentes/turnos/turno-form.tsx
"use client";

import { useState } from "react";
import { crearTurno } from "@/lib/actions/turno.action";

export function TurnoForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const datos = {
      id_paciente: Number(formData.get("paciente")),
      id_especialista: formData.get("especialista") as string,
      fecha: formData.get("fecha") as string,
      hora: formData.get("hora") as string,
      // ✅ NO necesitas pasar id_organizacion aquí
      // La action lo inyecta automáticamente desde getAuthContext()
    };

    const result = await crearTurno(datos);

    if (result.success) {
      alert("Turno creado exitosamente");
    } else {
      alert(`Error: ${result.error}`);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="paciente" type="number" required />
      <input name="especialista" type="text" required />
      <input name="fecha" type="date" required />
      <input name="hora" type="time" required />
      <button type="submit" disabled={loading}>
        {loading ? "Creando..." : "Crear Turno"}
      </button>
    </form>
  );
}
```

---

## 4. API ROUTES

### Ejemplo: API de Onboarding
```typescript
// src/app/api/onboarding/crear-organizacion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { organizacion, usuario } = body;

  // 1. Crear organización
  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizacion")
    .insert({
      nombre: organizacion.nombre,
      email_contacto: organizacion.email,
      activo: true,
    })
    .select()
    .single();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  // 2. Crear usuario en Auth
  const { data: authUser, error: authError } = 
    await supabaseAdmin.auth.admin.createUser({
      email: usuario.email,
      password: usuario.password,
      email_confirm: true,
    });

  if (authError) {
    // Rollback: eliminar org
    await supabaseAdmin
      .from("organizacion")
      .delete()
      .eq("id_organizacion", org.id_organizacion);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // 3. Crear en tabla usuario
  await supabaseAdmin.from("usuario").insert({
    id_usuario: authUser.user.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    activo: true,
    contraseña: "**AUTH**",
  });

  // 4. Asignar a organización como administrador
  await supabaseAdmin.from("usuario_organizacion").insert({
    id_usuario: authUser.user.id,
    id_organizacion: org.id_organizacion,
    id_rol: 1, // Administrador
    activo: true,
  });

  return NextResponse.json({
    success: true,
    organizacion: org,
    usuario: authUser.user,
  });
}
```

---

## 5. SERVICIOS

### Ejemplo: Servicio de Notificaciones
```typescript
// src/lib/services/notificacion.service.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/utils/auth-context";

export async function crearNotificacion(datos: any) {
  const supabase = await createClient();

  // ✅ Si no viene orgId, obtenerlo del contexto
  if (!datos.id_organizacion) {
    try {
      const orgId = await getCurrentOrgId();
      datos = { ...datos, id_organizacion: orgId };
    } catch (error) {
      return { success: false, error: "No se pudo determinar la organización" };
    }
  }

  const { data, error } = await supabase
    .from("notificacion")
    .insert(datos)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function enviarNotificacion(turnoId: number) {
  const supabase = await createClient();
  const { getCurrentOrgId } = await import("@/lib/utils/auth-context");
  
  try {
    const orgId = await getCurrentOrgId();

    // Obtener turno con datos del paciente
    const { data: turno } = await supabase
      .from("turno")
      .select("*, paciente(*)")
      .eq("id_turno", turnoId)
      .eq("id_organizacion", orgId) // ✅ Verificar que pertenece a esta org
      .single();

    if (!turno) {
      return { success: false, error: "Turno no encontrado en esta organización" };
    }

    // Obtener branding de la org para personalizar mensaje
    const { getBrandingConfig } = await import("@/lib/services/branding.service");
    const branding = await getBrandingConfig(orgId);
    const nombreOrg = branding.data?.nombre || "nuestra clínica";

    // Crear mensaje personalizado
    const mensaje = `Hola ${turno.paciente.nombre}, te escribimos de ${nombreOrg}. 
    Recordamos tu turno del ${turno.fecha} a las ${turno.hora}.`;

    // Registrar notificación
    await crearNotificacion({
      id_turno: turnoId,
      telefono: turno.paciente.telefono,
      mensaje: mensaje,
      medio: "whatsapp",
      estado: "pendiente",
      fecha_programada: new Date().toISOString(),
      id_organizacion: orgId, // ✅ Incluir orgId
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### Ejemplo: Servicio de Branding
```typescript
// src/lib/services/branding.service.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/utils/auth-context";

export async function getBrandingConfig(orgId?: string) {
  const supabase = await createClient();

  // Si no se pasa orgId, obtenerlo del contexto
  if (!orgId) {
    orgId = await getCurrentOrgId();
  }

  const { data, error } = await supabase
    .from("organizacion")
    .select("nombre, telefono_contacto, email_contacto, cuit_cuil")
    .eq("id_organizacion", orgId)
    .eq("activo", true)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      nombre: data.nombre,
      telefonoContacto: data.telefono_contacto,
      emailContacto: data.email_contacto,
      cuitCuil: data.cuit_cuil,
    },
  };
}

// Uso en mensajes de WhatsApp
export async function formatearMensajeWhatsApp(
  mensaje: string,
  incluirFirma: boolean = true
) {
  if (!incluirFirma) return mensaje;

  const branding = await getBrandingConfig();
  const nombreOrg = branding.data?.nombre || "nuestra clínica";
  const telefono = branding.data?.telefonoContacto;

  return `${mensaje}\n\n---\n${nombreOrg}${telefono ? ` | ${telefono}` : ""}`;
}
```

---

## 🎯 PATRONES COMUNES

### Patrón 1: Validar Organización en Action
```typescript
export async function miAction() {
  try {
    const { orgId, userId } = await getAuthContext();
    // ... resto del código
  } catch (error) {
    return { 
      success: false, 
      error: "No autenticado o sin organización seleccionada" 
    };
  }
}
```

### Patrón 2: Inyectar OrgId en Insert
```typescript
const datosConOrg = {
  ...datos,
  id_organizacion: orgId,
};

await supabase.from("tabla").insert(datosConOrg);
```

### Patrón 3: Filtrar por OrgId en Queries
```typescript
const { data } = await supabase
  .from("tabla")
  .select("*")
  .eq("id_organizacion", orgId); // ✅ Siempre filtrar
```

### Patrón 4: Verificar Pertenencia antes de Actualizar/Eliminar
```typescript
export async function deleteItem(id: number) {
  const { orgId } = await getAuthContext();
  
  const { error } = await supabase
    .from("tabla")
    .delete()
    .eq("id", id)
    .eq("id_organizacion", orgId); // ✅ Evita eliminar de otra org
}
```

---

## 🚨 ERRORES COMUNES A EVITAR

### ❌ ERROR 1: Olvidar filtrar por orgId
```typescript
// ❌ MAL
const { data } = await supabase
  .from("turno")
  .select("*");

// ✅ BIEN
const { orgId } = await getAuthContext();
const { data } = await supabase
  .from("turno")
  .select("*")
  .eq("id_organizacion", orgId);
```

### ❌ ERROR 2: No inyectar orgId en inserts
```typescript
// ❌ MAL
await supabase
  .from("turno")
  .insert({ fecha, hora, paciente_id });

// ✅ BIEN
const { orgId } = await getAuthContext();
await supabase
  .from("turno")
  .insert({ fecha, hora, paciente_id, id_organizacion: orgId });
```

### ❌ ERROR 3: Usar id_usuario en lugar de id_usuario_organizacion
```typescript
// ❌ MAL (modelo viejo)
await supabase
  .from("usuario_especialidad")
  .insert({
    id_usuario: userId, // ❌ Ya no existe esta FK
    id_especialidad: espId,
  });

// ✅ BIEN (modelo nuevo)
await supabase
  .from("usuario_especialidad")
  .insert({
    id_usuario_organizacion: usuarioOrgId, // ✅ Referencia correcta
    id_especialidad: espId,
  });
```

### ❌ ERROR 4: No validar org antes de operaciones sensibles
```typescript
// ❌ MAL
export async function deleteTurno(id: number) {
  await supabase
    .from("turno")
    .delete()
    .eq("id_turno", id); // ❌ Podría eliminar turno de otra org
}

// ✅ BIEN
export async function deleteTurno(id: number) {
  const { orgId } = await getAuthContext();
  await supabase
    .from("turno")
    .delete()
    .eq("id_turno", id)
    .eq("id_organizacion", orgId); // ✅ Solo de esta org
}
```

---

## 📝 TESTING

### Test de Aislamiento de Datos
```typescript
// test/multi-org.test.ts

// 1. Crear 2 organizaciones
const org1 = await crearOrganizacion({ nombre: "Clinica A" });
const org2 = await crearOrganizacion({ nombre: "Clinica B" });

// 2. Crear usuarios en cada org
const user1 = await crearUsuario({ email: "user1@a.com", org: org1.id });
const user2 = await crearUsuario({ email: "user2@b.com", org: org2.id });

// 3. Crear turnos en cada org
await crearTurno({ org: org1.id, fecha: "2024-01-01" });
await crearTurno({ org: org2.id, fecha: "2024-01-02" });

// 4. Verificar aislamiento
const turnosUser1 = await obtenerTurnos({ userId: user1.id });
const turnosUser2 = await obtenerTurnos({ userId: user2.id });

expect(turnosUser1.length).toBe(1);
expect(turnosUser2.length).toBe(1);
expect(turnosUser1[0].id_organizacion).toBe(org1.id);
expect(turnosUser2[0].id_organizacion).toBe(org2.id);
```

---

¡Con estos ejemplos deberías poder implementar correctamente el sistema multi-organización! 🚀
