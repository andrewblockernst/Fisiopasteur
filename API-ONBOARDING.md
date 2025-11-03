# 📋 API de Onboarding - Documentación

## Endpoints Disponibles

### 1. Registrar Usuario + Organización

**POST** `/api/onboarding/register`

Crea un nuevo usuario, su organización, branding y lo vincula como administrador.

#### Request Body

```json
{
  "email": "admin@empresa.com",
  "password": "contraseña-segura-123",
  "nombre": "Juan",
  "apellido": "Pérez",
  "telefono": "+54 9 11 1234-5678",
  "nombreOrganizacion": "Clínica XYZ",
  "plan": "basic",
  "paymentId": "pay_123456789"
}
```

#### Campos Requeridos
- ✅ `email` (string): Email del usuario
- ✅ `password` (string): Contraseña (mínimo 6 caracteres recomendado)
- ✅ `nombre` (string): Nombre del usuario
- ✅ `apellido` (string): Apellido del usuario
- ✅ `nombreOrganizacion` (string): Nombre de la organización

#### Campos Opcionales
- `telefono` (string): Teléfono de contacto
- `plan` (string): 'basic' | 'premium' | 'enterprise' (default: 'basic')
- `paymentId` (string): ID del pago para referencia

#### Response Exitoso (201)

```json
{
  "success": true,
  "message": "Usuario y organización creados exitosamente",
  "data": {
    "usuario": {
      "id": "uuid-del-usuario",
      "email": "admin@empresa.com",
      "nombre": "Juan",
      "apellido": "Pérez"
    },
    "organizacion": {
      "id": "uuid-de-organizacion",
      "nombre": "Clínica XYZ",
      "plan": "basic"
    },
    "redirectUrl": "/login?email=admin@empresa.com&onboarding=true"
  }
}
```

#### Response Error (400/500)

```json
{
  "success": false,
  "error": "Faltan datos requeridos",
  "details": "Se requiere: email, password, nombre, apellido, nombreOrganizacion"
}
```

---

### 2. Verificar Email Disponible

**GET** `/api/onboarding/check-email?email=test@example.com`

Verifica si un email ya está registrado en el sistema.

#### Query Parameters
- ✅ `email` (string): Email a verificar

#### Response Exitoso (200)

```json
{
  "success": true,
  "exists": false,
  "available": true
}
```

```json
{
  "success": true,
  "exists": true,
  "available": false
}
```

---

## 🔧 Ejemplos de Uso

### Desde JavaScript/TypeScript

```typescript
// Verificar email disponible
async function checkEmail(email: string) {
  const response = await fetch(
    `/api/onboarding/check-email?email=${encodeURIComponent(email)}`
  );
  const data = await response.json();
  
  if (data.success && !data.available) {
    alert('Este email ya está registrado');
    return false;
  }
  return true;
}

// Registrar usuario
async function registerUser(formData) {
  const response = await fetch('/api/onboarding/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: formData.email,
      password: formData.password,
      nombre: formData.nombre,
      apellido: formData.apellido,
      telefono: formData.telefono,
      nombreOrganizacion: formData.organizacion,
      plan: formData.plan || 'basic',
      paymentId: formData.paymentId
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('✅ Registro exitoso:', data);
    // Redirigir al login o dashboard
    window.location.href = data.data.redirectUrl;
  } else {
    console.error('❌ Error:', data.error);
    alert(data.error);
  }
}
```

### Desde React (formulario completo)

```tsx
'use client';

import { useState } from 'react';

export default function OnboardingForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
    nombreOrganizacion: '',
    plan: 'basic'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Verificar email disponible
      const checkResponse = await fetch(
        `/api/onboarding/check-email?email=${encodeURIComponent(formData.email)}`
      );
      const checkData = await checkResponse.json();
      
      if (!checkData.available) {
        setError('Este email ya está registrado');
        setLoading(false);
        return;
      }

      // 2. Registrar usuario
      const response = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Redirigir al dashboard o login
        window.location.href = data.data.redirectUrl;
      } else {
        setError(data.error || 'Error al registrar usuario');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label>Email</label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
      </div>

      <div>
        <label>Contraseña</label>
        <input
          type="password"
          required
          minLength={6}
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
        />
      </div>

      <div>
        <label>Nombre</label>
        <input
          type="text"
          required
          value={formData.nombre}
          onChange={(e) => setFormData({...formData, nombre: e.target.value})}
        />
      </div>

      <div>
        <label>Apellido</label>
        <input
          type="text"
          required
          value={formData.apellido}
          onChange={(e) => setFormData({...formData, apellido: e.target.value})}
        />
      </div>

      <div>
        <label>Teléfono</label>
        <input
          type="tel"
          value={formData.telefono}
          onChange={(e) => setFormData({...formData, telefono: e.target.value})}
        />
      </div>

      <div>
        <label>Nombre de la Organización</label>
        <input
          type="text"
          required
          value={formData.nombreOrganizacion}
          onChange={(e) => setFormData({...formData, nombreOrganizacion: e.target.value})}
        />
      </div>

      <div>
        <label>Plan</label>
        <select
          value={formData.plan}
          onChange={(e) => setFormData({...formData, plan: e.target.value})}
        >
          <option value="basic">Básico</option>
          <option value="premium">Premium</option>
          <option value="enterprise">Empresa</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? 'Registrando...' : 'Crear Cuenta'}
      </button>
    </form>
  );
}
```

---

## 🔄 Flujo Completo

1. **Usuario completa formulario** en landing page
2. **Frontend valida** datos localmente
3. **Verifica email** con `/api/onboarding/check-email`
4. Si disponible, **envía POST** a `/api/onboarding/register`
5. **Backend crea**:
   - Usuario en Supabase Auth ✅
   - Registro en tabla `usuario` ✅
   - Organización nueva ✅
   - Branding de la org ✅
   - Vínculo usuario-organización como Admin ✅
6. **Frontend recibe** respuesta con `redirectUrl`
7. **Usuario es redirigido** a login o directamente al dashboard

---

## 🔐 Variables de Entorno Requeridas

Asegúrate de tener estas variables en tu `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...  # IMPORTANTE: Clave service_role
```

---

## ⚠️ Consideraciones de Seguridad

1. **Rate Limiting**: Considera agregar limitación de tasa para prevenir abuso
2. **Validación de Email**: Se puede agregar verificación por email después del registro
3. **Contraseñas**: Supabase Auth maneja el hash automáticamente
4. **Service Role Key**: NUNCA expongas esta clave en el frontend
5. **CORS**: Los endpoints están protegidos por Next.js (same-origin)

---

## 🧪 Testing

### Con cURL

```bash
# Verificar email
curl "http://localhost:3000/api/onboarding/check-email?email=test@example.com"

# Registrar usuario
curl -X POST http://localhost:3000/api/onboarding/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@miempresa.com",
    "password": "MiPassword123!",
    "nombre": "María",
    "apellido": "González",
    "telefono": "+54 9 11 5555-6666",
    "nombreOrganizacion": "Mi Clínica",
    "plan": "premium"
  }'
```

### Con Postman/Insomnia

Importa estos endpoints:
- **GET** `{{baseUrl}}/api/onboarding/check-email?email=test@example.com`
- **POST** `{{baseUrl}}/api/onboarding/register`

---

## 📝 Logs

El endpoint genera logs detallados en la consola del servidor:

```
📝 Iniciando registro de usuario y organización: admin@empresa.com
🔐 Paso 1: Creando usuario en Auth...
✅ Usuario creado en Auth: abc-123-def
👤 Paso 2: Creando registro en tabla usuario...
✅ Usuario creado en tabla: abc-123-def
🏢 Paso 3: Creando organización...
✅ Organización creada: org-456-xyz
🎨 Paso 4: Creando branding...
✅ Branding creado: brand-789-uvw
🔗 Paso 5: Vinculando usuario con organización...
✅ Usuario vinculado a organización: uo-321-mno
✅ Registro completado exitosamente!
```

---

## 🐛 Troubleshooting

### Error: "Email already exists"
- El email ya está registrado en Supabase Auth
- Usa `/api/onboarding/check-email` antes de registrar

### Error: "SUPABASE_SERVICE_ROLE_KEY not found"
- Falta la variable de entorno
- Agrégala en `.env.local`

### Error: "Error creating user in Auth"
- Verifica que la contraseña cumpla requisitos (mínimo 6 caracteres)
- Verifica que Supabase Auth esté habilitado

### Error: "Error creating organization"
- Verifica que la tabla `organizacion` exista
- Verifica permisos de la service role key

---

## 📞 Soporte

Si tienes problemas:
1. Verifica los logs en la consola del servidor
2. Revisa las tablas en Supabase Dashboard
3. Verifica que todas las tablas tengan las columnas correctas
4. Contacta al equipo de backend

---

**Última actualización**: 2 de Noviembre, 2025
