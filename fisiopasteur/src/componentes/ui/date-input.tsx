"use client";

import { forwardRef, useEffect, useState, type InputHTMLAttributes } from "react";

/**
 * `<DateInput>` — drop-in replacement de `<input type="date">` que evita un bug
 * común de inputs controlados:
 *
 * Cuando un input `type="date"` ya tiene `mm/dd` cargados y el usuario edita el
 * año dígito por dígito, el browser dispara `onChange` con valores intermedios
 * como `0001-mm-dd`, `0019-mm-dd`, etc. Si el handler del padre convierte ese
 * string a `Date` (o lo guarda como fecha "válida") y vuelve a escribir el
 * valor en el input controlado, el cursor / focus se reinicia y el usuario no
 * puede terminar de tipear el año.
 *
 * `DateInput` mantiene un buffer string local con lo que el usuario ve, y SÓLO
 * llama a `onChange(value)` cuando el valor tiene la forma `YYYY-MM-DD` con año
 * de 4 dígitos ≥ 1000. Mientras el usuario tipea dígitos parciales, el padre
 * no se entera y el input no se re-renderiza.
 *
 * Props: idénticas a `<input type="date">` excepto `onChange`, que recibe
 * directamente el `string` (no el evento).
 */

interface DateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value" | "defaultValue"> {
  value?: string | null;
  onChange?: (value: string) => void;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { value, onChange, ...rest },
  ref,
) {
  const [raw, setRaw] = useState<string>(value ?? "");

  // Sincronizar buffer con value externo cuando cambia (ej: pre-selección al abrir modal).
  useEffect(() => {
    setRaw(value ?? "");
  }, [value]);

  return (
    <input
      ref={ref}
      type="date"
      value={raw}
      onChange={(e) => {
        const v = e.target.value;
        setRaw(v);
        if (!v) {
          onChange?.("");
          return;
        }
        const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return;
        if (Number(m[1]) < 1000) return;
        onChange?.(v);
      }}
      {...rest}
    />
  );
});

export default DateInput;
