#!/bin/bash

# ===============================================
# SCRIPT PARA CRON JOBS - RECORDATORIOS WHATSAPP
# ===============================================

# Configuración
BASE_URL="http://localhost:3000/"  # Cambiar por tu dominio
LOG_FILE="/var/log/fisiopasteur-whatsapp.log"

# Función para logging
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función para procesar notificaciones pendientes
procesar_notificaciones() {
    log_message "🚀 Iniciando procesamiento de notificaciones WhatsApp..."
    
    # Realizar petición al endpoint
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/notificaciones" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    json_response=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        # Parsear respuesta JSON (requiere jq)
        if command -v jq >/dev/null 2>&1; then
            procesadas=$(echo "$json_response" | jq -r '.procesadas // 0')
            enviadas=$(echo "$json_response" | jq -r '.enviadas // 0')
            fallidas=$(echo "$json_response" | jq -r '.fallidas // 0')
            
            log_message "✅ Procesamiento exitoso: $enviadas enviadas, $fallidas fallidas de $procesadas total"
        else
            log_message "✅ Procesamiento exitoso (respuesta: $json_response)"
        fi
    else
        log_message "❌ Error en procesamiento: HTTP $http_code"
        log_message "Respuesta: $json_response"
    fi
}

# Función para verificar estado del bot
verificar_bot() {
    log_message "🔍 Verificando estado del bot WhatsApp..."
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/notificaciones/estadisticas?action=health" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    json_response=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        if command -v jq >/dev/null 2>&1; then
            bot_disponible=$(echo "$json_response" | jq -r '.data.botDisponible // false')
            
            if [ "$bot_disponible" = "true" ]; then
                log_message "✅ Bot WhatsApp Online"
                return 0
            else
                log_message "⚠️ Bot WhatsApp Offline"
                return 1
            fi
        else
            log_message "📊 Estado del bot verificado"
            return 0
        fi
    else
        log_message "❌ Error verificando bot: HTTP $http_code"
        return 1
    fi
}

# Función principal
main() {
    case "$1" in
        "procesar")
            # Verificar bot primero
            if verificar_bot; then
                procesar_notificaciones
            else
                log_message "⏸️ Bot no disponible, saltando procesamiento"
            fi
            ;;
        "verificar")
            verificar_bot
            ;;
        "limpiar")
            log_message "🧹 Iniciando limpieza de notificaciones antiguas..."
            response=$(curl -s -X POST -H "Content-Type: application/json" \
                -d '{"action":"limpiar"}' \
                -w "\n%{http_code}" \
                "$BASE_URL/api/notificaciones/estadisticas" 2>&1)
            
            http_code=$(echo "$response" | tail -n1)
            json_response=$(echo "$response" | sed '$d')
            
            if [ "$http_code" -eq 200 ]; then
                log_message "✅ Limpieza completada"
            else
                log_message "❌ Error en limpieza: HTTP $http_code"
            fi
            ;;
        *)
            echo "Uso: $0 {procesar|verificar|limpiar}"
            echo ""
            echo "Comandos:"
            echo "  procesar  - Procesar notificaciones pendientes"
            echo "  verificar - Verificar estado del bot"
            echo "  limpiar   - Limpiar notificaciones antiguas"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$1"