# 🔐 Configuración de Persistencia de Sesión

## 📝 Descripción

Este sistema permite que el bot de WhatsApp **mantenga la sesión activa** incluso después de reinicios del dyno de Heroku (dyno cycling cada ~24h, deploys, etc.).

**Antes:** Cada vez que el dyno se reiniciaba, había que escanear el código QR nuevamente.  
**Ahora:** La sesión se guarda automáticamente y se restaura al reiniciar. **No más escaneos de QR**.

---

## 🚀 Pasos de Configuración

### 1. Obtener tu API Key de Heroku

```bash
heroku auth:token
```

Copia el token que aparece (ejemplo: `abc123-def456-ghi789`)

### 2. Configurar variables de entorno en Heroku

```bash
# Configura tu API key
heroku config:set HEROKU_API_KEY=TU_TOKEN_AQUI -a fisiopasteur-whatsapp-bot

# Configura el nombre de la app
heroku config:set HEROKU_APP_NAME=fisiopasteur-whatsapp-bot -a fisiopasteur-whatsapp-bot
```

### 3. Hacer commit y deploy

```bash
cd /Users/andrew/Documents/code/projects/Fisiopasteur/fisio-bot

git add .
git commit -m "feat: implementar persistencia de sesión con variables de entorno"
git push heroku main
```

### 4. Primera vez: Escanear el QR

Después del deploy:

1. **Abre la app en el navegador:**
   ```bash
   heroku open -a fisiopasteur-whatsapp-bot
   ```

2. **Ver los logs en tiempo real:**
   ```bash
   heroku logs --tail -a fisiopasteur-whatsapp-bot
   ```

3. **Busca el código QR en los logs** (aparecerá como texto ASCII)

4. **Escanea el QR** con tu celular:
   - Abre WhatsApp
   - Ve a Ajustes → Dispositivos vinculados
   - Toca "Vincular un dispositivo"
   - Escanea el código QR de los logs

5. **Espera 5 segundos** - La sesión se guardará automáticamente

6. **Verifica que se guardó:**
   ```bash
   heroku config:get WHATSAPP_SESSION -a fisiopasteur-whatsapp-bot
   ```
   
   Deberías ver un string largo en base64. ✅

---

## ✅ Funcionamiento Automático

### Al Iniciar el Bot:
1. 🔍 Busca si hay una sesión guardada en `WHATSAPP_SESSION`
2. 📦 Si existe, la restaura automáticamente
3. 🌐 Se conecta a WhatsApp **sin necesidad de QR**
4. ✅ El bot está listo

### Al Conectarse:
1. ✅ El bot se conecta exitosamente
2. ⏳ Espera 5 segundos
3. 💾 Guarda la sesión automáticamente en Heroku
4. 🔄 La próxima vez que reinicie, usará esta sesión

### Si la Sesión Expira:
1. ❌ WhatsApp rechaza la sesión (código 401)
2. 🗑️ El sistema limpia la sesión guardada
3. 📱 Genera un nuevo código QR
4. 🔄 Escaneás el QR y vuelve al paso inicial

---

## 🛠️ Comandos Útiles

### Ver estado de la sesión
```bash
curl https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/session-status
```

Respuesta:
```json
{
  "hasLocalSession": true,
  "hasEnvSession": true,
  "timestamp": "2025-10-13T..."
}
```

### Guardar sesión manualmente
```bash
curl -X POST https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/save-session
```

### Limpiar sesión (forzar nuevo QR)
```bash
curl -X POST https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/clear-session
```

### Ver logs en tiempo real
```bash
heroku logs --tail -a fisiopasteur-whatsapp-bot
```

### Reiniciar el bot manualmente
```bash
heroku restart -a fisiopasteur-whatsapp-bot
```

Después del restart, el bot debería:
- ✅ Restaurar la sesión automáticamente
- ✅ Conectarse sin necesidad de QR
- ✅ Estar listo en ~10 segundos

---

## 🔍 Verificación

### Prueba de Persistencia:

1. **Escanea el QR una vez** (primera vez o después de `clear-session`)

2. **Verifica que se guardó:**
   ```bash
   heroku config:get WHATSAPP_SESSION -a fisiopasteur-whatsapp-bot | wc -c
   ```
   Debería mostrar un número > 1000 (tamaño en caracteres)

3. **Reinicia el bot:**
   ```bash
   heroku restart -a fisiopasteur-whatsapp-bot
   ```

4. **Observa los logs:**
   ```bash
   heroku logs --tail -a fisiopasteur-whatsapp-bot
   ```

5. **Busca estos mensajes:**
   ```
   🔄 Intentando restaurar sesión de WhatsApp...
   ✅ Sesión restaurada desde variables de entorno
   📁 Directorio de sesión creado
   ✅ Sesión restaurada exitosamente
   🌐 Conexión establecida con WhatsApp
   ✅ WhatsApp conectado exitosamente!
   ```

6. **¡No debería aparecer ningún código QR!** ✅

---

## ⚠️ Notas Importantes

### Límites de Variables de Entorno:
- Heroku permite variables de entorno de hasta **32KB**
- La sesión típicamente pesa **100-200KB en base64** después de comprimirse
- Si la sesión crece mucho (raro), puede fallar
- En ese caso, considerar migrar a AWS S3

### Seguridad:
- La sesión está guardada de forma segura en Heroku Config Vars
- Solo accesible con tu API Key de Heroku
- No se expone en los logs ni en el código

### Cuándo Escanear QR de Nuevo:
- **Primera vez** después de implementar este sistema
- **Después de llamar a** `/api/clear-session`
- **Si WhatsApp cierra sesión** por seguridad (raro)
- **Después de cambiar de número** de teléfono vinculado

---

## 🎯 Resultado Final

- ✅ El bot **NUNCA** se desconecta por dyno cycling
- ✅ **NO necesitas** escanear QR después de cada restart
- ✅ **Totalmente automático** - 0 intervención manual
- ✅ **Persistencia garantizada** entre reinicios
- ✅ **Gratis** - usa solo variables de entorno de Heroku

---

## 🆘 Troubleshooting

### Problema: Bot no restaura la sesión

**Solución:**
```bash
# 1. Verifica que las variables estén configuradas
heroku config -a fisiopasteur-whatsapp-bot | grep -E "HEROKU_API_KEY|HEROKU_APP_NAME|WHATSAPP_SESSION"

# 2. Verifica los logs
heroku logs --tail -a fisiopasteur-whatsapp-bot

# 3. Si no hay WHATSAPP_SESSION, escanea el QR nuevamente
```

### Problema: Sesión se guarda pero no funciona

**Solución:**
```bash
# Limpiar sesión y empezar de cero
curl -X POST https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/clear-session

# Reiniciar
heroku restart -a fisiopasteur-whatsapp-bot

# Escanear nuevo QR
heroku logs --tail -a fisiopasteur-whatsapp-bot
```

### Problema: Error "Heroku API error"

**Solución:**
```bash
# Verificar que tu API key sea válida
heroku auth:token

# Reconfigurar
heroku config:set HEROKU_API_KEY=NUEVO_TOKEN -a fisiopasteur-whatsapp-bot
```

---

## 📚 Referencias

- **Código fuente:** `fisio-bot/src/sessionManager.ts`
- **Integración:** `fisio-bot/src/app.ts`
- **Heroku Config Vars:** https://dashboard.heroku.com/apps/fisiopasteur-whatsapp-bot/settings
- **Heroku API Docs:** https://devcenter.heroku.com/articles/platform-api-reference#config-vars
