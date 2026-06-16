/**
 * Hace scroll suave hasta el primer campo con error visible en pantalla.
 *
 * Estrategia de búsqueda en orden:
 *   1. `[name="<fieldName>"]` (inputs nativos / react-hook-form)
 *   2. `#<fieldName>` (id directo)
 *   3. `[data-field="<fieldName>"]` (wrapper marcado a mano)
 *
 * Una vez encontrado, hace `scrollIntoView({ block: "center" })` y
 * `focus()` para que el campo quede visible y, si es focusable, el cursor
 * vaya ahí.
 *
 * El scroll se realiza sobre el ancestro scrollable más cercano (típicamente
 * `.dialog-body` dentro de BaseDialog), de modo que el resto de la página
 * no se mueve.
 */
export function scrollToFirstError(fieldNames: string[]): void {
  if (typeof document === "undefined") return;
  if (fieldNames.length === 0) return;

  const lookup = (name: string): HTMLElement | null => {
    const escaped = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(name) : name;
    return (
      (document.querySelector(`[name="${escaped}"]`) as HTMLElement | null) ||
      (document.getElementById(name) as HTMLElement | null) ||
      (document.querySelector(`[data-field="${escaped}"]`) as HTMLElement | null)
    );
  };

  for (const name of fieldNames) {
    const el = lookup(name);
    if (el) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        el.scrollIntoView();
      }
      // Demoramos el focus para no pelearnos con el smooth scroll en algunos
      // navegadores (Safari mueve el viewport bruscamente al hacer focus).
      window.setTimeout(() => {
        if (typeof (el as HTMLInputElement).focus === "function") {
          try {
            (el as HTMLInputElement).focus({ preventScroll: true });
          } catch {
            (el as HTMLInputElement).focus();
          }
        }
      }, 250);
      return;
    }
  }
}
