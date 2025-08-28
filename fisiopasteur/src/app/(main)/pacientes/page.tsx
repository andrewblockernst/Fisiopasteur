'use client'

import { use, useEffect, useState } from "react";
import { PacientesTable } from "@/componentes/paciente/paciente-listado";
import { getPacientes } from "@/lib/actions/paciente.action";
import type { Tables } from "@/types/database.types";
import Button from "@/componentes/boton";
import SkeletonLoader from "@/componentes/skeleton-loader";
import { NuevoPacienteDialog } from "@/componentes/paciente/nuevo-paciente-dialog";
import { Search, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

type Filter = 'activos' | 'inactivos' | 'todos';
type Paciente = Tables<"paciente">;

export default function PacientePage() {

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [showDialog, setShowDialog] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('activos');
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

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

    const handleReturnMobile = () => {
        router.push('/inicio');
    }

    if (loading) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen">
            
            {/* Header Mobile */}
            <div className="sm:hidden bg-white border-b border-gray-200">
                <div className="flex items-center px-4 py-3">
                    {/* Botón de regreso */}
                    <button 
                        className="mr-3 p-1"
                        onClick={() => {handleReturnMobile()}}
                    >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    
                    {/* Título */}
                    <h1 className="text-lg font-medium text-gray-900 flex-1 text-center mr-9">
                        Pacientes
                    </h1>
                </div>
                
                {/* Campo de búsqueda mobile */}
                <div className="px-4 pb-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                name="search"
                                type="text"
                                placeholder="Buscar"
                                className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-0 focus:bg-white focus:shadow-sm transition-all duration-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                        </div>
                        
                        {/* Dropdown de filtro */}
                        <select
                            name="filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as Filter)}
                            className="bg-[#9C1838] text-white px-3 py-2 rounded-lg text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-[#9C1838] focus:ring-opacity-50"
                        >
                            <option value="activos" className="bg-white text-gray-900">Activos</option>
                            <option value="inactivos" className="bg-white text-gray-900">Inactivos</option>
                            <option value="todos" className="bg-white text-gray-900">Todos</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="sm:container sm:mx-auto sm:p-4 sm:p-6 lg:pr-6 lg:pt-8">
                {/* Desktop Header */}
                <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold">Pacientes</h2>
                </div>
                {/* Filtros y Búsqueda - Solo Desktop */}
                <div className="hidden sm:block bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        
                        {/* Lado izquierdo: Búsqueda y Filtro */}
                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            
                            {/* Campo de búsqueda con ícono */}
                            <div className="relative flex-1 max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    name="search"
                                    type="text"
                                    placeholder="Buscar por nombre o apellido..."
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9C1838] focus:border-[#9C1838] transition-colors duration-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <span className="text-sm">✕</span>
                                    </button>
                                )}
                            </div>

                            {/* Filtro de estado */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <Filter className="h-4 w-4" />
                                    <span className="text-sm font-medium">Estado:</span>
                                </div>
                                <select
                                    name="filter"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value as Filter)}
                                    className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#9C1838] focus:border-[#9C1838] transition-colors duration-200 cursor-pointer"
                                >
                                    <option id="filter-activos" value="activos">Activos</option>
                                    <option id="filter-inactivos" value="inactivos">Inactivos</option>
                                    <option id="filter-todos" value="todos">Todos</option>
                                </select>
                            </div>
                        </div>

                        {/* Lado derecho: Botón Nuevo Paciente */}
                        <div className="flex items-center">
                            <Button 
                                variant="primary"
                                onClick={() => setShowDialog(true)}
                                className="whitespace-nowrap px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200"
                            >
                                Nuevo Paciente
                            </Button>
                        </div>
                    </div>

                    {/* Contador de resultados */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Mostrando {
                                pacientes
                                    .filter(p => {
                                        if (filter === 'activos') return p.activo === true;
                                        if (filter === 'inactivos') return p.activo === false;
                                        return true;
                                    })
                                    .filter(p => {
                                        if (!searchTerm) return true;
                                        return p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                            p.apellido.toLowerCase().includes(searchTerm.toLowerCase());
                                    }).length
                            } de {pacientes.length} pacientes
                            {searchTerm && (
                                <span className="ml-1">
                                    que coinciden con "{searchTerm}"
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <PacientesTable 
                    pacientes={
                        pacientes
                            .filter(p => {
                                // Aplicar filtro de estado
                                if (filter === 'activos') return p.activo === true;
                                if (filter === 'inactivos') return p.activo === false;
                                return true; // 'todos'
                            })
                            .filter(p => {
                                // Aplicar filtro de búsqueda
                                if (!searchTerm) return true;
                                return p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    p.apellido.toLowerCase().includes(searchTerm.toLowerCase());
                            })
                    } 
                    onPacienteDeleted={handleDialogClose}
                    onPacienteUpdated={handleDialogClose}
                />
            </div>

            <NuevoPacienteDialog
                isOpen={showDialog}
                onClose={handleDialogClose}
            />
        </div>
    );
}
