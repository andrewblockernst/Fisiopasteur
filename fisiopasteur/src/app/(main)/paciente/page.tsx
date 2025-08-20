'use client'

import { useEffect, useState } from "react";
import { PacientesTable } from "@/componentes/paciente/paciente-listado";
import { getPacientes } from "@/lib/actions/paciente.action";
import type { Tables } from "@/types/database.types";
import Button from "@/componentes/boton";
import SkeletonLoader from "@/componentes/skeleton-loader";


type Paciente = Tables<"paciente">;

export default function PacientePage() {

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [showDialog, setShowDialog] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try{
                const pacientesData = await getPacientes();
                setPacientes(pacientesData.data);
            } catch (error) {
                console.error("Error al cargar los pacientes:", error);
            } 
            finally {
                setTimeout(() => setLoading(false), 300);
            }
        }

        loadData();
    }, []);

    const handleDialogClose = async () => {
        setShowDialog(false);
        // Recargar la lista de pacientes después de crear uno nuevo
        try {
            const updatedPacientes = await getPacientes();
            setPacientes(updatedPacientes.data);
        } catch (error) {
            console.error("Error reloading patients:", error);
        }
    };

    if (loading) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen">

            {/* Contenido Principal */}
            <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
                {/* Desktop Header */}
                <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold">Pacientes</h2>
                <Button 
                    variant="primary"
                    // onClick={() => setShowDialog(true)}
                    className="w-full sm:w-auto"
                >
                    Nuevo Paciente
                </Button>
                </div>

                <PacientesTable pacientes={pacientes} />
            </div>
        </div>
    );
}
