import { Tables } from "@/types/database.types";

type Paciente = {
  id_paciente: number;
  nombre: string;
  apellido: string;
  email: string;
  direccion: string;
  fecha_nacimiento: Date;
  historia_clinica: string;
};

export default function DatosPaciente({ paciente }: { paciente: Paciente }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <span className="font-semibold">Nombre:</span> {paciente.nombre + " " + paciente.apellido}
      </div>
      <div>
        <span className="font-semibold">Email:</span> {paciente.email}
      </div>
      <div>
        <span className="font-semibold">Dirección:</span> {paciente.direccion}
      </div>
      <div>
        <span className="font-semibold">Fecha de nacimiento:</span> {paciente.fecha_nacimiento}
      </div>
      <div className="col-span-2">
        <span className="font-semibold"></span> {paciente.historia_clinica}
      </div>
    </div>
  );
}