/**
 * Utilidades para manejo de números de teléfono
 */

/**
 * Normaliza un número de teléfono al formato internacional de WhatsApp
 * 
 * Reglas:
 * - Si tiene 10 dígitos (ej: 1166782051): es argentino → +5491166782051
 * - Si empieza con 54 y tiene 12 dígitos: agrega + → +541166782051
 * - Si empieza con +54: lo deja como está
 * - Si empieza con + de otro país: lo deja como está
 * - Si ya tiene +549: lo deja como está
 * 
 * @param phone - Número ingresado por el usuario
 * @returns Número normalizado en formato internacional
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remover espacios, guiones y paréntesis
  let cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Si ya tiene el formato correcto, devolverlo
  if (cleaned.startsWith('+')) {
    // Si es +54 pero no tiene el 9, agregarlo
    if (cleaned.startsWith('+54') && !cleaned.startsWith('+549')) {
      return '+549' + cleaned.slice(3);
    }
    return cleaned;
  }
  
  // Si empieza con 549 (código argentino con 9)
  if (cleaned.startsWith('549')) {
    return '+' + cleaned;
  }
  
  // Si empieza con 54 (código argentino sin 9)
  if (cleaned.startsWith('54')) {
    return '+549' + cleaned.slice(2);
  }
  
  // Si tiene exactamente 10 dígitos, es un número argentino
  // Ejemplos: 1166782051, 3704782527
  if (/^\d{10}$/.test(cleaned)) {
    return '+549' + cleaned;
  }
  
  // Si tiene 11 dígitos y empieza con 15, remover el 15 y agregar código argentino
  // Ejemplo: 15166782051 → +5491166782051
  if (/^15\d{9}$/.test(cleaned)) {
    return '+549' + cleaned.slice(2);
  }
  
  // Si tiene otros formatos, asumir que ya está correcto o pedir formato internacional
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

/**
 * Formatea un número para mostrarlo de forma legible
 * 
 * @param phone - Número en formato internacional
 * @returns Número formateado para display
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  // Si es número argentino (+549...)
  if (phone.startsWith('+549')) {
    const number = phone.slice(4); // Remover +549
    
    // Si tiene 10 dígitos (formato estándar argentino)
    if (number.length === 10) {
      const areaCode = number.slice(0, 2); // Ej: 11, 37
      const firstPart = number.slice(2, 6);
      const secondPart = number.slice(6, 10);
      return `+54 9 ${areaCode} ${firstPart}-${secondPart}`;
    }
  }
  
  // Para otros formatos, solo agregar espacios cada 4 dígitos
  return phone.replace(/(\+\d{1,3})(\d{1,3})(\d{1,4})(\d{1,4})/, '$1 $2 $3-$4');
}

/**
 * Valida que el número de teléfono sea válido
 * 
 * @param phone - Número a validar
 * @returns true si es válido, false si no
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Validar formato internacional con +
  if (cleaned.startsWith('+')) {
    // Al menos debe tener código de país (2-3 dígitos) + número (8-12 dígitos)
    return /^\+\d{10,15}$/.test(cleaned);
  }
  
  // Validar número argentino (10 dígitos)
  if (/^\d{10}$/.test(cleaned)) {
    return true;
  }
  
  // Validar formato con 15 al inicio (11 dígitos)
  if (/^15\d{9}$/.test(cleaned)) {
    return true;
  }
  
  return false;
}

/**
 * Obtiene un mensaje de ayuda basado en el input del usuario
 * 
 * @param phone - Número ingresado
 * @returns Mensaje de ayuda o vacío si está correcto
 */
export function getPhoneInputHint(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Si ya está en formato correcto
  if (cleaned.startsWith('+549') && cleaned.length >= 13) {
    return '✓ Formato correcto';
  }
  
  // Si tiene 10 dígitos
  if (/^\d{10}$/.test(cleaned)) {
    return '✓ Se guardará como: +549' + cleaned;
  }
  
  // Si tiene formato con 15
  if (/^15\d{9}$/.test(cleaned)) {
    return '✓ Se guardará como: +549' + cleaned.slice(2);
  }
  
  // Si está incompleto
  if (/^\d{1,9}$/.test(cleaned)) {
    return 'Ej: 1166782051 (10 dígitos)';
  }
  
  return 'Formato: 1166782051 o +5491166782051';
}
