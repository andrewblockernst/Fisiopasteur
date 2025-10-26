# 🏥 Bot de WhatsApp para Fisiopasteur

Bot de WhatsApp integrado con el sistema de gestión de turnos de kinesiología de Fisiopasteur, desarrollado con BuilderBot.

## 🚀 Funcionalidades

- **Confirmación automática de turnos**: Envía confirmación cuando se crea un turno
- **Recordatorios personalizados**: Notificaciones antes de la cita (24h y 2h antes)
- **Gestión de turnos**: Permite al paciente confirmar, cancelar o reprogramar
- **Información del centro**: Dirección, horarios, contacto
- **Interacciones naturales**: Respuestas en español argentino
- **API REST completa**: Endpoints para integración con el sistema principal
- **Persistencia de sesión**: La sesión de WhatsApp se mantiene entre reinicios
- **Notificación de reinicio**: Envía mensaje de confirmación cuando se restaura la sesión

## 🔐 Persistencia de Sesión

El bot mantiene la sesión de WhatsApp activa incluso después de reinicios:

- ✅ **Sin QR en reinicios**: No necesitas escanear el código QR cada vez
- ✅ **Restauración automática**: La sesión se restaura al iniciar el bot
- ✅ **Notificación de reinicio**: Recibes un mensaje cuando el bot se reinicia exitosamente
- ✅ **Guardado automático**: La sesión se guarda en Heroku config vars

### Verificar Sesión Restaurada

Después de reiniciar el bot, recibirás este mensaje en WhatsApp:

```
✅ Bot Fisiopasteur Reiniciado

🔐 Sesión restaurada exitosamente
🤖 El bot está operativo y listo para responder
⏰ [Fecha y hora]
```

📖 **Documentación detallada**: Ver [SESSION-CONFIRMATION.md](./docs/SESSION-CONFIRMATION.md)

## 🛠 Instalación y Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tu configuración
```

### 3. Desarrollo
```bash
npm run dev
```

### 4. Producción
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Confirmación de Turno
```http
POST /api/turno/confirmar
Content-Type: application/json

{
  "pacienteNombre": "Juan",
  "pacienteApellido": "Pérez",
  "telefono": "1123456789",
  "fecha": "15/10/2025",
  "hora": "14:30",
  "profesional": "Dr. García",
  "especialidad": "Kinesiología",
  "turnoId": "T-12345",
  "centroMedico": "Fisiopasteur Centro"
}
```

### Recordatorio de Turno
```http
POST /api/turno/recordatorio
Content-Type: application/json

{
  "pacienteNombre": "Juan",
  "pacienteApellido": "Pérez",
  "telefono": "1123456789",
  "fecha": "15/10/2025",
  "hora": "14:30",
  "profesional": "Dr. García",
  "especialidad": "Kinesiología", 
  "turnoId": "T-12345"
}
```

### Mensaje Genérico
```http
POST /api/mensaje/enviar
Content-Type: application/json

{
  "telefono": "1123456789",
  "mensaje": "Mensaje personalizado",
  "media": "https://example.com/imagen.jpg"
}
```

### Health Check
```http
GET /api/health
```

## 🤖 Comandos del Bot

Los pacientes pueden interactuar escribiendo:

- **`hola`** - Mensaje de bienvenida
- **`confirmar`** - Confirmar asistencia al turno
- **`cancelar`** - Cancelar o reprogramar turno
- **`info`** - Información del centro médico
- **`ayuda`** - Lista de comandos disponibles
- **`contacto`** - Información de contacto directo

## 🔗 Integración con Fisiopasteur

### Flujo de Confirmación
```
Fisiopasteur Sistema → POST /api/turno/confirmar → Bot → WhatsApp → Paciente
```

### Flujo de Recordatorio
```
Cron Job/Scheduler → POST /api/turno/recordatorio → Bot → WhatsApp → Paciente
```

## 🚀 Deploy en Heroku

### 1. Crear aplicación
```bash
heroku create fisiopasteur-bot
```

### 2. Configurar variables de entorno
```bash
heroku config:set PORT=443
heroku config:set CENTRO_NOMBRE="Fisiopasteur"
```

### 3. Deploy
```bash
git push heroku main
```