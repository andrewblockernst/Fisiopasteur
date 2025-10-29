#!/bin/bash

# Script para iniciar el bot con configuración de proxy QuotaGuard

if [ -n "$QUOTAGUARDSTATIC_URL" ]; then
    echo "🔒 Configurando proxy QuotaGuard..."
    
    # Extraer las partes del URL del proxy
    export HTTP_PROXY="$QUOTAGUARDSTATIC_URL"
    export HTTPS_PROXY="$QUOTAGUARDSTATIC_URL"
    export http_proxy="$QUOTAGUARDSTATIC_URL"
    export https_proxy="$QUOTAGUARDSTATIC_URL"
    
    echo "✅ Proxy configurado: ${QUOTAGUARDSTATIC_URL%%:*}://****@****"
else
    echo "ℹ️  No se encontró QUOTAGUARDSTATIC_URL, iniciando sin proxy"
fi

# Iniciar la aplicación
npm start
