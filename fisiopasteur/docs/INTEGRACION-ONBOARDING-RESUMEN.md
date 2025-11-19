# 🚀 RESUMEN PARA INTEGRACIÓN DE ONBOARDING

## 📋 ¿Qué se creó?

### 1. API Endpoints (Backend)

✅ **POST** `/api/onboarding/register`
- Crea usuario + organización + branding + vínculo admin
- Todo en una sola llamada
- Con rollback automático si algo falla

✅ **GET** `/api/onboarding/check-email?email=xxx`
- Verifica si un email ya está registrado
- Útil para validación en tiempo real

### 2. Componente React de Ejemplo

✅ Formulario completo con:
- Validación en tiempo real
- Verificación de email disponible
- Loading states
- Manejo de errores
- Redirección automática

### 3. Documentación Completa

✅ **API-ONBOARDING.md** con:
- Ejemplos de request/response
- Testing con cURL y Postman
- Troubleshooting
- Consideraciones de seguridad

---

## 🎯 Lo que tu compañero necesita hacer

### Opción A: Usar el componente completo

Si usa React/Next.js, puede usar directamente:
```tsx
import OnboardingFormExample from '@/componentes/onboarding/OnboardingFormExample';

export default function LandingPage() {
  return (
    <div>
      <OnboardingFormExample />
    </div>
  );
}
```

### Opción B: Integrar con su formulario existente

Si ya tiene un formulario, solo necesita hacer el POST:

```javascript
// Cuando el usuario completa el formulario y hace submit
const response = await fetch('/api/onboarding/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // Datos del usuario
    email: 'admin@empresa.com',
    password: 'contraseña-segura',
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '+54 9 11 1234-5678', // Opcional
    
    // Datos de la organización
    nombreOrganizacion: 'Clínica XYZ',
    
    // Datos de pago (opcional)
    plan: 'basic', // o 'premium', 'enterprise'
    paymentId: 'pay_123456' // ID del pago de Stripe/MercadoPago
  })
});

const data = await response.json();

if (data.success) {
  // ✅ Registro exitoso
  console.log('Usuario creado:', data.data.usuario);
  console.log('Organización creada:', data.data.organizacion);
  
  // Redirigir al login o dashboard
  window.location.href = data.data.redirectUrl;
} else {
  // ❌ Error
  console.error('Error:', data.error);
  alert(data.error);
}
```

---

## 📦 Campos del Formulario

### Requeridos ✅
- **email**: Email del usuario
- **password**: Contraseña (mínimo 6 caracteres)
- **nombre**: Nombre del usuario
- **apellido**: Apellido del usuario
- **nombreOrganizacion**: Nombre de la clínica/organización

### Opcionales
- **telefono**: Teléfono de contacto
- **plan**: 'basic' | 'premium' | 'enterprise' (default: 'basic')
- **paymentId**: ID de referencia del pago

---

## 🔄 Flujo Completo

```
[Landing Page]
      ↓
Usuario completa formulario
      ↓
Frontend envía POST a /api/onboarding/register
      ↓
Backend crea:
  1. Usuario en Supabase Auth ✅
  2. Registro en tabla usuario ✅
  3. Organización ✅
  4. Branding ✅
  5. Vínculo usuario-organización (como Admin) ✅
      ↓
Backend retorna success + redirectUrl
      ↓
Frontend redirige a: /login?email=xxx&onboarding=true
      ↓
Usuario inicia sesión y accede al dashboard
```

---

## ⚙️ Configuración Necesaria

### Variables de Entorno

Tu compañero NO necesita agregar nada nuevo. Estas ya existen en el proyecto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...  # Ya existe
```

---

## 🧪 Testing Rápido

### 1. Desde terminal (cURL)

```bash
curl -X POST http://localhost:3000/api/onboarding/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "password123",
    "nombre": "Test",
    "apellido": "Usuario",
    "nombreOrganizacion": "Clínica Test"
  }'
```

### 2. Desde Postman/Insomnia

- URL: `http://localhost:3000/api/onboarding/register`
- Method: POST
- Body (JSON):
```json
{
  "email": "test@ejemplo.com",
  "password": "password123",
  "nombre": "Test",
  "apellido": "Usuario",
  "nombreOrganizacion": "Clínica Test"
}
```

---

## 📝 Ejemplo Completo en JavaScript Puro

```html
<!DOCTYPE html>
<html>
<head>
  <title>Registro</title>
</head>
<body>
  <form id="registroForm">
    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Contraseña" required>
    <input type="text" id="nombre" placeholder="Nombre" required>
    <input type="text" id="apellido" placeholder="Apellido" required>
    <input type="text" id="organizacion" placeholder="Nombre Organización" required>
    <button type="submit">Crear Cuenta</button>
  </form>

  <script>
    document.getElementById('registroForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        nombreOrganizacion: document.getElementById('organizacion').value,
        plan: 'basic'
      };

      try {
        const response = await fetch('/api/onboarding/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          alert('¡Cuenta creada exitosamente!');
          window.location.href = data.data.redirectUrl;
        } else {
          alert('Error: ' + data.error);
        }
      } catch (error) {
        alert('Error de conexión');
        console.error(error);
      }
    });
  </script>
</body>
</html>
```

---

## 🎨 Validaciones Sugeridas (Frontend)

```javascript
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function validateForm(formData) {
  if (!validateEmail(formData.email)) {
    return 'Email inválido';
  }
  
  if (!validatePassword(formData.password)) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  
  if (!formData.nombre.trim() || !formData.apellido.trim()) {
    return 'Nombre y apellido son requeridos';
  }
  
  if (!formData.nombreOrganizacion.trim()) {
    return 'El nombre de la organización es requerido';
  }
  
  return null; // Todo OK
}
```

---

## 🚨 Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Email already exists" | Email ya registrado | Usar otro email |
| "Faltan datos requeridos" | Falta algún campo | Verificar que se envíen todos los campos |
| "Error creating user in Auth" | Contraseña débil | Mínimo 6 caracteres |
| "SUPABASE_SERVICE_ROLE_KEY not found" | Variable de entorno falta | Agregar en .env.local |

### Respuesta de Error

```json
{
  "success": false,
  "error": "Descripción del error",
  "details": "Detalles técnicos"
}
```

---

## 📞 Contacto y Soporte

Si tu compañero tiene dudas:

1. **Documentación completa**: Ver `API-ONBOARDING.md`
2. **Componente de ejemplo**: Ver `src/componentes/onboarding/OnboardingFormExample.tsx`
3. **Testing**: Probar endpoints con Postman/cURL
4. **Logs**: Verificar logs en la consola del servidor

---

## ✅ Checklist de Integración

- [ ] Leer `API-ONBOARDING.md`
- [ ] Probar endpoint con Postman o cURL
- [ ] Verificar que el registro funciona
- [ ] Integrar con su formulario existente
- [ ] Agregar validaciones en frontend
- [ ] Probar flujo completo: registro → login → dashboard
- [ ] Manejar errores apropiadamente
- [ ] (Opcional) Agregar verificación de email en tiempo real

---

**Fecha**: 2 de Noviembre, 2025  
**Archivos creados**:
- `/fisiopasteur/src/app/api/onboarding/register/route.ts`
- `/fisiopasteur/src/app/api/onboarding/check-email/route.ts`
- `/fisiopasteur/src/componentes/onboarding/OnboardingFormExample.tsx`
- `/API-ONBOARDING.md`
- `/scripts/vincular-usuario-fisiopasteur.ts` (para vincular usuarios existentes)
