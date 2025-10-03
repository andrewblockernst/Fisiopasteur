# 🏥 Guía de Implementación - Bot de WhatsApp Fisiopasteur

## ✅ Estado del Proyecto

El bot está **completamente funcional** y listo para usar. Los siguientes componentes están implementados:

### 🤖 Funcionalidades del Bot

1. **Mensajes automáticos de confirmación de turnos**
2. **Recordatorios personalizados** 
3. **Interacciones conversacionales** en español
4. **Gestión de cancelaciones/reprogramaciones**
5. **API REST completa** para integración

### 📡 Endpoints Disponibles

- `POST /api/turno/confirmar` - Confirmación de turno
- `POST /api/turno/recordatorio` - Recordatorio de cita
- `POST /api/mensaje/enviar` - Mensaje genérico  
- `POST /api/blacklist` - Gestión de números bloqueados
- `GET /api/health` - Estado del servicio

## 🚀 Pasos para Puesta en Producción

### 1. Configurar WhatsApp Business

```bash
# El bot está corriendo en puerto 3008
cd /Users/andrew/Documents/code/projects/Fisiopasteur/fisio-bot
npx tsx src/app.ts
```

**IMPORTANTE**: Escanea el código QR que aparece con tu WhatsApp Business para conectar el bot.

### 2. Deploy en Heroku

```bash
# Crear app en Heroku
heroku create fisiopasteur-bot

# Configurar variables de entorno
heroku config:set PORT=443
heroku config:set NODE_ENV=production

# Deploy
git add .
git commit -m "Bot WhatsApp Fisiopasteur ready"
git push heroku main
```

### 3. Configurar Variables de Entorno

Crea tu archivo `.env` basado en `.env.example`:

```bash
PORT=3008
CENTRO_NOMBRE=Fisiopasteur
CENTRO_DIRECCION=Tu dirección
CENTRO_TELEFONO=+54 9 11 XXXX-XXXX
CENTRO_EMAIL=contacto@fisiopasteur.com
```

## 🔗 Integración con Fisiopasteur

### Desde tu Sistema Principal

```javascript
// Cuando se crea un turno
const enviarConfirmacion = async (turnoData) => {
  const response = await fetch('https://fisiopasteur-bot.herokuapp.com/api/turno/confirmar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pacienteNombre: turnoData.paciente.nombre,
      pacienteApellido: turnoData.paciente.apellido, 
      telefono: turnoData.paciente.telefono,
      fecha: "15/10/2025", // DD/MM/YYYY
      hora: "14:30",      // HH:MM
      profesional: "Dr. García",
      especialidad: "Kinesiología",
      turnoId: turnoData.id
    })
  })
}

// Programar recordatorio
const programarRecordatorio = async (turnoData) => {
  // 24 horas antes del turno
  setTimeout(async () => {
    await fetch('https://fisiopasteur-bot.herokuapp.com/api/turno/recordatorio', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turnoData)
    })
  }, tiempoHasta24HAntes)
}
```

## 📱 Ejemplo de Interacción

```
Bot → Paciente: "✅ Confirmación de Turno

👤 Paciente: Juan Pérez  
📅 Fecha: 15/10/2025
🕐 Hora: 14:30
👩‍⚕️ Profesional: Dr. García
🏥 Especialidad: Kinesiología

Responde 'confirmar' para confirmar tu asistencia..."

Paciente → Bot: "confirmar"

Bot → Paciente: "✅ ¡Perfecto! He registrado tu confirmación.
• Llega 10 minutos antes
• Trae ropa cómoda  
• Para cancelar, hazlo con 24hs de anticipación"
```

## 🛠 Comandos de Usuario

Los pacientes pueden escribir:
- `hola` - Saludo inicial
- `confirmar` - Confirmar turno
- `cancelar` - Cancelar turno  
- `info` - Info del centro
- `ayuda` - Lista de comandos
- `contacto` - Contacto directo

## ⚡ Siguiente Paso CRÍTICO

**DEBES hacer esto AHORA para que funcione:**

1. Ejecuta el bot: `npx tsx src/app.ts`
2. **Escanea el código QR** con WhatsApp Business
3. El bot se conectará automáticamente

## 📞 Integración Inmediata

Puedes probar el bot **inmediatamente** con:

```bash
# Probar confirmación de turno
curl -X POST http://localhost:3008/api/turno/confirmar \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteNombre": "Juan",
    "pacienteApellido": "Pérez", 
    "telefono": "1123456789",
    "fecha": "15/10/2025",
    "hora": "14:30",
    "profesional": "Dr. García",
    "especialidad": "Kinesiología",
    "turnoId": "TEST-001"
  }'
```

## 🎯 Resultado Esperado

Una vez escaneado el QR, el bot:
✅ Enviará mensajes de WhatsApp automáticamente  
✅ Responderá a interacciones de pacientes
✅ Estará listo para integrar con Fisiopasteur
✅ Funcionará 24/7 sin intervención

## ⚠️ IMPORTANTE

- **Mantén el proceso ejecutándose** para que funcione
- **El QR se actualiza cada minuto** si no lo escaneas  
- **Usa WhatsApp Business** para mejores funciones
- **En Heroku** la conexión se mantiene automáticamente

¡Tu bot está **100% funcional** y listo para usar! 🚀