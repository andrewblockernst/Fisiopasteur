// src/app/test-connection/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function TestConnection() {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("usuario")
      .select("count")
      .limit(1);
    
    if (error) throw error;
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-green-600">
          ✅ Conexión exitosa a Supabase
        </h1>
        <p>La base de datos está conectada correctamente</p>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">
          ❌ Error de conexión
        </h1>
        <pre className="bg-red-100 p-4 rounded mt-4">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}