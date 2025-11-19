# 🎯 Ejemplo de Uso - Componente de Notificaciones por Turno

Este es un ejemplo de cómo integrar el componente `NotificacionesTurno` en la vista de detalle de un turno.

## 📁 Ubicación Sugerida

Puedes agregar este componente en cualquier vista donde muestres detalles de un turno, por ejemplo:
- Modal de detalle de turno
- Página de gestión de turno
- Panel lateral de información

## 🔧 Implementación

### 1. En un Modal de Detalle de Turno

```tsx
// src/componentes/turnos/detalle-turno-modal.tsx
"use client";

import { useState } from 'react';
import BaseDialog from '@/componentes/dialog/base-dialog';
import NotificacionesTurno from '@/componentes/notificacion/notificaciones-turno';
import { formatoNumeroTelefono } from '@/lib/utils';

interface DetalleTurnoModalProps {
  turno: TurnoWithRelations;
  isOpen: boolean;
  onClose: () => void;
}

export default function DetalleTurnoModal({ 
  turno, 
  isOpen, 
  onClose 
}: DetalleTurnoModalProps) {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle del Turno"
      size="lg"
    >
      <div className="space-y-6">
        {/* Información básica del turno */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900">Paciente</h4>
            <p className="text-gray-600">
              {turno.paciente?.nombre} {turno.paciente?.apellido}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Fecha y Hora</h4>
            <p className="text-gray-600">{turno.fecha} - {turno.hora}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Especialista</h4>
            <p className="text-gray-600">
              {turno.especialista?.nombre} {turno.especialista?.apellido}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Teléfono</h4>
            <p className="text-gray-600">
              {turno.paciente?.telefono ? 
                formatoNumeroTelefono(turno.paciente.telefono) : 
                'No registrado'
              }
            </p>
          </div>
        </div>

        {/* Divisor */}
        <hr className="border-gray-200" />

        {/* Notificaciones WhatsApp */}
        <NotificacionesTurno 
          turnoId={turno.id_turno}
          pacienteTelefono={turno.paciente?.telefono}
        />
      </div>
    </BaseDialog>
  );
}
```

### 2. En una Página de Gestión de Turno

```tsx
// src/app/(main)/turnos/[id]/page.tsx
import { obtenerTurno } from '@/lib/actions/turno.action';
import NotificacionesTurno from '@/componentes/notificacion/notificaciones-turno';
import { notFound } from 'next/navigation';

interface TurnoDetailPageProps {
  params: { id: string };
}

export default async function TurnoDetailPage({ params }: TurnoDetailPageProps) {
  const turnoResult = await obtenerTurno(parseInt(params.id));
  
  if (!turnoResult.success || !turnoResult.data) {
    notFound();
  }
  
  const turno = turnoResult.data;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Turno #{turno.id_turno}
          </h1>
          <p className="text-gray-600">
            {turno.paciente?.nombre} {turno.paciente?.apellido} - {turno.fecha} {turno.hora}
          </p>
        </div>

        {/* Layout de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal - Información del turno */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold mb-4">Información del Turno</h2>
              
              {/* Información detallada aquí... */}
              
            </div>
          </div>

          {/* Columna lateral - Notificaciones */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow border p-6">
              <NotificacionesTurno 
                turnoId={turno.id_turno}
                pacienteTelefono={turno.paciente?.telefono}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. En la Tabla de Turnos (Row Expandible)

```tsx
// src/componentes/turnos/turno-expandible-row.tsx
"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import NotificacionesTurno from '@/componentes/notificacion/notificaciones-turno';

interface TurnoExpandibleRowProps {
  turno: TurnoWithRelations;
}

export default function TurnoExpandibleRow({ turno }: TurnoExpandibleRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Fila principal del turno */}
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4">
          {turno.paciente?.nombre} {turno.paciente?.apellido}
        </td>
        <td className="px-6 py-4">{turno.fecha}</td>
        <td className="px-6 py-4">{turno.hora}</td>
        <td className="px-6 py-4">
          {turno.especialista?.nombre} {turno.especialista?.apellido}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {/* Indicador de WhatsApp */}
            {turno.paciente?.telefono && (
              <MessageSquare size={16} className="text-green-600" />
            )}
            
            {/* Botón expandir */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronUp size={16} className="text-gray-600" />
              ) : (
                <ChevronDown size={16} className="text-gray-600" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {/* Fila expandible - Notificaciones */}
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-6 py-4 bg-gray-50">
            <div className="max-w-2xl">
              <NotificacionesTurno 
                turnoId={turno.id_turno}
                pacienteTelefono={turno.paciente?.telefono}
                className="border-0 bg-transparent p-0"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

## 📱 Funcionalidades del Componente

### ✅ Lo que ya funciona:
- **Vista de notificaciones**: Muestra todas las notificaciones del turno
- **Estados visuales**: Pendiente, enviado, fallido con iconos y colores
- **Envío manual**: Botón para enviar mensajes personalizados
- **Carga automática**: Se actualiza automáticamente al enviar mensajes
- **Responsive**: Funciona en mobile y desktop
- **Validaciones**: Solo permite envío si hay teléfono registrado

### 🎨 Personalización

Puedes personalizar la apariencia mediante props:

```tsx
<NotificacionesTurno 
  turnoId={turno.id_turno}
  pacienteTelefono={turno.paciente?.telefono}
  className="border border-gray-200 rounded-lg p-4" // Personalizar estilos
/>
```

## 🔄 Integración con tu Sistema Actual

### 1. Modificar Componentes Existentes

Si ya tienes componentes de turno, simplemente agrega:

```tsx
import NotificacionesTurno from '@/componentes/notificacion/notificaciones-turno';

// Dentro de tu componente existente:
<div className="mt-6">
  <NotificacionesTurno 
    turnoId={turno.id_turno}
    pacienteTelefono={turno.paciente?.telefono}
  />
</div>
```

### 2. Agregar a Modales Existentes

```tsx
// En tu modal actual de turno, después del contenido existente:
{/* ... contenido del turno ... */}

<hr className="my-6" />

<NotificacionesTurno 
  turnoId={turno.id_turno}
  pacienteTelefono={turno.paciente?.telefono}
/>
```

### 3. Mostrar Solo si Hay Teléfono

```tsx
{turno.paciente?.telefono && (
  <NotificacionesTurno 
    turnoId={turno.id_turno}
    pacienteTelefono={turno.paciente.telefono}
  />
)}
```

## 🎯 Estados del Componente

- **Sin teléfono**: Muestra mensaje explicativo
- **Sin notificaciones**: Muestra estado vacío
- **Con notificaciones**: Lista todas las notificaciones
- **Modo envío**: Permite enviar mensajes personalizados
- **Loading**: Muestra indicadores de carga apropiados

## 🚀 Próximos Pasos

1. **Integrar en tus vistas existentes** usando los ejemplos de arriba
2. **Personalizar estilos** según tu diseño
3. **Agregar más funcionalidades** como templates de mensajes
4. **Configurar webhooks** para respuestas automáticas del bot

¡El componente está listo para usar y se integra perfectamente con tu sistema actual! 🎉