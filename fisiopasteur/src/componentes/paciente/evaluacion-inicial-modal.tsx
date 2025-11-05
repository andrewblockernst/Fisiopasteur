"use client";

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { obtenerEvaluacionInicial, guardarEvaluacionInicial } from "@/lib/actions/evaluacionInicial.action";
import { useToastStore } from "@/stores/toast-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { Loader2 } from "lucide-react";

interface EvaluacionInicialModalProps {
  isOpen: boolean;
  onClose: () => void;
  idGrupo: string;
  paciente: {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    direccion: string;
    fecha_nacimiento: string;
  };
}

interface EvaluacionData {
  obra_social?: string;
  numero_afiliado?: string;
  medico_actual?: string;
  trabajo_actual?: string;
  trabajo_anterior?: boolean;
  trabajo_anterior_cual?: string;
  realiza_deportes?: boolean;
  deporte_cual?: string;
  tiempo_con_dolor?: string;
  momento_mas_dolor?: string;
  traumatismo?: boolean;
  traumatismo_descripcion?: string;
  tratamiento_fk_anterior?: boolean;
  antecedentes_familiares?: boolean;
  antecedentes_familiares_quien?: string;
  toma_medicamentos?: string;
  diagnostico_rx?: boolean;
  diagnostico_rm?: boolean;
  diagnostico_tac?: boolean;
  diagnostico_eco?: boolean;
  diagnostico_observaciones?: string;
  cirugias?: string;
  otras_afecciones?: string;
  embarazada?: boolean;
  menopausia?: boolean;
  diu?: boolean;
  ta?: string;
  artritis?: boolean;
  fuma?: boolean;
  toma_alcohol?: boolean;
  dbt?: boolean;
  fracturas?: string;
  objetivos_tratamiento?: string;
  diagrama_dolor?: Array<{ zona: string; tipo: string; intensidad: number }>;
}

export function EvaluacionInicialModal({
  isOpen,
  onClose,
  idGrupo,
  paciente
}: EvaluacionInicialModalProps) {
  const { addToast } = useToastStore();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tabActual, setTabActual] = useState("datos-basicos");
  
  const [formData, setFormData] = useState<EvaluacionData>({});

  // Cargar datos existentes al abrir
  useEffect(() => {
    if (isOpen) {
      cargarEvaluacion();
    }
  }, [isOpen, idGrupo]);

  const cargarEvaluacion = async () => {
    setCargando(true);
    const resultado = await obtenerEvaluacionInicial(idGrupo);
    
    if (resultado.success && resultado.data) {
      setFormData(resultado.data);
    }
    
    setCargando(false);
  };

  const handleChange = (field: keyof EvaluacionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    
    const resultado = await guardarEvaluacionInicial(idGrupo, formData);
    
    if (resultado.success) {
      addToast({
        variant: "success",
        message: "Evaluación guardada",
        description: "La evaluación inicial se guardó correctamente"
      });
      onClose();
    } else {
      addToast({
        variant: "error",
        message: "Error al guardar",
        description: resultado.error || "No se pudo guardar la evaluación"
      });
    }
    
    setGuardando(false);
  };

  return (
    <BaseDialog
      type="custom"
      size="xl"
      title="Evaluación Inicial del Tratamiento"
      message=""
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton
    >
      <div className="max-h-[70vh] overflow-y-auto text-gray-900 [&_input]:text-gray-900 [&_textarea]:text-gray-900 [&_label]:text-gray-900 [&_span]:text-gray-900">
        {cargando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#9C1838]" />
          </div>
        ) : (
          <Tabs value={tabActual} onValueChange={setTabActual} className="text-gray-900">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="datos-basicos">Datos Básicos</TabsTrigger>
              <TabsTrigger value="historia-clinica">Historia Clínica</TabsTrigger>
              <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
              <TabsTrigger value="objetivos">Objetivos y Dolor</TabsTrigger>
            </TabsList>

            {/* TAB 1: Datos Básicos */}
            <TabsContent value="datos-basicos" className="space-y-4">
              {/* Datos del paciente (solo lectura) */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-gray-700 mb-3">Datos del Paciente</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Nombre:</span> {paciente.nombre} {paciente.apellido}
                  </div>
                  <div>
                    <span className="font-medium">DNI:</span> {paciente.dni}
                  </div>
                  <div>
                    <span className="font-medium">Fecha de Nacimiento:</span> {paciente.fecha_nacimiento}
                  </div>
                  <div>
                    <span className="font-medium">Teléfono:</span> {paciente.telefono}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Dirección:</span> {paciente.direccion}
                  </div>
                </div>
              </div>

              {/* Datos editables */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obra Social
                  </label>
                  <input
                    type="text"
                    value={formData.obra_social || ''}
                    onChange={(e) => handleChange('obra_social', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ej: OSDE, Swiss Medical, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    N° de Afiliado
                  </label>
                  <input
                    type="text"
                    value={formData.numero_afiliado || ''}
                    onChange={(e) => handleChange('numero_afiliado', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Número de afiliado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Médico Actual
                  </label>
                  <input
                    type="text"
                    value={formData.medico_actual || ''}
                    onChange={(e) => handleChange('medico_actual', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Nombre del médico tratante"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trabajo Actual
                  </label>
                  <input
                    type="text"
                    value={formData.trabajo_actual || ''}
                    onChange={(e) => handleChange('trabajo_actual', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ocupación actual"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Historia Clínica */}
            <TabsContent value="historia-clinica" className="space-y-4">
              {/* Trabajo Anterior */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.trabajo_anterior || false}
                    onChange={(e) => handleChange('trabajo_anterior', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Trabajo anterior</span>
                </label>
                {formData.trabajo_anterior && (
                  <input
                    type="text"
                    value={formData.trabajo_anterior_cual || ''}
                    onChange={(e) => handleChange('trabajo_anterior_cual', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="¿Cuál?"
                  />
                )}
              </div>

              {/* Deportes */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.realiza_deportes || false}
                    onChange={(e) => handleChange('realiza_deportes', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Realiza deportes</span>
                </label>
                {formData.realiza_deportes && (
                  <input
                    type="text"
                    value={formData.deporte_cual || ''}
                    onChange={(e) => handleChange('deporte_cual', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="¿Cuál?"
                  />
                )}
              </div>

              {/* Tiempo con dolor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Cuánto tiempo lleva con dolor?
                </label>
                <input
                  type="text"
                  value={formData.tiempo_con_dolor || ''}
                  onChange={(e) => handleChange('tiempo_con_dolor', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ej: 3 meses, 1 año, etc."
                />
              </div>

              {/* Momento de más dolor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿En qué momento duele más?
                </label>
                <input
                  type="text"
                  value={formData.momento_mas_dolor || ''}
                  onChange={(e) => handleChange('momento_mas_dolor', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ej: Al levantarse, al caminar, etc."
                />
              </div>

              {/* Traumatismo */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.traumatismo || false}
                    onChange={(e) => handleChange('traumatismo', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Sufrió algún traumatismo</span>
                </label>
                {formData.traumatismo && (
                  <div className="ml-6 space-y-2">
                    <label className="block text-xs text-gray-600">Comenzó:</label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1">
                        <input type="radio" name="traumatismo_momento" className="w-3 h-3" />
                        <span className="text-sm">Gradualmente</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" name="traumatismo_momento" className="w-3 h-3" />
                        <span className="text-sm">De repente</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" name="traumatismo_momento" className="w-3 h-3" />
                        <span className="text-sm">Al hacer fuerza</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Tratamiento FK anterior */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.tratamiento_fk_anterior || false}
                  onChange={(e) => handleChange('tratamiento_fk_anterior', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Realizó tratamiento de fisioterapia anteriormente</span>
              </label>

              {/* Antecedentes familiares */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.antecedentes_familiares || false}
                    onChange={(e) => handleChange('antecedentes_familiares', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Antecedentes familiares del mismo tipo de dolor</span>
                </label>
                {formData.antecedentes_familiares && (
                  <input
                    type="text"
                    value={formData.antecedentes_familiares_quien || ''}
                    onChange={(e) => handleChange('antecedentes_familiares_quien', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="¿Quién?"
                  />
                )}
              </div>

              {/* Medicamentos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Toma medicamentos?
                </label>
                <input
                  type="text"
                  value={formData.toma_medicamentos || ''}
                  onChange={(e) => handleChange('toma_medicamentos', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Listar medicamentos"
                />
              </div>
            </TabsContent>

            {/* TAB 3: Diagnóstico */}
            <TabsContent value="diagnostico" className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnóstico por imágenes
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.diagnostico_rx || false}
                      onChange={(e) => handleChange('diagnostico_rx', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">RX (Radiografía)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.diagnostico_rm || false}
                      onChange={(e) => handleChange('diagnostico_rm', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">RM (Resonancia Magnética)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.diagnostico_tac || false}
                      onChange={(e) => handleChange('diagnostico_tac', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">TAC (Tomografía)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.diagnostico_eco || false}
                      onChange={(e) => handleChange('diagnostico_eco', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">ECO (Ecografía)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Se observa
                </label>
                <textarea
                  value={formData.diagnostico_observaciones || ''}
                  onChange={(e) => handleChange('diagnostico_observaciones', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Observaciones del diagnóstico por imágenes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cirugías
                </label>
                <textarea
                  value={formData.cirugias || ''}
                  onChange={(e) => handleChange('cirugias', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Detallar cirugías previas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antecedentes de otras afecciones
                </label>
                <textarea
                  value={formData.otras_afecciones || ''}
                  onChange={(e) => handleChange('otras_afecciones', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Ej: Hipertensión, diabetes, etc."
                />
              </div>

              {/* Condiciones específicas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">T/A (Tensión Arterial)</label>
                  <input
                    type="text"
                    value={formData.ta || ''}
                    onChange={(e) => handleChange('ta', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Ej: 120/80"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.artritis || false}
                      onChange={(e) => handleChange('artritis', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Artritis</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.fuma || false}
                      onChange={(e) => handleChange('fuma', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Fuma</span>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.toma_alcohol || false}
                      onChange={(e) => handleChange('toma_alcohol', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Toma alcohol</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.dbt || false}
                      onChange={(e) => handleChange('dbt', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">DBT (Diabetes)</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fracturas</label>
                  <input
                    type="text"
                    value={formData.fracturas || ''}
                    onChange={(e) => handleChange('fracturas', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Detallar fracturas"
                  />
                </div>
              </div>

              {/* Para mujeres */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Para mujeres</p>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.embarazada || false}
                      onChange={(e) => handleChange('embarazada', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Embarazada</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.menopausia || false}
                      onChange={(e) => handleChange('menopausia', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Menopausia</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.diu || false}
                      onChange={(e) => handleChange('diu', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">DIU</span>
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Objetivos y Dolor */}
            <TabsContent value="objetivos" className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivos del Tratamiento
                </label>
                <textarea
                  value={formData.objetivos_tratamiento || ''}
                  onChange={(e) => handleChange('objetivos_tratamiento', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={5}
                  placeholder="Describir los objetivos que se esperan alcanzar con el tratamiento..."
                />
              </div>

              {/* TODO: Diagrama corporal interactivo */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Diagrama Corporal (Próximamente)</p>
                <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-500">
                  <p className="text-sm">Funcionalidad en desarrollo</p>
                  <p className="text-xs mt-1">Por ahora, describe las zonas de dolor en "Objetivos del Tratamiento"</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="px-4 py-2 bg-[#9C1838] text-white rounded-lg hover:bg-[#7d1429] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar Evaluación
        </button>
      </div>
    </BaseDialog>
  );
}