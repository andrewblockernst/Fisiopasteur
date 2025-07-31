import { getEspecialidades } from "@/lib/actions/especialista.action";
import EspecialistaForm from "@/components/especialista/especialista-form";

export default async function NuevoEspecialistaPage() {
  const especialidades = await getEspecialidades();

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Especialista</h1>
          <p className="text-gray-600">Completa la información para crear un nuevo especialista</p>
        </div>
        
        <EspecialistaForm 
          especialidades={especialidades}
          mode="create"
        />
      </div>
    </div>
  );
}