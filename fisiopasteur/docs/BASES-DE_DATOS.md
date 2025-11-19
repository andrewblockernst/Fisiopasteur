# 🌍 Guía de Ambientes: Desarrollo vs Producción

## 📊 Configuración Actual

| Ambiente | Project ID | URL | Uso |
|----------|------------|-----|-----|
| **🔴 Producción** | `qasrvhpdcerymjtvcfed` | https://qasrvhpdcerymjtvcfed.supabase.co | Solo deploy en Vercel |
| **🟢 Desarrollo** | `gtrkgzkxxsxaxafxsvcw` | https://gtrkgzkxxsxaxafxsvcw.supabase.co | Desarrollo local y pruebas |

---

## 🚀 Cómo Trabajar

### **Desarrollo Local**
```bash
# 1. Asegurarte que .env.local existe con credenciales DEV
# 2. Iniciar servidor
npm run dev

# 3. Todos los cambios van a BD de desarrollo
# 4. Puedes "romper" lo que quieras sin consecuencias
```

### **Deploy a Producción**
```bash
# 1. Hacer commit y push
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# 2. Vercel hace deploy automático
# 3. Usa variables de entorno configuradas en Vercel (PRODUCCIÓN)
```

---

## 🔐 Credenciales

- **Desarrollo**: En `.env.local` (no commiteado)
- **Producción**: En Vercel Dashboard → Settings → Environment Variables

---

## ⚠️ IMPORTANTE

- **NUNCA** commitear archivos `.env*`
- **NUNCA** hacer pruebas destructivas en producción
- Siempre probar cambios en desarrollo primero