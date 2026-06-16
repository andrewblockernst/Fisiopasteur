import { z } from "zod";
import { textoCorto } from "@/lib/validators/common";

export const boxSchema = z.object({
  numero: z
    .number()
    .int("El número del box debe ser entero.")
    .min(1, "El número del box debe ser mayor a 0.")
    .max(99, "El número del box debe ser menor a 100."),
  nombre: textoCorto("nombre del box", 60).min(1, "El nombre del box es obligatorio."),
});

export type BoxInput = z.infer<typeof boxSchema>;
