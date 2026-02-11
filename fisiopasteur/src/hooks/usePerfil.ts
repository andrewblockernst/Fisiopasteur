// ✅ Re-exportar desde AuthContext para mantener compatibilidad con código existente
// Ahora la lógica de autenticación está centralizada en AuthContext.tsx

export { useAuth, type Usuario, type AuthState } from './AuthContext';
