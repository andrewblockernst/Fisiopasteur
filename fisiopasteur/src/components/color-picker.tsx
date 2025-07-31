"use client";

import { useState } from "react";
import Button from "@/components/button"

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export default function ColorPicker({ value = "#3B82F6", onChange, disabled = false }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);

  const presetColors = [
    "#9C1838", // Red
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#F97316", // Orange
    "#6B7280", // Gray
    "#1F2937", // Dark Gray
    "#7C3AED", // Violet
    "#059669", // Emerald
  ];

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className="relative">
      {/* Color display button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center px-3 disabled:opacity-50"
      >
        <div
          className="w-6 h-6 rounded border border-gray-300 mr-3"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm font-mono">{value}</span>
      </button>

      {/* Color picker dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 z-50 w-max">
          {/* Preset colors */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Colores predefinidos
            </label>
            <div className="grid grid-cols-6 gap-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                    value === color ? "border-gray-900" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Custom color input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color personalizado
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-8 h-8 cursor-pointer "
                style={{ aspectRatio: "1 / 1" }}
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                placeholder="#000000"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          {/* Close button */}
          {/* <Button

          /> */}
          
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
          >
            Cerrar
          </button>
          <button
                type="button"
                onClick={() => handleColorSelect(customColor)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Usar
              </button>
        </div>
      )}
    </div>
  );
}