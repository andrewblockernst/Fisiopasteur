import { twMerge } from "tailwind-merge";
import { clsx, ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

//to create a date object from a string in the format "YYYY-MM-DD"
export function urlToDate(date: string) {
  const [day, month, year] = date.split("-").map(Number);
  const now = new Date(); // Obtenemos la fecha/hora actual del usuario
  
  return new Date(
    year,
    month, // Los meses son 0-based (0 = Enero)
    day,
    now.getHours(), // Hora actual del usuario
    now.getMinutes() // Minutos actuales del usuario
  );
}

// Format DATE objects to input values for type="date" (1-based)
export const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses de date son 0-based
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export function getContrastColor(hexColor: string) {
  // Remueve '#' si existe
  hexColor = hexColor.replace(/^#/, '');
  
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  
  // Calcula la luminancia según la fórmula YIQ
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'text-black' : 'text-white';
}

export function formatoNumeroTelefono(phone: string | null ): string {
  if (!phone) return '';
  
  //LIMPIA CARACTERES QUE NO SON NUMERICOS
  const caracteres = phone.replace(/\D/g, '');
  
  // Detectar código de país automáticamente
  let codigoPais = '';
  let numeroPrincipal = '';
  
  if (caracteres.startsWith('54')) {
    // Argentina (+54)
    codigoPais = '54';
    numeroPrincipal = caracteres.slice(2);
    
    // NUMEROS MINIMOS REQUERIDOS para Argentina
    if (caracteres.length < 12) return phone;
    
    const codigoPaisFormateado = `+${codigoPais}`;
    
    if(numeroPrincipal.startsWith('9') && numeroPrincipal.length >= 11) {
      //CELULAR
      const prefijoCelular = numeroPrincipal.slice(0, 1) // 9
      const codigoArea = numeroPrincipal.slice(1, 3); 
      const numero = numeroPrincipal.slice(3);
      return `${codigoPaisFormateado} ${prefijoCelular} ${codigoArea} ${numero.slice(0, 4)}-${numero.slice(4)}`;
    } else {
      //FIJO
      const codigoArea = numeroPrincipal.slice(0, 2); 
      const numero = numeroPrincipal.slice(2);
      return `${codigoPaisFormateado} ${codigoArea} ${numero.slice(0, 4)}-${numero.slice(4)}`;
    }
  } else if (caracteres.startsWith('55')) {
    // Brasil (+55)
    codigoPais = '55';
    numeroPrincipal = caracteres.slice(2);
    
    // Formato Brasil: +55 (XX) XXXXX-XXXX (celular) o +55 (XX) XXXX-XXXX (fijo)
    if (caracteres.length < 12) return phone;
    
    const codigoPaisFormateado = `+${codigoPais}`;
    const codigoArea = numeroPrincipal.slice(0, 2); // DDD (código de área)
    const numero = numeroPrincipal.slice(2);
    
    if (numero.length === 9) {
      // Celular: 9XXXX-XXXX
      return `${codigoPaisFormateado} (${codigoArea}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
    } else if (numero.length === 8) {
      // Fijo: XXXX-XXXX
      return `${codigoPaisFormateado} (${codigoArea}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    }
    
    return phone;
  } else if (caracteres.startsWith('1')) {
    // USA/Canadá (+1)
    if (caracteres.length === 11) {
      codigoPais = '1';
      numeroPrincipal = caracteres.slice(1);
      const codigoArea = numeroPrincipal.slice(0, 3);
      const numero = numeroPrincipal.slice(3);
      return `+${codigoPais} (${codigoArea}) ${numero.slice(0, 3)}-${numero.slice(3)}`;
    }
    return phone;
  } else {
    // Si no tiene código de país reconocido, asumir Argentina por defecto
    codigoPais = '54';
    numeroPrincipal = caracteres;
    
    // NUMEROS MINIMOS REQUERIDOS
    if (caracteres.length < 10) return phone;
    
    const codigoPaisFormateado = `+${codigoPais}`;
    
    if(numeroPrincipal.startsWith('9') && numeroPrincipal.length >= 11) {
      //CELULAR
      const prefijoCelular = numeroPrincipal.slice(0, 1) // 9
      const codigoArea = numeroPrincipal.slice(1, 3); 
      const numero = numeroPrincipal.slice(3);
      return `${codigoPaisFormateado} ${prefijoCelular} ${codigoArea} ${numero.slice(0, 4)}-${numero.slice(4)}`;
    } else {
      //FIJO O CELULAR SIN 9
      const codigoArea = numeroPrincipal.slice(0, 2); 
      const numero = numeroPrincipal.slice(2);
      return `${codigoPaisFormateado} ${codigoArea} ${numero.slice(0, 4)}-${numero.slice(4)}`;
    }
  }
}

export function formatoDNI(dni: string | number | null | undefined): string {
  if (dni === null || dni === undefined) return '';
  const dniStr = dni.toString().replace(/\D/g, ''); // Elimina caracteres no numéricos
  if (dniStr.length <= 3) return dniStr;
  if (dniStr.length <= 6) return `${dniStr.slice(0, -3)}.${dniStr.slice(-3)}`;
  if (dniStr.length <= 9) return `${dniStr.slice(0, -6)}.${dniStr.slice(-6, -3)}.${dniStr.slice(-3)}`;
  return dniStr;
}

export function formatARS(n: number): string {
  try {
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  } catch {
    return `$${n.toFixed(0)}`;
  }
}