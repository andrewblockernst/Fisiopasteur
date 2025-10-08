# 🚀 Configuración de Keep-Alive para Fisiopasteur Bot

## Problema Resuelto
El bot de WhatsApp en Heroku se apagaba por:
- Request timeouts (>30 segundos)
- Inactividad en dynos Eco/Basic
- Polling sin timeout configurado

## Soluciones Implementadas

### 1. ✅ Timeout en Polling (fisio-bot)
- Agregado timeout de 25 segundos en fetch
- Reducido intervalo de polling a 2 minutos
- Mejor manejo de errores

### 2. ✅ Health Check Endpoints
- `/health` - Endpoint rápido para monitoring
- `/api/health` - Endpoint detallado con estadísticas
- `/api/status` - Estado de autenticación

### 3. ✅ Optimización de Recordatorios (Vercel)
- Límite de 10 notificaciones por ejecución
- Procesamiento en batches de 3
- Timeout y métricas de duración

### 4. ✅ Ping Automático desde Vercel
- Endpoint `/api/cron/ping-bot` cada 10 minutos
- Mantiene el dyno despierto
- Configurado en `vercel.json`

## Configuración Adicional Recomendada

### Opción A: UptimeRobot (GRATIS - Recomendado)

1. **Registrarse en UptimeRobot**: https://uptimerobot.com/

2. **Crear Monitor HTTP(s)**:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Fisiopasteur Bot KeepAlive
   - **URL**: `https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/health`
   - **Monitoring Interval**: 5 minutos
   - **Monitor Timeout**: 30 segundos

3. **Configurar Alertas**:
   - Email cuando el bot esté caído
   - SMS (opcional, requiere upgrade)

**Ventajas**:
- ✅ Gratis hasta 50 monitores
- ✅ Ping cada 5 minutos
- ✅ Alertas por email
- ✅ Dashboard con uptime statistics

### Opción B: Vercel Cron (Ya configurado)

Ya está configurado en `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/ping-bot",
      "schedule": "*/10 * * * *"  // Cada 10 minutos
    }
  ]
}
```

**Nota**: Vercel Cron requiere plan Pro ($20/mes)

### Opción C: GitHub Actions (GRATIS)

Crear `.github/workflows/keep-bot-alive.yml`:

```yaml
name: Keep Bot Alive

on:
  schedule:
    # Cada 10 minutos
    - cron: '*/10 * * * *'
  workflow_dispatch: # Permite ejecución manual

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Heroku Bot
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/health)
          if [ $response -eq 200 ]; then
            echo "✅ Bot está activo"
          else
            echo "❌ Bot respondió con código: $response"
            exit 1
          fi
```

## Verificación del Estado

### Ver logs del bot en Heroku:
```bash
heroku logs --tail -a fisiopasteur-whatsapp-bot
```

### Ver uptime actual:
```bash
heroku ps -a fisiopasteur-whatsapp-bot
```

### Probar health check:
```bash
curl https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/health
```

### Ver estadísticas detalladas:
```bash
curl https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/health
```

## Métricas Esperadas

### ✅ Estado Saludable:
- Uptime > 23 horas (antes del dyno cycling diario)
- Response time < 500ms en `/health`
- Memoria < 200MB
- 0 request timeouts

### ⚠️ Alertas:
- Response time > 2 segundos
- Memoria > 400MB
- Más de 3 timeouts por hora
- Bot desconectado > 5 minutos

## Costos

### Plan Actual (Eco Dyno - $5/mes):
- ✅ Con keep-alive funciona 24/7
- ⚠️ Se duerme sin tráfico HTTP externo
- ⚠️ Reinicia cada ~24h (dyno cycling)

### Upgrade Recomendado (Standard-1X - $25/mes):
- ✅ Nunca se duerme
- ✅ 512MB RAM garantizada
- ✅ Métricas avanzadas
- ✅ SSL certificado
- ✅ No necesita keep-alive

## Deploy de Cambios

### 1. Subir cambios a Heroku:
```bash
cd fisio-bot
git add .
git commit -m "Optimización: agregar timeouts y health checks"
git push heroku main
```

### 2. Verificar deploy:
```bash
heroku logs --tail -a fisiopasteur-whatsapp-bot
```

### 3. Probar health check:
```bash
curl https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/health
```

### 4. Deploy a Vercel (para ping-bot):
```bash
cd fisiopasteur
vercel --prod
```

## Troubleshooting

### Bot se sigue apagando:
1. Verificar que UptimeRobot está configurado y activo
2. Ver logs: `heroku logs --tail`
3. Verificar tipo de dyno: `heroku ps:type`
4. Considerar upgrade a Standard dyno

### Timeouts persisten:
1. Ver cuál endpoint está tardando: revisar logs
2. Aumentar límite de notificaciones por batch (actualmente 10)
3. Reducir intervalo de polling (actualmente 2 min)

### Bot se desconecta de WhatsApp:
1. Verificar sesión guardada en Heroku
2. Re-escanear QR si es necesario
3. Verificar que `bot_sessions` está en `.gitignore`

## Contacto de Soporte

Para más información:
- Heroku Dashboard: https://dashboard.heroku.com/apps/fisiopasteur-whatsapp-bot
- Vercel Dashboard: https://vercel.com/dashboard
- Logs en tiempo real: `heroku logs --tail`

---

**✅ Con estas optimizaciones, el bot debería mantenerse activo 24/7 sin necesidad de intervención manual.**
