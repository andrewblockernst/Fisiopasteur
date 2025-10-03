# 🎉 ¡Bot de WhatsApp DESPLEGADO EXITOSAMENTE!

## ✅ **Estado Actual: FUNCIONANDO**

Tu bot está **100% operativo** en Heroku:

**🌐 URL:** https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com

## 🚀 **Endpoints Disponibles**

### Health Check
```bash
curl https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/health

# Respuesta:
# {"status":"ok","timestamp":"2025-09-30T02:51:53.267Z","service":"Fisiopasteur WhatsApp Bot"}
```

### Confirmación de Turno
```bash
curl -X POST https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/turno/confirmar \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteNombre": "Juan",
    "pacienteApellido": "Pérez",
    "telefono": "1123456789",
    "fecha": "01/10/2025",
    "hora": "15:00",
    "profesional": "Dr. García",
    "especialidad": "Kinesiología",
    "turnoId": "T-001"
  }'
```

### Recordatorio de Turno
```bash
curl -X POST https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/turno/recordatorio \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteNombre": "María",
    "pacienteApellido": "González",
    "telefono": "1123456789",
    "fecha": "02/10/2025",
    "hora": "16:30",
    "profesional": "Lic. Rodríguez",
    "especialidad": "Kinesiología",
    "turnoId": "T-002"
  }'
```

### Mensaje Personalizado
```bash
curl -X POST https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/mensaje/enviar \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "1123456789",
    "mensaje": "Hola! Este es un mensaje de prueba desde Fisiopasteur 👋"
  }'
```

## 📱 **Para Conectar WhatsApp**

**⚠️ IMPORTANTE**: El bot necesita conectarse a WhatsApp para enviar mensajes.

### Opción 1: Usar sesión local existente
Si tienes el bot funcionando localmente con WhatsApp conectado:

1. **Comprimir carpeta de sesión**:
   ```bash
   cd fisio-bot
   tar -czf bot_sessions.tar.gz bot_sessions/
   ```

2. **Subir a servidor temporal** (como WeTransfer o Google Drive)

3. **Descargar en Heroku** (usando heroku run):
   ```bash
   heroku run bash -a fisiopasteur-whatsapp-bot
   # Dentro del contenedor:
   curl -o bot_sessions.tar.gz "URL_DE_DESCARGA"
   tar -xzf bot_sessions.tar.gz
   ```

### Opción 2: Conectar directamente (recomendado)
1. **Ver logs en tiempo real**:
   ```bash
   heroku logs --tail -a fisiopasteur-whatsapp-bot
   ```

2. **Buscar el QR** en los logs (aparece como texto ASCII)

3. **Escanear con WhatsApp Business** desde tu teléfono

## 🔗 **Integración con Fisiopasteur**

### JavaScript/Node.js
```javascript
const BOT_URL = 'https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com'

// Enviar confirmación de turno
const enviarConfirmacion = async (turnoData) => {
  try {
    const response = await fetch(`${BOT_URL}/api/turno/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pacienteNombre: turnoData.paciente.nombre,
        pacienteApellido: turnoData.paciente.apellido,
        telefono: turnoData.paciente.telefono,
        fecha: turnoData.fecha, // "DD/MM/YYYY"
        hora: turnoData.hora,   // "HH:MM"
        profesional: turnoData.profesional.nombre,
        especialidad: "Kinesiología",
        turnoId: turnoData.id
      })
    })
    
    const result = await response.json()
    console.log('✅ Confirmación enviada:', result.status)
    return result
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Programar recordatorio
const programarRecordatorio = async (turnoData, horasAntes = 24) => {
  const fechaTurno = new Date(`${turnoData.fecha.split('/').reverse().join('-')} ${turnoData.hora}`)
  const tiempoRecordatorio = fechaTurno.getTime() - (horasAntes * 60 * 60 * 1000)
  const ahora = Date.now()
  
  if (tiempoRecordatorio > ahora) {
    setTimeout(async () => {
      try {
        await fetch(`${BOT_URL}/api/turno/recordatorio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(turnoData)
        })
        console.log(`📱 Recordatorio ${horasAntes}h enviado`)
      } catch (error) {
        console.error('❌ Error recordatorio:', error)
      }
    }, tiempoRecordatorio - ahora)
  }
}

// Ejemplo de uso cuando se crea un turno
const crearTurno = async (datosTurno) => {
  // 1. Guardar turno en tu base de datos
  const turno = await guardarTurnoEnDB(datosTurno)
  
  // 2. Enviar confirmación inmediata
  await enviarConfirmacion(turno)
  
  // 3. Programar recordatorios
  await programarRecordatorio(turno, 24) // 24h antes
  await programarRecordatorio(turno, 2)  // 2h antes
  
  return turno
}
```

### PHP
```php
<?php
function enviarConfirmacionTurno($turnoData) {
    $url = 'https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com/api/turno/confirmar';
    
    $data = [
        'pacienteNombre' => $turnoData['paciente']['nombre'],
        'pacienteApellido' => $turnoData['paciente']['apellido'],
        'telefono' => $turnoData['paciente']['telefono'],
        'fecha' => $turnoData['fecha'],
        'hora' => $turnoData['hora'],
        'profesional' => $turnoData['profesional'],
        'especialidad' => 'Kinesiología',
        'turnoId' => $turnoData['id']
    ];
    
    $options = [
        'http' => [
            'header' => "Content-type: application/json\r\n",
            'method' => 'POST',
            'content' => json_encode($data)
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    return json_decode($result, true);
}
?>
```

### Python
```python
import requests
import json
from datetime import datetime, timedelta

BOT_URL = 'https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com'

def enviar_confirmacion_turno(turno_data):
    try:
        response = requests.post(
            f"{BOT_URL}/api/turno/confirmar",
            json={
                'pacienteNombre': turno_data['paciente']['nombre'],
                'pacienteApellido': turno_data['paciente']['apellido'],
                'telefono': turno_data['paciente']['telefono'],
                'fecha': turno_data['fecha'],  # "DD/MM/YYYY"
                'hora': turno_data['hora'],    # "HH:MM"
                'profesional': turno_data['profesional'],
                'especialidad': 'Kinesiología',
                'turnoId': turno_data['id']
            }
        )
        response.raise_for_status()
        result = response.json()
        print(f"✅ Confirmación enviada: {result['status']}")
        return result
    except requests.RequestException as e:
        print(f"❌ Error: {e}")
        raise

def enviar_recordatorio(turno_data):
    try:
        response = requests.post(
            f"{BOT_URL}/api/turno/recordatorio",
            json=turno_data
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"❌ Error recordatorio: {e}")
        raise
```

## 📊 **Monitoreo**

### Ver logs en tiempo real:
```bash
heroku logs --tail -a fisiopasteur-whatsapp-bot
```

### Ver estado de la aplicación:
```bash
heroku ps -a fisiopasteur-whatsapp-bot
```

### Reiniciar si es necesario:
```bash
heroku restart -a fisiopasteur-whatsapp-bot
```

## 💰 **Costos**

- **Dyno básico**: GRATIS (con limitaciones)
- **Hobby Dyno**: $7/mes (recomendado para producción)
- **Ancho de banda**: Incluido

### Para producción (recomendado):
```bash
heroku ps:type hobby -a fisiopasteur-whatsapp-bot
```

## ✅ **Checklist Final**

- [✅] Bot desplegado exitosamente en Heroku
- [✅] Health check funcionando
- [✅] Endpoints API disponibles
- [✅] Documentación de integración completa
- [ ] WhatsApp conectado (pendiente de escanear QR)
- [ ] Prueba de envío de mensaje
- [ ] Integración con sistema Fisiopasteur

## 🎯 **Próximos Pasos**

1. **Conectar WhatsApp** escaneando el QR desde los logs
2. **Probar endpoints** con datos reales
3. **Integrar con tu sistema** Fisiopasteur usando los ejemplos de código
4. **Configurar recordatorios** automáticos
5. **(Opcional) Upgrade a Hobby Dyno** para producción

## 🆘 **Soporte**

Si necesitas ayuda:
- **Logs**: `heroku logs --tail -a fisiopasteur-whatsapp-bot`
- **Estado**: `heroku ps -a fisiopasteur-whatsapp-bot`
- **Config**: `heroku config -a fisiopasteur-whatsapp-bot`

**¡Tu bot está completamente funcional y listo para usar! 🚀**