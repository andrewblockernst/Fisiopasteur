// Script de prueba para verificar el cálculo de recordatorios

// Simular un turno para las 22:45 de hoy
const ahora = new Date();
const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
const hora = "22:45:00";

console.log('=== PRUEBA DE CÁLCULO DE RECORDATORIOS ===');
console.log(`Fecha del turno: ${fecha}`);
console.log(`Hora del turno: ${hora}`);
console.log(`Hora actual: ${ahora.toISOString()}`);
console.log('');

// Crear fecha/hora del turno
const fechaTurno = new Date(`${fecha} ${hora}`);
console.log(`Fecha/hora completa del turno: ${fechaTurno.toISOString()}`);
console.log('');

// Opciones de recordatorio
const OPCIONES_RECORDATORIO = {
  '1h': { label: '1 hora antes', minutos: 60 },
  '2h': { label: '2 horas antes', minutos: 120 },
  '1d': { label: '1 día antes', minutos: 1440 }
};

// Calcular recordatorios
console.log('=== CÁLCULO DE RECORDATORIOS ===');
for (const [tipo, opcion] of Object.entries(OPCIONES_RECORDATORIO)) {
  const tiempoRecordatorio = new Date(fechaTurno.getTime() - (opcion.minutos * 60 * 1000));
  const esValido = tiempoRecordatorio > ahora;
  
  console.log(`${opcion.label} (${tipo}):`);
  console.log(`  Fecha programada: ${tiempoRecordatorio.toISOString()}`);
  console.log(`  ¿Es válido? (futuro): ${esValido}`);
  console.log(`  Diferencia con ahora: ${Math.floor((tiempoRecordatorio - ahora) / 60000)} minutos`);
  console.log('');
}
