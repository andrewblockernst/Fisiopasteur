# Confirmación de Sesión Restaurada

## ¿Cómo saber si la sesión anterior persiste después de reiniciar?

### 🔍 Indicadores de Sesión Restaurada

#### 1. **En la Consola/Logs de Heroku:**
Verás estos mensajes en orden:
```
🔄 Intentando restaurar sesión de WhatsApp...
✅ Sesión restaurada desde variables de entorno
📦 Restaurando sesión desde config vars...
✅ Sesión restaurada exitosamente
🔄 Creando provider de WhatsApp...
✅ WhatsApp conectado exitosamente!
📤 Enviando mensaje de confirmación de sesión restaurada...
✅ Mensaje de confirmación enviado exitosamente
```

#### 2. **En WhatsApp (NUEVO):**
Recibirás un mensaje automático en el número configurado en `PHONE_NUMBER` (.env):
```
✅ Bot Fisiopasteur Reiniciado

🔐 Sesión restaurada exitosamente
🤖 El bot está operativo y listo para responder
⏰ [Fecha y hora actual]
```

#### 3. **Sin Escanear QR:**
- Si NO te pide escanear el código QR al reiniciar → Sesión restaurada ✅
- Si te pide escanear QR → Nueva sesión (archivos perdidos o sesión inválida) ❌

### 📋 Verificación Paso a Paso

1. **Reinicia el bot** (en Heroku o localmente)
2. **Revisa los logs** de Heroku:
   ```bash
   heroku logs --tail -a fisiopasteur-whatsapp-bot
   ```
3. **Espera 3-5 segundos** después de ver "WhatsApp conectado exitosamente!"
4. **Revisa tu WhatsApp** - Deberías recibir el mensaje de confirmación

### 🔧 Configuración del Número de Notificación

El mensaje de confirmación se envía al número configurado en el archivo `.env`:

```env
PHONE_NUMBER=5493434687043
```

Para cambiar el número que recibe las notificaciones:
1. Edita `PHONE_NUMBER` en `.env` (local) o en Heroku config vars
2. Usa el formato: código de país + número (sin +, sin espacios)
   - Ejemplo Argentina: `5491133258420`

### ⚠️ Troubleshooting

**No recibo el mensaje de confirmación:**
- Verifica que `PHONE_NUMBER` esté correctamente configurado
- Revisa los logs para ver si hay errores al enviar el mensaje
- Asegúrate que el número tenga WhatsApp activo
- El mensaje se envía 3 segundos después de conectar (espera un poco)

**El bot pide QR cada vez que reinicia:**
- La sesión NO se está guardando/restaurando correctamente
- Verifica que `HEROKU_API_KEY` esté configurada
- Revisa que la sesión se guarde: busca "Sesión guardada exitosamente" en logs
- Verifica que exista la variable `WHATSAPP_SESSION` en Heroku config vars:
  ```bash
  heroku config:get WHATSAPP_SESSION -a fisiopasteur-whatsapp-bot
  ```

**El bot dice "Sesión restaurada" pero pide QR:**
- La sesión guardada puede estar corrupta o expirada
- Escanea el QR nuevamente
- Espera 10 segundos después de escanear
- Verifica en logs que aparezca "Sesión guardada exitosamente"
- Reinicia el bot y verifica si ahora restaura correctamente

### 📊 Estados de Sesión

| Estado | Logs | QR | WhatsApp | Acción |
|--------|------|----|-----------| -------|
| ✅ Sesión OK | "Sesión restaurada..." | No solicita | Recibe mensaje | Todo funcionando |
| 🔄 Primera vez | "No hay sesión guardada" | Solicita QR | No hay mensaje | Escanear QR |
| ❌ Sesión inválida | "Error restaurando sesión" | Solicita QR | No hay mensaje | Escanear QR nuevamente |
| ⚠️ Sesión corrupta | "Sesión restaurada..." | Solicita QR | No hay mensaje | Limpiar y re-escanear |

### 🔐 Persistencia de Sesión

La sesión se guarda en:
1. **Heroku Config Vars:** Variable `WHATSAPP_SESSION` (codificada en base64)
2. **Archivos locales:** `bot_sessions/creds.json` (temporal, se elimina en reinicios de Heroku)

Para garantizar la persistencia:
- ✅ La sesión se guarda automáticamente 5 segundos después de conectar
- ✅ Se restaura automáticamente al iniciar el bot
- ✅ Se limpia automáticamente si la sesión es inválida (error 401)

### 🚀 Comandos Útiles

**Ver logs en tiempo real:**
```bash
heroku logs --tail -a fisiopasteur-whatsapp-bot
```

**Ver variable de sesión (primeros caracteres):**
```bash
heroku config:get WHATSAPP_SESSION -a fisiopasteur-whatsapp-bot | head -c 100
```

**Forzar limpieza de sesión (si hay problemas):**
```bash
heroku config:unset WHATSAPP_SESSION -a fisiopasteur-whatsapp-bot
heroku restart -a fisiopasteur-whatsapp-bot
```

---

## 📝 Notas Importantes

- El mensaje de confirmación solo se envía cuando la sesión se **restaura** (no en primera conexión)
- El mensaje se envía después de 3 segundos para asegurar que la conexión esté estable
- Si no recibes el mensaje pero los logs dicen "Sesión restaurada", el bot igual funciona correctamente
- El mensaje es solo una confirmación visual para el administrador
