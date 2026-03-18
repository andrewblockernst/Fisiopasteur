"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { obtenerPacientes } from "@/lib/actions/turno.action";

interface PacienteAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (paciente: any) => void;
  selectedDisplayValue?: string;
  excludePatientIds?: Array<number | string>;
  minChars?: number;
  limit?: number;
  required?: boolean;
  placeholder?: string;
  showClearButton?: boolean;
  onClear?: () => void;
  showMinCharsHint?: boolean;
  searchingText?: string;
  noResultsText?: string;
  minCharsText?: string;
  containerClassName?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  helperTextClassName?: string;
  optionClassName?: string;
  activeOptionClassName?: string;
  renderOption?: (paciente: any) => ReactNode;
}

export default function PacienteAutocomplete({
  value,
  onChange,
  onSelect,
  selectedDisplayValue,
  excludePatientIds = [],
  minChars = 2,
  limit = 10,
  required = false,
  placeholder = "Buscar paciente...",
  showClearButton = false,
  onClear,
  showMinCharsHint = true,
  searchingText = "Buscando pacientes...",
  noResultsText = "No se encontraron pacientes",
  minCharsText,
  containerClassName = "relative",
  inputClassName = "w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent",
  dropdownClassName = "absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto",
  helperTextClassName = "text-xs text-gray-500 mt-1",
  optionClassName = "px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0",
  activeOptionClassName = "bg-gray-100",
  renderOption,
}: PacienteAutocompleteProps) {
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState<number>(-1);
  const [selectedLabelInterno, setSelectedLabelInterno] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sugerenciasFiltradas = useMemo(() => {
    if (!Array.isArray(excludePatientIds) || excludePatientIds.length === 0) {
      return sugerencias;
    }

    return sugerencias.filter((paciente) => {
      const idPaciente = String(paciente.id_paciente);
      return !excludePatientIds.some((id) => String(id) === idPaciente);
    });
  }, [sugerencias, excludePatientIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMostrarLista(false);
        setIndiceActivo(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const termino = value.trim();
    const valorSeleccionado = (selectedDisplayValue || selectedLabelInterno || "").trim();

    if (valorSeleccionado && termino.toLowerCase() === valorSeleccionado.toLowerCase()) {
      setBuscando(false);
      setMostrarLista(false);
      setIndiceActivo(-1);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return;
    }

    if (termino.length < minChars) {
      setSugerencias([]);
      setBuscando(false);
      setMostrarLista(false);
      setIndiceActivo(-1);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setBuscando(true);
    setMostrarLista(true);
    setIndiceActivo(-1);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const resultado = await obtenerPacientes(termino, limit);
        if (resultado.success && resultado.data) {
          setSugerencias(resultado.data);
        } else {
          setSugerencias([]);
        }
      } catch (error) {
        console.error("Error buscando pacientes:", error);
        setSugerencias([]);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, minChars, limit, selectedDisplayValue, selectedLabelInterno]);

  const seleccionar = (paciente: any) => {
    setSelectedLabelInterno(`${paciente.nombre} ${paciente.apellido}`.trim());
    onSelect(paciente);
    setMostrarLista(false);
    setIndiceActivo(-1);
    setSugerencias([]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!mostrarLista || sugerenciasFiltradas.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndiceActivo((prev) => {
        if (prev < sugerenciasFiltradas.length - 1) {
          return prev + 1;
        }
        return prev;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndiceActivo((prev) => {
        if (prev <= 0) {
          inputRef.current?.focus();
          return -1;
        }
        return prev - 1;
      });
      return;
    }

    if (event.key === "Enter" && indiceActivo >= 0) {
      event.preventDefault();
      seleccionar(sugerenciasFiltradas[indiceActivo]);
      return;
    }

    if (event.key === "Escape") {
      setMostrarLista(false);
      setIndiceActivo(-1);
    }
  };

  const textoMinimo = minCharsText || `Escribe al menos ${minChars} caracteres para buscar`;

  return (
    <div ref={containerRef} className={containerClassName}>
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            const nuevoValor = e.target.value;
            const valorSeleccionado = (selectedDisplayValue || selectedLabelInterno || "").trim();
            if (valorSeleccionado && nuevoValor.trim().toLowerCase() !== valorSeleccionado.toLowerCase()) {
              setSelectedLabelInterno("");
            }
            onChange(nuevoValor);
          }}
          onFocus={() => {
            if (value.trim().length >= minChars && (sugerenciasFiltradas.length > 0 || buscando)) {
              setMostrarLista(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
          required={required}
          autoComplete="off"
        />
        {showClearButton && value && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (onClear) {
                onClear();
              } else {
                onChange("");
              }
              setSugerencias([]);
              setMostrarLista(false);
              setIndiceActivo(-1);
              setSelectedLabelInterno("");
            }}
            className="absolute right-1.5 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {mostrarLista && buscando && (
        <div className={dropdownClassName}>
          <div className="px-3 py-2 text-sm text-gray-500">{searchingText}</div>
        </div>
      )}

      {mostrarLista && !buscando && sugerenciasFiltradas.length > 0 && (
        <div className={dropdownClassName} role="listbox">
          {sugerenciasFiltradas.map((paciente, index) => (
            <button
              key={paciente.id_paciente}
              type="button"
              role="option"
              aria-selected={indiceActivo === index}
              onMouseEnter={() => setIndiceActivo(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => seleccionar(paciente)}
              className={`w-full text-left ${optionClassName} ${indiceActivo === index ? activeOptionClassName : ""}`}
            >
              {renderOption ? (
                renderOption(paciente)
              ) : (
                <>
                  <div className="text-sm font-medium">{paciente.nombre} {paciente.apellido}</div>
                  <div className="text-xs text-gray-500">DNI: {paciente.dni || "-"}</div>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {mostrarLista && !buscando && value.trim().length >= minChars && sugerenciasFiltradas.length === 0 && (
        <div className={dropdownClassName}>
          <div className="px-3 py-2 text-sm text-gray-500">{noResultsText}</div>
        </div>
      )}

      {showMinCharsHint && value.trim().length > 0 && value.trim().length < minChars && (
        <div className={helperTextClassName}>{textoMinimo}</div>
      )}
    </div>
  );
}
