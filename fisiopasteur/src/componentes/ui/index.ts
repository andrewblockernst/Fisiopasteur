/**
 * Catálogo UI de Fisiopasteur — punto único de import para componentes atómicos.
 *
 * Convención:
 *   import { Button, Input, FormField } from "@/componentes/ui";
 *
 * Si el componente requiere muchos sub-imports (ej. Card.*, Select.*), también
 * podés importarlo directo desde su archivo para mejor tree-shaking en bundles
 * que no soportan side-effects-free barrel.
 */

export * from "./badge";
export * from "./button";
export * from "./card";
export * from "./checkbox";
export * from "./date-input";
export * from "./empty-state";
export * from "./form";
export * from "./input";
export * from "./label";
export * from "./page-header";
export * from "./radio-group";
export * from "./select";
export * from "./skeleton";
export * from "./switch";
export * from "./textarea";
