# 🚀 Guía de Despliegue del Bot de WhatsApp

## 📋 Requisitos Previos

- Cuenta de Heroku o Render
- Heroku CLI instalado (si usas Heroku)
- Git configurado
- Sesión de WhatsApp activa (backup de `bot_sessions/`)

## 🔧 Configuración Local vs Producción

### Variables de Entorno

**Local (desarrollo):**
```bash
FISIOPASTEUR_API_URL=http://localhost:3000
```

**Producción:**
```bash
FISIOPASTEUR_API_URL=https://fisiopasteur.vercel.app
```

## 📦 Paso 1: Preparar el Proyecto

### 1.1 Crear backup de la sesión de WhatsApp

```bash
cd fisio-bot
tar -czf whatsapp-session-backup.tar.gz bot_sessions/
```

**IMPORTANTE:** Guarda este archivo en un lugar seguro. Lo necesitarás para restaurar la sesión en producción.

## 🌐 Paso 2: Despliegue en Heroku

### 2.1 Crear aplicación en Heroku

```bash
# Login en Heroku
heroku login

# Crear aplicación (desde la carpeta fisio-bot)
cd fisio-bot
heroku create fisiopasteur-whatsapp-bot

# O si ya existe:
heroku git:remote -a fisiopasteur-whatsapp-bot
```

### 2.2 Configurar variables de entorno

```bash
# Variables requeridas
heroku config:set PORT=3008
heroku config:set PHONE_NUMBER=5493434687043
heroku config:set FISIOPASTEUR_API_URL=https://fisiopasteur.vercel.app
heroku config:set CENTRO_NOMBRE=Fisiopasteur
heroku config:set CENTRO_DIRECCION="Pasteur 206, Libertador San Martín, Entre Ríos, Argentina"
heroku config:set CENTRO_TELEFONO=5493434687043
heroku config:set CENTRO_EMAIL=contacto@fisiopasteur.com
heroku config:set CENTRO_HORARIOS="Lun a Vie 8:00 - 20:00, Sáb 8:00 - 14:00"
heroku config:set RECORDATORIO_24H=24
heroku config:set RECORDATORIO_2H=2
heroku config:set DEBUG=false

# Supabase
heroku config:set SUPABASE_URL=https://qasrvhpdcerymjtvcfed.supabase.co
heroku config:set SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 2.3 Desplegar

```bash
# Hacer commit de los cambios
git add .
git commit -m "Configurar para producción"

# Push a Heroku
git push heroku main
# O si estás en otra rama:
git push heroku fix/bot-funcionamiento:main
```

### 2.4 Verificar despliegue

```bash
# Ver logs
heroku logs --tail

# Verificar que esté corriendo
heroku ps

# Abrir aplicación
heroku open
```

## 📱 Paso 3: Restaurar Sesión de WhatsApp

### Opción A: Mediante Heroku CLI (Recomendado)

```bash
# Conectar por SSH a Heroku
heroku run bash

# En la sesión SSH, descargar el backup (si lo subiste a algún servicio)
# O usar heroku ps:copy para copiar archivos
```

### Opción B: Reescanear QR (Más Simple)

1. Abre los logs del bot en Heroku:
```bash
heroku logs --tail | grep -A 20 "QR"
```

2. El bot mostrará un código QR en formato texto
3. Copia el código y genera el QR en: https://qr.io/ o similar
4. Escanea con WhatsApp

**IMPORTANTE:** La segunda opción desvinculará la sesión anterior de WhatsApp.

## 🔄 Paso 4: Actualizar Configuración en Fisiopasteur

Una vez desplegado el bot, actualiza la URL en el sistema Fisiopasteur:

### En Vercel (producción):

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Actualiza o agrega:
   ```
   WHATSAPP_BOT_URL=https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com
   WHATSAPP_BOT_ENABLED=true
   ```
4. Redeploy el proyecto

### En local (desarrollo):

En `fisiopasteur/.env.local`:
```bash
WHATSAPP_BOT_URL="http://localhost:3008"
```

## ✅ Paso 5: Verificar Funcionamiento

### 5.1 Verificar estado del bot

```bash
curl https://tu-app.herokuapp.com/api/health
```

Debería responder:
```json
{"status":"ok","message":"Bot is running"}
```

### 5.2 Probar confirmación de turno

Desde Fisiopasteur en producción, crea un turno de prueba y verifica que:
- ✅ Se envíe la confirmación por WhatsApp
- ✅ Se registre el recordatorio en la base de datos
- ✅ El recordatorio se envíe a la hora programada

## 🐛 Solución de Problemas

### Bot no se conecta a WhatsApp

```bash
# Ver logs
heroku logs --tail

# Reiniciar dyno
heroku restart

# Verificar variables de entorno
heroku config
```

### Error "Bot not authenticated"

El bot necesita escanear el QR nuevamente. Ver "Paso 3: Restaurar Sesión".

### Recordatorios no se envían

Verifica que:
1. `FISIOPASTEUR_API_URL` apunte a la URL correcta de Vercel
2. El sistema Fisiopasteur tenga acceso a la base de datos
3. Los logs del bot muestren el procesamiento de recordatorios cada 2 minutos

```bash
heroku logs --tail | grep "Recordatorios procesados"
```

## 📊 Monitoreo

### Ver logs en tiempo real

```bash
heroku logs --tail
```

### Ver uso de recursos

```bash
heroku ps
```

### Ver métricas

```bash
heroku metrics
```

## 🔄 Actualizaciones

Para actualizar el bot en producción:

```bash
# Hacer cambios en el código
git add .
git commit -m "Descripción de cambios"

# Desplegar
git push heroku main

# Verificar
heroku logs --tail
```

## 🔐 Seguridad

1. **Nunca** commitees el archivo `.env` al repositorio
2. Mantén backups seguros de `bot_sessions/`
3. Rota las credenciales de Supabase periódicamente
4. Usa Heroku Config Vars para todas las variables sensibles

## 📝 Notas Adicionales

- El bot se reconecta automáticamente si pierde conexión
- Los recordatorios se procesan cada 2 minutos
- La sesión de WhatsApp se persiste en el filesystem de Heroku (puede perderse en restart)
- Considera usar un addon de almacenamiento persistente para producción (AWS S3, etc.)

## 🆘 Soporte

Si encuentras problemas, verifica:
1. Logs de Heroku: `heroku logs --tail`
2. Estado del bot: `curl https://tu-app.herokuapp.com/api/status`
3. Variables de entorno: `heroku config`
