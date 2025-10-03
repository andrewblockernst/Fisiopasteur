# 🚀 Guía Completa: Deploy Bot WhatsApp en Heroku

## 📋 **Prerrequisitos**

1. **Cuenta de Heroku** (gratis): [heroku.com](https://heroku.com)
2. **Heroku CLI** instalado:
   ```bash
   # En Mac
   brew tap heroku/brew && brew install heroku
   
   # Verificar instalación
   heroku --version
   ```

3. **Git** configurado en el proyecto

## 🔧 **Paso 1: Preparar el Proyecto**

### ✅ Ya tienes configurado:
- `Procfile` ✅ 
- Scripts de `package.json` ✅
- Engines de Node.js ✅

### 🔍 Verificar archivos:
```bash
cd /Users/andrew/Documents/code/projects/Fisiopasteur/fisio-bot

# Verificar que existe Procfile
cat Procfile
# Debería mostrar: web: npm start

# Verificar package.json
npm run build  # Debería compilar sin errores
```

## 📱 **Paso 2: Conectar WhatsApp (CRÍTICO)**

**⚠️ IMPORTANTE: Debes conectar WhatsApp ANTES de deployar a Heroku**

1. **Ejecuta localmente** con sesión limpia:
   ```bash
   rm -rf bot_sessions/ *.png *.log  # Limpiar sesiones
   npx tsx src/app.ts
   ```

2. **Busca el QR** en la terminal. Debería aparecer algo así:
   ```
   ==================================================
   📱 CÓDIGO QR PARA WHATSAPP:
   ==================================================
   ████ ▄▄▄▄▄ █▀█ █▀▀█ █▀▄▀█ █▀▀█ █▀▀█ ████
   ████ █   █ █▀▀ █▄▄█ █▀█▀█ █▄▄█ █▄▄█ ████
   ████ █▄▄▄█ █   █  █ █ █ █ █  █ █  █ ████
   ==================================================
   ```

3. **Escanear QR**:
   - Abre **WhatsApp** en tu teléfono
   - Ve a **Ajustes > Dispositivos vinculados**
   - Toca **"Vincular un dispositivo"**
   - Escanea el QR

4. **Esperar confirmación**:
   ```
   ✅ WhatsApp conectado exitosamente!
   ```

## 🚀 **Paso 3: Deploy a Heroku**

### 1. Login y crear app:
```bash
# Login a Heroku
heroku login

# Crear aplicación (elige un nombre único)
heroku create fisiopasteur-bot-whatsapp

# O si ya tienes una app específica:
heroku create tu-nombre-unico-aqui
```

### 2. Configurar variables de entorno:
```bash
# Variables básicas
heroku config:set NODE_ENV=production
heroku config:set PORT=443

# Variables del centro (opcional, personaliza)
heroku config:set CENTRO_NOMBRE="Fisiopasteur"
heroku config:set CENTRO_TELEFONO="+54 9 11 XXXX-XXXX"
heroku config:set CENTRO_EMAIL="contacto@fisiopasteur.com"

# Verificar configuración
heroku config
```

### 3. Inicializar Git (si no está hecho):
```bash
git init
git add .
git commit -m "Bot WhatsApp Fisiopasteur - Ready for deploy"
```

### 4. Deploy:
```bash
# Conectar con Heroku
heroku git:remote -a fisiopasteur-bot-whatsapp

# Deploy
git push heroku main

# Ver logs en tiempo real
heroku logs --tail
```

## 📊 **Paso 4: Verificar Deploy**

### 1. Verificar que funciona:
```bash
# Abrir la app
heroku open

# Verificar health check
curl https://git.heroku.com/fisio-bot.git/api/health

# Debería responder:
# {"status":"ok","timestamp":"2025-09-29T...","service":"Fisiopasteur WhatsApp Bot"}
```

### 2. Probar endpoints:
```bash
# Test de confirmación de turno
curl -X POST https://git.heroku.com/fisio-bot.git/api/health/api/turno/confirmar \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteNombre": "Juan",
    "pacienteApellido": "Test",
    "telefono": "1123456789",
    "fecha": "30/09/2025",
    "hora": "15:00",
    "profesional": "Dr. García",
    "especialidad": "Kinesiología",
    "turnoId": "TEST-001"
  }'
```

## 🔄 **Paso 5: Integración con Fisiopasteur**

### En tu sistema principal, usar esta URL:
```javascript
const BOT_URL = 'https://git.heroku.com/fisio-bot.git/'

// Ejemplo: Enviar confirmación de turno
const enviarConfirmacion = async (turnoData) => {
  const response = await fetch(`${BOT_URL}/api/turno/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pacienteNombre: turnoData.paciente.nombre,
      pacienteApellido: turnoData.paciente.apellido,
      telefono: turnoData.paciente.telefono,
      fecha: turnoData.fecha, // "DD/MM/YYYY"
      hora: turnoData.hora,   // "HH:MM" 
      profesional: turnoData.profesional,
      especialidad: "Kinesiología",
      turnoId: turnoData.id
    })
  })
  
  const result = await response.json()
  console.log('Confirmación enviada:', result.status)
}
```

## 📱 **Gestión de Sesión en Producción**

### ⚠️ Problema: Heroku reinicia apps
- Heroku puede reiniciar tu app cada 24h
- Esto desconecta WhatsApp
- **Solución**: Usar addon de almacenamiento persistente

### 🔧 Solución con Redis (Recomendada):
```bash
# Agregar Redis addon (gratis hasta 25MB)
heroku addons:create heroku-redis:hobby-dev

# Verificar
heroku config | grep REDIS
```

### 💰 **Costo estimado**:
- **Hobby Dyno**: $7/mes (recomendado para producción)
- **Redis addon**: Gratis hasta 25MB
- **Total**: ~$7/mes

## 🔍 **Monitoreo y Mantenimiento**

### Ver logs:
```bash
# Logs en tiempo real
heroku logs --tail

# Logs específicos
heroku logs --source app --dyno web
```

### Comandos útiles:
```bash
# Reiniciar app
heroku restart

# Ver estado
heroku ps

# Escalar (más recursos)
heroku ps:scale web=1

# Configurar para producción (recomendado)
heroku ps:type hobby
```

## ❗ **Problemas Comunes y Soluciones**

### 1. **App se desconecta de WhatsApp**:
**Causa**: Heroku reinició la app y perdió la sesión
**Solución**: 
- Usar addon Redis para persistencia
- O volver a conectar localmente y redeployar

### 2. **App no responde después de 30 min**:
**Causa**: Dyno gratis se "duerme"
**Solución**: Upgrade a Hobby dyno ($7/mes)

### 3. **Error de puertos**:
**Causa**: Puerto mal configurado
**Solución**: `heroku config:set PORT=443`

### 4. **QR no aparece en Heroku**:
**Causa**: Normal, QR solo aparece localmente
**Solución**: Conectar localmente primero

## ✅ **Checklist Final**

Antes de ir a producción:

- [ ] QR escaneado y WhatsApp conectado localmente
- [ ] App deployada en Heroku sin errores
- [ ] Health check responde correctamente
- [ ] Endpoint de confirmación probado
- [ ] Variables de entorno configuradas
- [ ] Logs funcionando correctamente
- [ ] (Opcional) Redis configurado para persistencia
- [ ] (Recomendado) Hobby dyno para estabilidad

## 🎯 **Resultado Final**

Una vez completado:
- ✅ Bot disponible 24/7 en `https://git.heroku.com/fisio-bot.git/api/health`
- ✅ Endpoints listos para integrar con Fisiopasteur
- ✅ Confirmaciones y recordatorios automáticos
- ✅ Interacciones con pacientes funcionando
- ✅ Monitoreo y logs disponibles

**¡Tu bot estará completamente operativo en producción!** 🚀