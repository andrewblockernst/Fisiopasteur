# Configuración de WaSenderAPI para Fisiopasteur Bot

## ✅ Migración Completada

El bot ha sido migrado exitosamente de **BuilderBot/Baileys** a **WaSenderAPI**.

## 🔧 Configuración Actual

### Variables de Entorno (`.env`)
```bash
WASENDER_API_KEY=c349d17558edc24326607d6879a0e17f2c5fcce47c39651f4ae410af03cdb81c
WASENDER_API_URL=https://wasenderapi.com/api
WASENDER_SESSION_ID=default
```

## 📋 Pasos Siguientes

### 1. Configurar tu Sesión de WhatsApp en WaSenderAPI

1. **Entrá a tu dashboard de WaSenderAPI**: https://wasenderapi.com/dashboard
2. **Creá una nueva sesión** o usá una existente
3. **Escaneá el código QR** con tu WhatsApp Business
4. **Copiá el Session ID** de tu dashboard

### 2. Actualizar el Session ID

Editá el archivo `.env` y actualizá el `WASENDER_SESSION_ID` con el ID real de tu sesión:

```bash
WASENDER_SESSION_ID=tu-session-id-real
```

### 3. Verificar el Estado de la Sesión

```bash
curl http://localhost:3008/api/status
```

Si la sesión está vinculada correctamente, verás:
```json
{
  "authenticated": true,
  "sessionData": {...},
  "uptime": 123,
  "timestamp": "2025-10-31T00:00:00.000Z",
  "service": "Fisiopasteur WhatsApp Bot (WaSenderAPI)"
}
```

### 4. Probar Envío de Mensaje

```bash
curl -X POST http://localhost:3008/api/mensaje/enviar \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "5493434687043",
    "mensaje": "Hola! Este es un mensaje de prueba desde WaSenderAPI"
  }'
```

## 🚀 Comandos Disponibles

```bash
# Iniciar bot con WaSenderAPI (nuevo)
npm start

# Iniciar bot con Baileys (antiguo - si es necesario)
npm run start:baileys

# Modo desarrollo
npm run dev
```

## 📱 Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/turno/confirmar` | Enviar confirmación de turno |
| POST | `/api/turno/recordatorio` | Enviar recordatorio |
| POST | `/api/mensaje/enviar` | Enviar mensaje genérico |
| POST | `/api/recordatorios/procesar` | Procesar recordatorios manualmente |
| GET | `/api/health` | Health check básico |
| GET | `/api/status` | Estado de autenticación WhatsApp |
| GET | `/api/qr` | Obtener código QR (si es necesario) |

## 🎯 Ventajas de WaSenderAPI

- ✅ **Sin bloqueos**: No usa la librería Baileys bloqueada por WhatsApp
- ✅ **Estable**: API oficial de WhatsApp Business
- ✅ **Mensajes ilimitados**: Sin costo por mensaje, solo la suscripción
- ✅ **Soporte en español**: Equipo de soporte disponible
- ✅ **Múltiples sesiones**: Podés manejar varios números de WhatsApp

## 💰 Pricing

- **Basic**: $6/mes - 1 número de WhatsApp
- **Pro**: $15/mes - 3 números de WhatsApp
- **Plus**: $30/mes - 6 números de WhatsApp
- **Enterprise**: $45/mes - 10 números de WhatsApp

Incluye mensajes ilimitados, sin costo adicional por mensaje.

## 🔄 Deploy en Heroku

1. Actualizá las variables de entorno en Heroku:
```bash
heroku config:set WASENDER_API_KEY=c349d17558edc24326607d6879a0e17f2c5fcce47c39651f4ae410af03cdb81c
heroku config:set WASENDER_API_URL=https://wasenderapi.com/api
heroku config:set WASENDER_SESSION_ID=tu-session-id-real
```

2. Hacé push del código:
```bash
git add .
git commit -m "Migración a WaSenderAPI"
git push heroku main
```

3. Verificá los logs:
```bash
heroku logs --tail
```

## ❓ Troubleshooting

### El mensaje no se envía
- Verificá que el Session ID sea correcto
- Verificá que tu WhatsApp esté vinculado en el dashboard de WaSenderAPI
- Revisá los logs: `heroku logs --tail` o en local

### Error de autenticación
- Verificá que tu API Key sea correcta
- Verificá que tu suscripción esté activa en WaSenderAPI
- Entrá al dashboard y re-vinculá tu WhatsApp si es necesario

### Mensajes de prueba
Podés enviar mensajes de prueba directamente desde el dashboard de WaSenderAPI para verificar que todo funcione.

## 📚 Documentación de WaSenderAPI

- Dashboard: https://wasenderapi.com/dashboard
- Documentación API: https://wasenderapi.com/api-docs
- Centro de Ayuda: https://wasenderapi.com/help
- Soporte: contact@wasenderapi.com

## ✨ ¡Listo!

Tu bot ahora usa WaSenderAPI y debería funcionar sin problemas de bloqueo. Solo necesitás vincular tu WhatsApp en el dashboard y actualizar el Session ID.

¡Cualquier problema, revisá los logs o contactá al soporte de WaSenderAPI!
