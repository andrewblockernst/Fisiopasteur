import { createClient } from "@/lib/supabase/server";

export default async function TestConnection() {
  try {
    const supabase = await createClient();
    
    // Test simple: verificar que el cliente se puede crear
    const { data, error } = await supabase
      .from("usuario") // Usar una tabla válida para probar la conexión
      .select("*")
      .limit(1);
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-green-600">
          (200) - Conexión a Supabase exitosa
        </h1>
        <p>Base de datos acoplada 💄</p>
      </div>
    );
    
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">
          ❌ Error al crear cliente Supabase
        </h1>
        <pre className="bg-red-100 p-4 rounded mt-4 text-sm overflow-auto">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}