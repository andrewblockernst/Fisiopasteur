# Configuración AWS Lightsail - Fisiopasteur WhatsApp Bot

## Paso 1: Descargar la SSH Key

1. En Lightsail, ve a **Account** → **SSH keys**
2. Descarga la key "LightsailDefaultKey-us-east-1.pem" (o la región que elegiste)
3. Guárdala en: `~/.ssh/lightsail-fisiopasteur.pem`

## Paso 2: Configurar permisos de la key

```bash
chmod 400 ~/.ssh/lightsail-fisiopasteur.pem
```

## Paso 3: Conectar por SSH

**Necesitas la IP pública de tu instancia**. En la consola de Lightsail:
- Click en tu instancia
- Copia la **Public IP** (ej: 18.XXX.XXX.XXX)

```bash
ssh -i ~/.ssh/lightsail-fisiopasteur.pem ubuntu@TU_IP_PUBLICA
```

## Paso 4: Instalar dependencias en el servidor

Una vez conectado, ejecutá estos comandos:

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Git
sudo apt install -y git

# Verificar instalaciones
node --version
npm --version
git --version
```

## Paso 5: Clonar el repositorio

```bash
# Crear directorio para el proyecto
mkdir -p ~/apps
cd ~/apps

# Clonar tu repositorio
git clone https://github.com/andrewblockernst/Fisiopasteur.git
cd Fisiopasteur/fisio-bot

# Instalar dependencias
npm install
```

## Paso 6: Configurar variables de entorno

```bash
# Crear archivo .env
nano .env
```

Pegá tu configuración (las mismas variables que tenés en Heroku):
```env
PORT=3008
FISIOPASTEUR_API_URL=https://fisiopasteur.vercel.app
SUPABASE_URL=tu_url
SUPABASE_ANON_KEY=tu_key
```

Guardar: `Ctrl+X` → `Y` → `Enter`

## Paso 7: Instalar PM2 (para mantener el bot corriendo)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar el bot con PM2
pm2 start npm --name "fisiopasteur-bot" -- start

# Configurar PM2 para iniciarse automáticamente al reiniciar
pm2 startup
pm2 save

# Ver logs del bot
pm2 logs fisiopasteur-bot
```

## Paso 8: Configurar firewall

```bash
# Permitir el puerto 3008
sudo ufw allow 3008/tcp
sudo ufw allow ssh
sudo ufw --force enable
```

## Paso 9: Configurar IP estática en Lightsail

1. En la consola de Lightsail
2. Ve a **Networking** → **Create static IP**
3. Selecciona tu instancia
4. Dale un nombre: "fisiopasteur-bot-ip"
5. Click en **Create**

## Paso 10: Actualizar la URL del bot en Vercel

Una vez que tengas la IP estática, actualiza en Vercel:

```
WHATSAPP_BOT_URL=http://98.86.20.192:3008
```

---

## Comandos útiles PM2:

```bash
pm2 list                    # Ver todos los procesos
pm2 logs fisiopasteur-bot   # Ver logs en tiempo real
pm2 restart fisiopasteur-bot # Reiniciar el bot
pm2 stop fisiopasteur-bot   # Detener el bot
pm2 delete fisiopasteur-bot # Eliminar el proceso
```

## Para actualizar el código:

```bash
cd ~/apps/Fisiopasteur/fisio-bot
git pull origin main
npm install
pm2 restart fisiopasteur-bot
```
