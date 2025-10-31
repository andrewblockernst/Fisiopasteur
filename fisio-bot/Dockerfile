# Usar Node.js 20 LTS (Alpine para imagen más pequeña)
FROM node:20-alpine

# Instalar dependencias del sistema necesarias para sharp y jimp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS las dependencias (necesitamos tsx que está en devDependencies)
RUN npm ci

# Copiar el código fuente
COPY . .

# Exponer el puerto (Heroku lo asigna dinámicamente via $PORT)
EXPOSE 3008

# Comando para iniciar la app (usa tsx para ejecutar TypeScript directamente)
CMD ["npm", "start"]