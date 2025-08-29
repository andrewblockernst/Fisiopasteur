import { Tables } from "@/types/database.types";

type Paciente = Tables<"paciente">;

export default function DatosPaciente({ paciente }: { paciente: Paciente }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-black">
      <div>
        <span className="font-semibold text-black">Nombre:</span> {paciente.nombre + " " + paciente.apellido}
      </div>
      <div>
        <span className="font-semibold text-black">Número:</span> {paciente.telefono}
      </div>
      <div>
        <span className="font-semibold text-black">Dirección:</span> {paciente.direccion}
      </div>
      <div>
        <span className="font-semibold text-black">Fecha de nacimiento:</span> {
          paciente.fecha_nacimiento
            ? paciente.fecha_nacimiento.split('-').reverse().join('/')
            : ""
        }
      </div>
      <div className="col-span-2 ">
        <span className="font-semibold text-black"></span> {paciente.historia_clinica}
      </div>
    </div>
  );
}