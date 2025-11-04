# 🧪 Guía de Prueba Completa - Sistema Integrado

## ✅ Estado Actual

### Bot WaSenderAPI
- ✅ Corriendo en `http://localhost:3008`
- ✅ Endpoints configurados
- ✅ Sistema de recordatorios activo

### Sistema Fisiopasteur
- ✅ Configurado para usar `http://localhost:3008`
- ⚠️  **IMPORTANTE**: Necesitás tener tu WhatsApp vinculado en WaSenderAPI

---

## 🔧 Pre-requisitos

### 1. Vincular WhatsApp en WaSenderAPI

**ANTES DE PROBAR**, necesitás:

1. Ir a: https://wasenderapi.com/dashboard
2. Login con tu cuenta
3. Crear una nueva sesión (o usar una existente)
4. **Escanear el QR** con tu WhatsApp Business
5. Copiar el **Session ID** que aparece

### 2. Actualizar el Session ID

Editá `/fisio-bot/.env`:

```bash
WASENDER_SESSION_ID=tu-session-id-real-aqui
```

### 3. Reiniciar el bot

```bash
# Detener el bot actual (Ctrl+C)
# Luego iniciar de nuevo:
cd /Users/andrew/Documents/code/projects/Fisiopasteur/fisio-bot
npm start
```

---

## 🧪 Pruebas del Sistema

### Prueba 1: Health Check del Bot

```bash
curl http://localhost:3008/api/health
```

**Esperado:**
```json
{
  "status": "ok",
  "uptime": 123,
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

### Prueba 2: Estado de WhatsApp

```bash
curl http://localhost:3008/api/status
```

**Esperado (si está vinculado):**
```json
{
  "authenticated": true,
  "sessionData": {...},
  "uptime": 123,
  "timestamp": "2025-10-31T00:00:00.000Z",
  "service": "Fisiopasteur WhatsApp Bot (WaSenderAPI)"
}
```

### Prueba 3: Enviar Mensaje de Prueba

```bash
curl -X POST http://localhost:3008/api/mensaje/enviar \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "5493434687043",
    "mensaje": "✅ Prueba: Sistema funcionando correctamente!"
  }'
```

**Esperado:**
```json
{
  "status": "success",
  "message": "Mensaje enviado correctamente"
}
```

**🔔 Deberías recibir el mensaje en tu WhatsApp**

---

## 🏥 Prueba Completa: Crear Turno y Recibir Confirmación

### Paso 1: Iniciar el Sistema Fisiopasteur

En otra terminal:

```bash
cd /Users/andrew/Documents/code/projects/Fisiopasteur/fisiopasteur
npm run dev
```

### Paso 2: Crear un Turno de Prueba

1. Abrí el navegador en: http://localhost:3000
2. Ingresá al sistema
3. Andá a **Turnos** → **Nuevo Turno**
4. Creá un turno con:
   - **Paciente**: Con número de WhatsApp válido (ej: 5493434687043)
   - **Especialista**: Cualquiera
   - **Fecha y Hora**: Hoy o mañana
   - **Especialidad**: Cualquiera

### Paso 3: Verificar Logs

**En la terminal del bot** deberías ver:

```
📤 Enviando confirmación a 5493434687043
📱 Número formateado: 5493434687043 -> 5493434687043
✅ Mensaje enviado exitosamente
```

**En tu WhatsApp** deberías recibir:

```
✅ *Confirmación de Turno*

Paciente: [Nombre] [Apellido]
Fecha: [DD/MM/YYYY]
Hora: [HH:MM]
Profesional: [Nombre Especialista]
Especialidad: [Especialidad]

✔️ *Recomendaciones para tu turno:*
• Llegá 10 minutos antes
• Traé ropa cómoda

📍 Pasteur 206, Libertador San Martín
Ante cualquier consulta, comuniquese directamente con su especialista.

💪 ¡Te esperamos!
```

---

## 🔍 Troubleshooting

### ❌ Error: "authenticated": false

**Problema:** WhatsApp no está vinculado.

**Solución:**
1. Ir a https://wasenderapi.com/dashboard
2. Escanear QR nuevamente
3. Actualizar `WASENDER_SESSION_ID` en `.env`
4. Reiniciar el bot

### ❌ Error: "Failed to connect to localhost port 3008"

**Problema:** El bot no está corriendo.

**Solución:**
```bash
cd /Users/andrew/Documents/code/projects/Fisiopasteur/fisio-bot
npm start
```

### ❌ No llega el mensaje al WhatsApp

**Posibles causas:**

1. **Session ID incorrecto**
   - Verificá que el Session ID en `.env` sea el correcto
   - Revisá el dashboard de WaSenderAPI

2. **Número de teléfono incorrecto**
   - Verificá que el número tenga código de país (+54 para Argentina)
   - Formato: 5493434687043 (sin + ni espacios)

3. **Problema con WaSenderAPI**
   - Revisá los logs del bot en la terminal
   - Verificá tu suscripción en WaSenderAPI
   - Contactá soporte: contact@wasenderapi.com

### ❌ Error: "INVALID_DATA" en los logs

**Problema:** Faltan datos del paciente o turno.

**Solución:**
- Verificá que el paciente tenga número de teléfono
- Verificá que todos los campos del turno estén completos

---

## 📊 Verificar Recordatorios Automáticos

Los recordatorios se procesan cada 2 minutos automáticamente.

**Para verificar:**

1. Creá un turno para **mañana** a cualquier hora
2. Esperá 2-5 minutos
3. Deberías ver en los logs del bot:

```
🔄 [2025-10-31T00:00:00.000Z] Llamando al endpoint de recordatorios...
✅ Recordatorios procesados vía API en 1234ms: {"success":true,"procesadas":1,"enviadas":1,"fallidas":0}
```

4. El paciente debería recibir un recordatorio en WhatsApp

---

## 🚀 Deploy en Producción (Heroku)

Una vez que todo funcione localmente:

### 1. Configurar Variables en Heroku

```bash
heroku config:set WASENDER_API_KEY=c349d17558edc24326607d6879a0e17f2c5fcce47c39651f4ae410af03cdb81c
heroku config:set WASENDER_API_URL=https://wasenderapi.com/api
heroku config:set WASENDER_SESSION_ID=tu-session-id-real
```

### 2. Deploy del Bot

```bash
cd /Users/andrew/Documents/code/projects/Fisiopasteur/fisio-bot
git add .
git commit -m "Integración WaSenderAPI completa"
git push heroku main
```

### 3. Actualizar URL en Fisiopasteur

En `/fisiopasteur/.env.local`:

```bash
WHATSAPP_BOT_URL="https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com"
```

### 4. Deploy de Fisiopasteur en Vercel

```bash
cd /Users/andrew/Documents/code/projects/Fisiopasteur/fisiopasteur
vercel --prod
```

---

## ✅ Checklist Final

Antes de considerar todo listo:

- [ ] Bot corriendo en `localhost:3008`
- [ ] WhatsApp vinculado en WaSenderAPI dashboard
- [ ] Session ID actualizado en `.env`
- [ ] Prueba de mensaje enviada exitosamente
- [ ] Turno creado y confirmación recibida
- [ ] Recordatorios funcionando
- [ ] Deploy en Heroku exitoso
- [ ] URL actualizada en Fisiopasteur
- [ ] Prueba en producción realizada

---

## 📞 Próximo Paso

**AHORA MISMO:**

1. **Abrí** https://wasenderapi.com/dashboard
2. **Vinculá** tu WhatsApp escaneando el QR
3. **Copiá** el Session ID
4. **Actualizá** `/fisio-bot/.env` con el Session ID
5. **Reiniciá** el bot: `npm start`
6. **Probá** enviar un mensaje con el curl de arriba

**Si todo funciona:**
- Creá un turno en el sistema
- Verificá que llegue la confirmación
- **LISTO PARA PRODUCCIÓN** 🎉

¿Todo claro? ¡Empezá por vincular tu WhatsApp! 🚀
