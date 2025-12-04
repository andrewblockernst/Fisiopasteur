-- Agregar columna nombre a la tabla box
ALTER TABLE "public"."box" 
ADD COLUMN IF NOT EXISTS "nombre" TEXT;

-- Actualizar los boxes de Fisiopasteur con los nombres correspondientes
-- Primero necesitamos obtener el id_organizacion de Fisiopasteur
-- Asumiendo que la organización se llama "Fisiopasteur"

DO $$
DECLARE
  fisiopasteur_org_id UUID;
BEGIN
  -- Obtener el ID de la organización Fisiopasteur
  SELECT id_organizacion INTO fisiopasteur_org_id
  FROM organizacion
  WHERE nombre = 'Fisiopasteur'
  LIMIT 1;

  -- Si existe la organización, actualizar los boxes
  IF fisiopasteur_org_id IS NOT NULL THEN
    UPDATE "public"."box"
    SET nombre = CASE numero
      WHEN 1 THEN 'RPG'
      WHEN 2 THEN 'KINESIO'
      WHEN 3 THEN 'FISIO'
      WHEN 4 THEN 'QUIRO'
      WHEN 5 THEN 'ABAJO'
      WHEN 6 THEN 'PILATES'
      WHEN 7 THEN 'DOMICILIO'
      ELSE 'Box ' || numero
    END
    WHERE id_organizacion = fisiopasteur_org_id
    AND numero IN (1, 2, 3, 4, 5, 6, 7);
  END IF;
END $$;

-- Para otros boxes sin nombre, usar un valor por defecto
UPDATE "public"."box"
SET nombre = 'Box ' || numero
WHERE nombre IS NULL OR nombre = '';

-- Hacer que el campo nombre sea NOT NULL después de llenar los valores
ALTER TABLE "public"."box" 
ALTER COLUMN "nombre" SET NOT NULL;

-- Agregar comentario a la columna
COMMENT ON COLUMN "public"."box"."nombre" IS 'Nombre descriptivo del box/consultorio';
