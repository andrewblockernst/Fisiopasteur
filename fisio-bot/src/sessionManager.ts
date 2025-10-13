import fs from 'fs';
import path from 'path';

const SESSION_DIR = path.join(process.cwd(), 'bot_sessions');
const SESSION_FILE = path.join(SESSION_DIR, 'creds.json');

export class SessionManager {
  /**
   * Guarda la sesión en variable de entorno de Heroku
   */
  static async saveToEnv(): Promise<boolean> {
    try {
      if (!fs.existsSync(SESSION_FILE)) {
        console.log('⚠️ No hay archivo de sesión para guardar');
        return false;
      }

      const sessionData = fs.readFileSync(SESSION_FILE, 'utf-8');
      const sessionBase64 = Buffer.from(sessionData).toString('base64');

      console.log(`📦 Sesión codificada: ${sessionBase64.length} caracteres`);

      // Guardar en Heroku usando la API
      const appName = process.env.HEROKU_APP_NAME || 'fisiopasteur-whatsapp-bot';
      const herokuApiKey = process.env.HEROKU_API_KEY;

      if (!herokuApiKey) {
        console.log('⚠️ HEROKU_API_KEY no configurada. Guarda manualmente:');
        console.log(`heroku config:set WHATSAPP_SESSION="${sessionBase64}" -a ${appName}`);
        return false;
      }

      const response = await fetch(
        `https://api.heroku.com/apps/${appName}/config-vars`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.heroku+json; version=3',
            'Authorization': `Bearer ${herokuApiKey}`
          },
          body: JSON.stringify({
            WHATSAPP_SESSION: sessionBase64
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Heroku API error: ${response.status} - ${errorText}`);
      }

      console.log('✅ Sesión guardada en Heroku config vars');
      return true;

    } catch (error) {
      console.error('❌ Error guardando sesión:', error);
      return false;
    }
  }

  /**
   * Restaura la sesión desde variable de entorno
   */
  static async restoreFromEnv(): Promise<boolean> {
    try {
      const sessionBase64 = process.env.WHATSAPP_SESSION;

      if (!sessionBase64) {
        console.log('ℹ️ No hay sesión guardada en variables de entorno');
        return false;
      }

      console.log('📦 Restaurando sesión desde config vars...');

      // Crear directorio si no existe
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        console.log('📁 Directorio de sesión creado');
      }

      // Decodificar y guardar
      const sessionData = Buffer.from(sessionBase64, 'base64').toString('utf-8');
      fs.writeFileSync(SESSION_FILE, sessionData, 'utf-8');

      console.log('✅ Sesión restaurada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error restaurando sesión:', error);
      return false;
    }
  }

  /**
   * Elimina la sesión guardada
   */
  static async clearSession(): Promise<void> {
    try {
      // Eliminar archivos locales
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log('🗑️ Archivos de sesión locales eliminados');
      }

      // Eliminar de Heroku
      const appName = process.env.HEROKU_APP_NAME || 'fisiopasteur-whatsapp-bot';
      const herokuApiKey = process.env.HEROKU_API_KEY;

      if (herokuApiKey) {
        const response = await fetch(
          `https://api.heroku.com/apps/${appName}/config-vars`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.heroku+json; version=3',
              'Authorization': `Bearer ${herokuApiKey}`
            },
            body: JSON.stringify({
              WHATSAPP_SESSION: null
            })
          }
        );

        if (response.ok) {
          console.log('🗑️ Sesión eliminada de Heroku config vars');
        }
      }

      console.log('✅ Sesión completamente eliminada');
    } catch (error) {
      console.error('❌ Error eliminando sesión:', error);
    }
  }

  /**
   * Verifica si existe una sesión guardada
   */
  static hasSession(): boolean {
    return fs.existsSync(SESSION_FILE) || !!process.env.WHATSAPP_SESSION;
  }
}
