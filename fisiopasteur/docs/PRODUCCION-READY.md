# 🚀 Resumen de Configuración para Producción

## ✅ Cambios Realizados

### 1. **Bot de WhatsApp** (`fisio-bot/.env`)
```bash
FISIOPASTEUR_API_URL=https://fisiopasteur.vercel.app
```
✅ Ahora apunta a la URL de producción de Vercel

### 2. **Sistema Fisiopasteur** (`fisiopasteur/.env.local`)
```bash
WHATSAPP_BOT_URL="https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com"
```
✅ Ahora apunta a la URL del bot en Heroku

### 3. **Backup de Sesión**
✅ Creado: `fisio-bot/whatsapp-session-backup-20251029.tar.gz`

### 4. **Documentación**
✅ Creado: `fisio-bot/DEPLOY.md` - Guía completa de despliegue
✅ Creado: `fisio-bot/.env.example` - Plantilla de variables de entorno

## 📋 Próximos Pasos

### Opción A: Desplegar en Heroku Existente

Si ya tienes la app `fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com`:

```bash
cd fisio-bot

# Conectar con Heroku
heroku git:remote -a fisiopasteur-whatsapp-bot-df9edfb46742

# Actualizar variables de entorno
heroku config:set FISIOPASTEUR_API_URL=https://fisiopasteur.vercel.app

# Verificar que todas las variables estén configuradas
heroku config

# Hacer push
git add .
git commit -m "Configurar para producción"
git push heroku fix/bot-funcionamiento:main

# Ver logs
heroku logs --tail
```

### Opción B: Nueva Aplicación en Heroku

Si necesitas crear una nueva app:

```bash
cd fisio-bot

# Login
heroku login

# Crear app
heroku create

# Configurar variables (ver DEPLOY.md para lista completa)
heroku config:set FISIOPASTEUR_API_URL=https://fisiopasteur.vercel.app
heroku config:set SUPABASE_URL=https://qasrvhpdcerymjtvcfed.supabase.co
heroku config:set SUPABASE_ANON_KEY=tu_key
# ... más variables

# Desplegar
git push heroku main

# Ver logs
heroku logs --tail
```

## 📱 Conectar WhatsApp en Producción

Después del despliegue, necesitarás vincular WhatsApp:

```bash
# Ver logs para obtener el QR
heroku logs --tail | grep -A 20 "QR"
```

El bot mostrará un código QR en formato texto. Cópialo y genera el QR visual en https://qr.io/ para escanearlo con WhatsApp.

## 🔄 Actualizar Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/bubo/fisiopasteur
2. Settings → Environment Variables → Production
3. Actualiza `WHATSAPP_BOT_URL` con la URL del bot en Heroku
4. Redeploy el proyecto

## ✅ Verificación Final

### 1. Verificar Bot
```bash
curl https://tu-app.herokuapp.com/api/health
```

Respuesta esperada:
```json
{"status":"ok","message":"Bot is running"}
```

### 2. Verificar Estado de WhatsApp
```bash
curl https://tu-app.herokuapp.com/api/status
```

### 3. Probar desde Fisiopasteur
- Crear un turno en producción (https://fisiopasteur.vercel.app)
- Verificar que llegue la confirmación por WhatsApp
- Verificar que se programe el recordatorio

## 🔄 Para Volver a Desarrollo Local

Cuando quieras trabajar en local nuevamente:

### Bot (`fisio-bot/.env`):
```bash
FISIOPASTEUR_API_URL=http://localhost:3000
```

### Sistema (`fisiopasteur/.env.local`):
```bash
WHATSAPP_BOT_URL="http://localhost:3008"
```

Luego reinicia ambos servicios:
```bash
# Terminal 1: Bot
cd fisio-bot && npm start

# Terminal 2: Sistema
cd fisiopasteur && npm run dev
```

## 📊 Monitoreo en Producción

```bash
# Ver logs en tiempo real
heroku logs --tail

# Ver solo recordatorios
heroku logs --tail | grep "Recordatorios"

# Ver uso de recursos
heroku ps

# Reiniciar si hay problemas
heroku restart
```

## 🆘 Troubleshooting

### Bot no conecta a WhatsApp
1. Ver logs: `heroku logs --tail`
2. Reiniciar: `heroku restart`
3. Reescanear QR

### Recordatorios no se envían
1. Verificar que `FISIOPASTEUR_API_URL` esté correcto en Heroku
2. Ver logs: `heroku logs --tail | grep "Recordatorios"`
3. Verificar conectividad con Supabase

### Confirmaciones no llegan
1. Verificar que `WHATSAPP_BOT_URL` esté correcto en Vercel
2. Verificar que el bot esté corriendo: `curl https://tu-app.herokuapp.com/api/health`
3. Ver logs del sistema en Vercel

## 📝 Notas Importantes

- **Sesión de WhatsApp:** Se guarda en el filesystem de Heroku. Si el dyno se reinicia, puede perderse.
- **Backup regular:** Guarda backups de `bot_sessions/` periódicamente.
- **Variables sensibles:** Nunca las subas al repositorio, usa Heroku Config Vars.
- **Monitoreo:** Configura alertas en Heroku para detectar problemas temprano.

## 📚 Recursos

- [Documentación de Despliegue](./DEPLOY.md) - Guía detallada paso a paso
- [Variables de Entorno](./.env.example) - Plantilla de configuración
- Backup de Sesión: `whatsapp-session-backup-20251029.tar.gz`

---

¿Listo para producción? 🚀
