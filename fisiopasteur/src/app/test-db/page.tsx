import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";

export default async function TestDB() {
  const supabase = await createClient();

  // Prueba de lectura
  const { data: usuarios, error } = await supabase
    .from("usuario")
    .select("*")
    .limit(5);

  if (error) {
    console.error("Error:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">
          Error conectando a la base de datos
        </h1>
        <pre className="bg-red-100 p-4 rounded">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Conexión a Supabase exitosa ✅
      </h1>
      <div className="bg-green-100 p-4 rounded mb-4">
        <p className="text-green-800">Base de datos conectada correctamente</p>
      </div>

      <h2 className="text-xl font-semibold mb-2">
        Usuarios en la base de datos:
      </h2>
      {usuarios && usuarios.length > 0 ? (
        <div className="grid gap-4">
          {usuarios.map(
            (usuario: Database["public"]["Tables"]["usuario"]["Row"]) => (
              <div key={usuario.id_usuario} className="border p-4 rounded">
                <p>
                  <strong>Nombre:</strong> {usuario.nombre} {usuario.apellido}
                </p>

                <p>
                  <strong>Email:</strong> {usuario.email || "No especificado"}
                </p>
              </div>
            )
          )}
        </div>
      ) : (
        <p className="text-gray-600">No hay pacientes registrados</p>
      )}
    </div>
  );
}
