# ✅ Checklist de Despliegue a Producción

## Pre-Despliegue

- [x] Configuraciones actualizadas para producción
  - [x] `fisio-bot/.env` → `FISIOPASTEUR_API_URL=https://fisiopasteur.vercel.app`
  - [x] `fisiopasteur/.env.local` → `WHATSAPP_BOT_URL=https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com`
- [x] Backup de sesión WhatsApp creado
  - [x] `fisio-bot/whatsapp-session-backup-20251029.tar.gz`
- [x] Documentación completa
  - [x] `DEPLOY.md` - Guía detallada
  - [x] `PRODUCCION-READY.md` - Resumen ejecutivo
  - [x] `.env.example` - Plantilla de variables

## Despliegue del Bot

- [ ] Conectar repositorio con Heroku
  ```bash
  cd fisio-bot
  heroku git:remote -a fisiopasteur-whatsapp-bot-df9edfb46742
  ```

- [ ] Verificar variables de entorno en Heroku
  ```bash
  heroku config
  ```
  
  Variables requeridas:
  - [ ] `PORT=3008`
  - [ ] `PHONE_NUMBER=5493434687043`
  - [ ] `FISIOPASTEUR_API_URL=https://fisiopasteur.vercel.app`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `CENTRO_NOMBRE`
  - [ ] `CENTRO_DIRECCION`
  - [ ] `CENTRO_TELEFONO`

- [ ] Desplegar bot
  ```bash
  git add .
  git commit -m "Deploy: Bot configurado para producción"
  git push heroku fix/bot-funcionamiento:main
  ```

- [ ] Verificar despliegue exitoso
  ```bash
  heroku logs --tail
  ```
  Buscar: `✅ WhatsApp conectado exitosamente!`

## Conectar WhatsApp

- [ ] Obtener código QR de los logs
  ```bash
  heroku logs --tail | grep -A 20 "QR"
  ```

- [ ] Generar QR visual en https://qr.io/

- [ ] Escanear con WhatsApp
  - Abrir WhatsApp en tu teléfono
  - Ir a Ajustes → Dispositivos vinculados
  - Tocar "Vincular un dispositivo"
  - Escanear el código QR

- [ ] Verificar conexión exitosa en logs
  ```bash
  heroku logs --tail
  ```
  Buscar: `🤖 Bot conectado y listo`

## Configurar Vercel

- [ ] Ir a proyecto en Vercel: https://vercel.com/bubo/fisiopasteur

- [ ] Configurar variables de entorno de producción
  - [ ] Settings → Environment Variables
  - [ ] Agregar/actualizar `WHATSAPP_BOT_URL`
  - [ ] Valor: URL del bot en Heroku
  - [ ] Seleccionar: Production

- [ ] Redeploy el proyecto
  - [ ] Deployments → Latest → Redeploy

## Verificación

### 1. Verificar Bot Activo
```bash
curl https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/health
```
- [ ] Respuesta: `{"status":"ok","message":"Bot is running"}`

### 2. Verificar WhatsApp Conectado
```bash
curl https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/status
```
- [ ] Respuesta incluye: `"authenticated":true`

### 3. Probar Confirmación de Turno
- [ ] Ir a https://fisiopasteur.vercel.app
- [ ] Crear un turno de prueba
- [ ] Verificar que llegue confirmación por WhatsApp
- [ ] Verificar en logs del bot:
  ```bash
  heroku logs --tail
  ```
  Buscar: `✅ Mensaje enviado exitosamente`

### 4. Probar Recordatorio
- [ ] Crear turno con horario en 5-10 minutos
- [ ] Esperar a que se cumpla la hora del recordatorio
- [ ] Verificar que llegue el recordatorio por WhatsApp
- [ ] Verificar en logs del bot:
  ```bash
  heroku logs --tail | grep "Recordatorios procesados"
  ```

## Monitoreo Post-Despliegue

- [ ] Configurar alertas en Heroku (opcional)
- [ ] Documentar URL del bot para el equipo
- [ ] Guardar backup de sesión en lugar seguro
- [ ] Programar backups periódicos de `bot_sessions/`

## Rollback (si es necesario)

Si algo sale mal:

1. Revertir commit:
   ```bash
   git revert HEAD
   git push heroku fix/bot-funcionamiento:main
   ```

2. O hacer rollback en Heroku:
   ```bash
   heroku releases
   heroku rollback v<número-anterior>
   ```

## Notas Finales

- ✅ Bot funciona 100% en local
- ✅ Configuraciones preparadas para producción
- ✅ Backup de sesión creado
- ✅ Documentación completa disponible

---

## 🆘 Contactos de Soporte

- Heroku Support: https://help.heroku.com
- Vercel Support: https://vercel.com/support
- Documentación BuilderBot: https://builderbot.vercel.app

---

**¡Todo listo para producción! 🚀**
