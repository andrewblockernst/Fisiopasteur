# 🔄 FLUJO DE ONBOARDING - DIAGRAMA VISUAL

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LANDING PAGE                                    │
│                                                                          │
│  [Formulario de Registro]                                               │
│   - Email                                                                │
│   - Contraseña                                                           │
│   - Nombre                                                               │
│   - Apellido                                                             │
│   - Teléfono (opcional)                                                  │
│   - Nombre de Organización                                              │
│   - Plan (basic/premium/enterprise)                                     │
│                                                                          │
│  [Botón: Crear Cuenta] ──────────────────────────────────────────┐     │
└──────────────────────────────────────────────────────────────────│─────┘
                                                                    │
                                                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    POST /api/onboarding/register                         │
│                                                                          │
│  Body: {                                                                 │
│    email, password, nombre, apellido,                                   │
│    nombreOrganizacion, plan, paymentId                                  │
│  }                                                                       │
└──────────────────────────────────────────────────────────────────┬──────┘
                                                                    │
                                                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND PROCESA                                  │
│                                                                          │
│  ╔═══════════════════════════════════════════════════════════════════╗ │
│  ║  PASO 1: Crear Usuario en Supabase Auth                          ║ │
│  ║  ✓ auth.admin.createUser()                                       ║ │
│  ║  ✓ Email confirmado automáticamente                              ║ │
│  ║  ✓ Resultado: user.id = "abc-123-def"                            ║ │
│  ╚═══════════════════════════════════════════════════════════════════╝ │
│                              │                                           │
│                              ▼                                           │
│  ╔═══════════════════════════════════════════════════════════════════╗ │
│  ║  PASO 2: Crear registro en tabla "usuario"                       ║ │
│  ║  INSERT INTO usuario (id_usuario, nombre, apellido, email...)    ║ │
│  ║  ✓ Resultado: Usuario guardado en DB                             ║ │
│  ╚═══════════════════════════════════════════════════════════════════╝ │
│                              │                                           │
│                              ▼                                           │
│  ╔═══════════════════════════════════════════════════════════════════╗ │
│  ║  PASO 3: Crear organización                                      ║ │
│  ║  INSERT INTO organizacion (nombre, activo, plan...)              ║ │
│  ║  ✓ Resultado: id_organizacion = "org-456-xyz"                    ║ │
│  ╚═══════════════════════════════════════════════════════════════════╝ │
│                              │                                           │
│                              ▼                                           │
│  ╔═══════════════════════════════════════════════════════════════════╗ │
│  ║  PASO 4: Crear branding de la organización                       ║ │
│  ║  INSERT INTO branding (id_organizacion, nombre, colores...)      ║ │
│  ║  ✓ Logo, colores, contacto personalizado                         ║ │
│  ╚═══════════════════════════════════════════════════════════════════╝ │
│                              │                                           │
│                              ▼                                           │
│  ╔═══════════════════════════════════════════════════════════════════╗ │
│  ║  PASO 5: Vincular usuario como ADMIN de la organización          ║ │
│  ║  INSERT INTO usuario_organizacion                                ║ │
│  ║    (id_usuario, id_organizacion, id_rol=1, activo=true)          ║ │
│  ║  ✓ Usuario ahora es Admin de su organización                     ║ │
│  ╚═══════════════════════════════════════════════════════════════════╝ │
│                                                                          │
└──────────────────────────────────────────────────────────────────┬──────┘
                                                                    │
                   ┌────────────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  ¿Éxito o Error?     │
        └──────────┬───────────┘
                   │
          ┌────────┴────────┐
          │                 │
    [ÉXITO ✅]        [ERROR ❌]
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Response 201   │  │  Response 500   │
│                 │  │                 │
│  {              │  │  {              │
│   success: true │  │   success: false│
│   data: {       │  │   error: "..."  │
│    usuario: {}  │  │   details: "..." │
│    organizacion │  │  }              │
│    redirectUrl  │  │                 │
│   }             │  │  ┌────────────┐ │
│  }              │  │  │ ROLLBACK:  │ │
│                 │  │  │ Eliminar   │ │
│        │        │  │  │ usuario de │ │
│        │        │  │  │ Auth       │ │
│        │        │  │  └────────────┘ │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  FRONTEND       │  │  FRONTEND       │
│  Redirige a:    │  │  Muestra error  │
│                 │  │  al usuario     │
│  /login?        │  │                 │
│   email=xxx     │  │  "Email ya      │
│   &onboarding   │  │   registrado"   │
│   =true         │  │                 │
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          PÁGINA DE LOGIN                                 │
│                                                                          │
│  Email pre-llenado: xxx@ejemplo.com                                     │
│  Contraseña: [usuario ingresa]                                          │
│                                                                          │
│  [Botón: Iniciar Sesión]                                                │
└──────────────────────────────────────────────────────────────────┬──────┘
                                                                    │
                                                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DASHBOARD / INICIO                              │
│                                                                          │
│  ✅ Usuario autenticado                                                 │
│  ✅ Organización seleccionada automáticamente                           │
│  ✅ Puede empezar a usar el sistema                                     │
│                                                                          │
│  Próximos pasos sugeridos:                                              │
│  1. Agregar especialistas                                               │
│  2. Crear pacientes                                                     │
│  3. Agendar primer turno                                                │
│  4. Personalizar branding (logo, colores)                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Rollback Automático

Si cualquier paso falla después de crear el usuario en Auth, el sistema automáticamente:

```
❌ Error en Paso 2, 3, 4 o 5
    ↓
🔄 ROLLBACK
    ↓
✓ Eliminar usuario de Supabase Auth
✓ No quedan registros huérfanos
✓ Usuario puede volver a intentar con el mismo email
```

---

## 📊 Resultado en Base de Datos

Después de un registro exitoso:

### Tabla: `usuario`
```
id_usuario    | nombre | apellido | email              | telefono
abc-123-def   | Juan   | Pérez    | juan@empresa.com   | +54...
```

### Tabla: `organizacion`
```
id_organizacion | nombre         | activo | plan    | fecha_registro
org-456-xyz     | Clínica XYZ    | true   | basic   | 2025-11-02
```

### Tabla: `branding`
```
id_branding | id_organizacion | nombre         | color_primario
brand-789   | org-456-xyz     | Clínica XYZ    | #3b82f6
```

### Tabla: `usuario_organizacion`
```
id_usuario_organizacion | id_usuario  | id_organizacion | id_rol | activo
uo-321-mno              | abc-123-def | org-456-xyz     | 1      | true
```

**id_rol = 1** significa **Admin** (puede gestionar toda la organización)

---

## 🎯 Estados del Flujo

| Estado | Descripción | Acción del Usuario |
|--------|-------------|-------------------|
| 📝 **Formulario** | Usuario completa datos | Ingresar información |
| ⏳ **Enviando** | POST en progreso | Esperar (loading) |
| ✅ **Éxito** | Registro completado | Auto-redirigir a login |
| ❌ **Error** | Algo falló | Ver mensaje, corregir, reintentar |
| 🔐 **Login** | Usuario inicia sesión | Ingresar contraseña |
| 🏠 **Dashboard** | Usuario en el sistema | ¡Listo para usar! |

---

## 🔒 Seguridad

### Lo que está protegido:
- ✅ Contraseñas hasheadas automáticamente por Supabase Auth
- ✅ SUPABASE_SERVICE_ROLE_KEY nunca expuesta al frontend
- ✅ Validaciones en backend (no confía en frontend)
- ✅ Rollback automático si algo falla
- ✅ Email auto-confirmado (sin spam)

### Lo que puedes agregar:
- [ ] Rate limiting (limitar intentos de registro)
- [ ] Verificación de email por código (opcional)
- [ ] Verificación de pago antes de crear cuenta
- [ ] Captcha para prevenir bots

---

## 💡 Tips de UX

1. **Verificación de email en tiempo real**
   - Usa `/api/onboarding/check-email`
   - Muestra ✅ o ❌ mientras el usuario escribe

2. **Indicador de progreso**
   - Muestra "Creando cuenta..." durante el registro
   - Usa spinner o barra de progreso

3. **Validación antes de enviar**
   - Verifica campos en frontend primero
   - Evita requests innecesarios

4. **Redirección automática**
   - Después de éxito, redirige en 2 segundos
   - Muestra mensaje de éxito primero

5. **Mensajes de error claros**
   - "Este email ya está registrado" (no "Error 409")
   - "La contraseña debe tener al menos 6 caracteres"

---

**Este diagrama muestra TODO el flujo desde que el usuario hace clic en "Crear Cuenta" hasta que puede usar el sistema.**
