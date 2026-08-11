/**
 * Re-export del archivo canónico de tipos generados por Supabase.
 *
 * La fuente de verdad es `src/lib/database.types.ts`, que es la que
 * `npm run types:generate` regenera. Este archivo existe solo para no
 * romper imports históricos desde `@/types/database.types`.
 *
 * Nuevo código: preferir importar desde `@/lib/database.types` directamente
 * o desde `@/types` (index barrel).
 */
export * from '@/lib/database.types';
