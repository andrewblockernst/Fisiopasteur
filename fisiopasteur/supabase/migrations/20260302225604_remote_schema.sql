create extension if not exists "pg_trgm" with schema "extensions";

create extension if not exists "pgjwt" with schema "extensions";

drop extension if exists "pg_net";

create sequence "public"."box_id_box_seq";

create sequence "public"."especialidad_id_especialidad_seq";

create sequence "public"."evolucion_clinica_id_evolucion_seq";

create sequence "public"."notificacion_id_notificacion_seq";

create sequence "public"."paciente_id_paciente_seq";

create sequence "public"."turno_id_turno_seq";

create sequence "public"."usuario_especialidad_id_usuario_especialidad_seq";


  create table "public"."box" (
    "id_box" integer not null default nextval('public.box_id_box_seq'::regclass),
    "numero" integer not null,
    "estado" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "id_organizacion" uuid not null,
    "nombre" text not null
      );



  create table "public"."especialidad" (
    "id_especialidad" integer not null default nextval('public.especialidad_id_especialidad_seq'::regclass),
    "nombre" text not null,
    "id_organizacion" uuid not null
      );



  create table "public"."evaluacion_inicial" (
    "id_evaluacion" uuid not null default extensions.uuid_generate_v4(),
    "id_grupo" uuid not null,
    "id_organizacion" uuid not null,
    "obra_social" text,
    "numero_afiliado" text,
    "medico_actual" text,
    "trabajo_actual" text,
    "trabajo_anterior" boolean default false,
    "trabajo_anterior_cual" text,
    "realiza_deportes" boolean default false,
    "deporte_cual" text,
    "tiempo_con_dolor" text,
    "momento_mas_dolor" text,
    "traumatismo" boolean default false,
    "traumatismo_descripcion" text,
    "tratamiento_fk_anterior" boolean default false,
    "antecedentes_familiares" boolean default false,
    "antecedentes_familiares_quien" text,
    "toma_medicamentos" text,
    "diagnostico_rx" boolean default false,
    "diagnostico_rm" boolean default false,
    "diagnostico_tac" boolean default false,
    "diagnostico_eco" boolean default false,
    "diagnostico_observaciones" text,
    "cirugias" text,
    "otras_afecciones" text,
    "embarazada" boolean default false,
    "menopausia" boolean default false,
    "diu" boolean default false,
    "ta" text,
    "artritis" boolean default false,
    "fuma" boolean default false,
    "toma_alcohol" boolean default false,
    "dbt" boolean default false,
    "fracturas" text,
    "objetivos_tratamiento" text,
    "diagrama_dolor" jsonb default '[]'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."evolucion_clinica" (
    "id_evolucion" integer not null default nextval('public.evolucion_clinica_id_evolucion_seq'::regclass),
    "observaciones" text,
    "id_turno" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "id_organizacion" uuid not null
      );



  create table "public"."grupo_tratamiento" (
    "id_grupo" uuid not null default gen_random_uuid(),
    "nombre" text not null,
    "id_paciente" integer not null,
    "id_especialista" uuid not null,
    "id_especialidad" integer,
    "id_organizacion" uuid not null,
    "fecha_inicio" date not null,
    "tipo_plan" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."grupo_tratamiento" enable row level security;


  create table "public"."notificacion" (
    "id_notificacion" integer not null default nextval('public.notificacion_id_notificacion_seq'::regclass),
    "id_turno" integer,
    "fecha_envio" timestamp with time zone default now(),
    "medio" text not null,
    "mensaje" text not null,
    "estado" text default 'PENDIENTE'::text,
    "telefono" character varying(20),
    "fecha_programada" timestamp without time zone,
    "id_organizacion" uuid not null
      );



  create table "public"."organizacion" (
    "id_organizacion" uuid not null default gen_random_uuid(),
    "nombre" text not null,
    "cuit_cuil" text,
    "telefono_contacto" text,
    "email_contacto" text,
    "direccion" text,
    "created_at" timestamp with time zone not null default now(),
    "activo" boolean not null default true,
    "logo_url" text,
    "color_primario" text,
    "color_secundario" text,
    "color_acento" text,
    "fuente_primaria" text,
    "favicon_url" text
      );



  create table "public"."paciente" (
    "id_paciente" integer not null default nextval('public.paciente_id_paciente_seq'::regclass),
    "nombre" text not null,
    "apellido" text not null,
    "dni" text,
    "fecha_nacimiento" date,
    "telefono" text not null,
    "email" text,
    "direccion" text,
    "edad" integer,
    "historia_clinica" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "activo" boolean not null default true,
    "id_organizacion" uuid not null
      );



  create table "public"."rol" (
    "id" integer not null,
    "nombre" character varying(50) not null,
    "jerarquia" integer not null
      );



  create table "public"."turno" (
    "id_turno" integer not null default nextval('public.turno_id_turno_seq'::regclass),
    "fecha" date not null,
    "hora" time without time zone not null,
    "id_paciente" integer,
    "id_especialista" uuid,
    "id_box" integer,
    "precio" numeric(8,2),
    "estado" text default 'PROGRAMADO'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "notas" text,
    "observaciones" text,
    "id_especialidad" integer,
    "tipo_plan" character varying(50),
    "dificultad" character varying(20),
    "id_organizacion" uuid not null,
    "id_grupo_tratamiento" uuid,
    "evolucion_clinica" text,
    "evolucion_completada_en" timestamp with time zone,
    "titulo_tratamiento" text
      );



  create table "public"."usuario" (
    "id_usuario" uuid not null default gen_random_uuid(),
    "nombre" text not null,
    "apellido" text not null,
    "id_especialidad" integer,
    "telefono" text,
    "email" text not null,
    "contraseña" text not null,
    "color" character varying(7),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "activo" boolean default true
      );



  create table "public"."usuario_especialidad" (
    "id_usuario_especialidad" integer not null default nextval('public.usuario_especialidad_id_usuario_especialidad_seq'::regclass),
    "id_usuario" uuid not null,
    "id_especialidad" integer not null,
    "fecha_asignacion" timestamp with time zone default now(),
    "precio_particular" numeric(10,2) default 0,
    "precio_obra_social" numeric(10,2) default 0,
    "activo" boolean default true,
    "updated_at" timestamp with time zone default now(),
    "id_usuario_organizacion" uuid not null
      );



  create table "public"."usuario_organizacion" (
    "id_usuario_organizacion" uuid not null default gen_random_uuid(),
    "id_usuario" uuid not null,
    "id_organizacion" uuid not null,
    "id_rol" integer not null,
    "activo" boolean not null default true,
    "color_calendario" character varying,
    "creado_en" timestamp with time zone not null default now()
      );


alter sequence "public"."box_id_box_seq" owned by "public"."box"."id_box";

alter sequence "public"."especialidad_id_especialidad_seq" owned by "public"."especialidad"."id_especialidad";

alter sequence "public"."evolucion_clinica_id_evolucion_seq" owned by "public"."evolucion_clinica"."id_evolucion";

alter sequence "public"."notificacion_id_notificacion_seq" owned by "public"."notificacion"."id_notificacion";

alter sequence "public"."paciente_id_paciente_seq" owned by "public"."paciente"."id_paciente";

alter sequence "public"."turno_id_turno_seq" owned by "public"."turno"."id_turno";

alter sequence "public"."usuario_especialidad_id_usuario_especialidad_seq" owned by "public"."usuario_especialidad"."id_usuario_especialidad";

CREATE UNIQUE INDEX box_numero_key ON public.box USING btree (numero);

CREATE UNIQUE INDEX box_pkey ON public.box USING btree (id_box);

CREATE UNIQUE INDEX especialidad_pkey ON public.especialidad USING btree (id_especialidad);

CREATE UNIQUE INDEX evaluacion_inicial_pkey ON public.evaluacion_inicial USING btree (id_evaluacion);

CREATE UNIQUE INDEX evolucion_clinica_pkey ON public.evolucion_clinica USING btree (id_evolucion);

CREATE UNIQUE INDEX grupo_tratamiento_pkey ON public.grupo_tratamiento USING btree (id_grupo);

CREATE INDEX idx_evaluacion_grupo ON public.evaluacion_inicial USING btree (id_grupo);

CREATE INDEX idx_evaluacion_org ON public.evaluacion_inicial USING btree (id_organizacion);

CREATE INDEX idx_grupo_tratamiento_especialista ON public.grupo_tratamiento USING btree (id_especialista);

CREATE INDEX idx_grupo_tratamiento_organizacion ON public.grupo_tratamiento USING btree (id_organizacion);

CREATE INDEX idx_grupo_tratamiento_paciente ON public.grupo_tratamiento USING btree (id_paciente);

CREATE INDEX idx_notificacion_estado ON public.notificacion USING btree (estado);

CREATE INDEX idx_paciente_apellido_nombre ON public.paciente USING btree (apellido, nombre);

CREATE INDEX idx_paciente_busqueda_full ON public.paciente USING gin ((((nombre || ' '::text) || apellido)) extensions.gin_trgm_ops);

CREATE INDEX idx_turno_activos_fecha ON public.turno USING btree (id_organizacion, fecha, hora) WHERE (estado <> 'eliminado'::text);

CREATE INDEX idx_turno_especialidad ON public.turno USING btree (id_especialidad);

CREATE INDEX idx_turno_especialista ON public.turno USING btree (id_especialista);

CREATE INDEX idx_turno_estado ON public.turno USING btree (estado);

CREATE INDEX idx_turno_grupo_tratamiento ON public.turno USING btree (id_grupo_tratamiento);

CREATE INDEX idx_turno_paciente ON public.turno USING btree (id_paciente);

CREATE INDEX idx_usr_esp_fk_usr_org ON public.usuario_especialidad USING btree (id_usuario_organizacion);

CREATE INDEX idx_usr_org_filtro_compuesto ON public.usuario_organizacion USING btree (id_organizacion, id_rol, activo);

CREATE INDEX idx_usuario_activo ON public.usuario USING btree (activo);

CREATE INDEX idx_usuario_especialidad_activo ON public.usuario_especialidad USING btree (activo);

CREATE INDEX idx_usuario_especialidad_especialidad ON public.usuario_especialidad USING btree (id_especialidad);

CREATE INDEX idx_usuario_especialidad_usuario ON public.usuario_especialidad USING btree (id_usuario);

CREATE UNIQUE INDEX notificacion_pkey ON public.notificacion USING btree (id_notificacion);

CREATE UNIQUE INDEX organizacion_pkey ON public.organizacion USING btree (id_organizacion);

CREATE UNIQUE INDEX paciente_dni_key ON public.paciente USING btree (dni);

CREATE UNIQUE INDEX paciente_pkey ON public.paciente USING btree (id_paciente);

CREATE UNIQUE INDEX paciente_telefono_key ON public.paciente USING btree (telefono);

CREATE UNIQUE INDEX rol_nombre_key ON public.rol USING btree (nombre);

CREATE UNIQUE INDEX rol_pkey ON public.rol USING btree (id);

CREATE UNIQUE INDEX turno_pkey ON public.turno USING btree (id_turno);

CREATE UNIQUE INDEX uq_especialidad_org_nombre ON public.especialidad USING btree (id_organizacion, nombre);

CREATE UNIQUE INDEX uq_usuario_org ON public.usuario_organizacion USING btree (id_usuario, id_organizacion);

CREATE UNIQUE INDEX usuario_email_key ON public.usuario USING btree (email);

CREATE UNIQUE INDEX usuario_especialidad_id_usuario_id_especialidad_key ON public.usuario_especialidad USING btree (id_usuario, id_especialidad);

CREATE UNIQUE INDEX usuario_especialidad_pkey ON public.usuario_especialidad USING btree (id_usuario_especialidad);

CREATE UNIQUE INDEX usuario_organizacion_pkey ON public.usuario_organizacion USING btree (id_usuario_organizacion);

CREATE UNIQUE INDEX usuario_pkey ON public.usuario USING btree (id_usuario);

alter table "public"."box" add constraint "box_pkey" PRIMARY KEY using index "box_pkey";

alter table "public"."especialidad" add constraint "especialidad_pkey" PRIMARY KEY using index "especialidad_pkey";

alter table "public"."evaluacion_inicial" add constraint "evaluacion_inicial_pkey" PRIMARY KEY using index "evaluacion_inicial_pkey";

alter table "public"."evolucion_clinica" add constraint "evolucion_clinica_pkey" PRIMARY KEY using index "evolucion_clinica_pkey";

alter table "public"."grupo_tratamiento" add constraint "grupo_tratamiento_pkey" PRIMARY KEY using index "grupo_tratamiento_pkey";

alter table "public"."notificacion" add constraint "notificacion_pkey" PRIMARY KEY using index "notificacion_pkey";

alter table "public"."organizacion" add constraint "organizacion_pkey" PRIMARY KEY using index "organizacion_pkey";

alter table "public"."paciente" add constraint "paciente_pkey" PRIMARY KEY using index "paciente_pkey";

alter table "public"."rol" add constraint "rol_pkey" PRIMARY KEY using index "rol_pkey";

alter table "public"."turno" add constraint "turno_pkey" PRIMARY KEY using index "turno_pkey";

alter table "public"."usuario" add constraint "usuario_pkey" PRIMARY KEY using index "usuario_pkey";

alter table "public"."usuario_especialidad" add constraint "usuario_especialidad_pkey" PRIMARY KEY using index "usuario_especialidad_pkey";

alter table "public"."usuario_organizacion" add constraint "usuario_organizacion_pkey" PRIMARY KEY using index "usuario_organizacion_pkey";

alter table "public"."box" add constraint "box_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) not valid;

alter table "public"."box" validate constraint "box_id_organizacion_fkey";

alter table "public"."box" add constraint "box_numero_key" UNIQUE using index "box_numero_key";

alter table "public"."especialidad" add constraint "especialidad_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) not valid;

alter table "public"."especialidad" validate constraint "especialidad_id_organizacion_fkey";

alter table "public"."especialidad" add constraint "uq_especialidad_org_nombre" UNIQUE using index "uq_especialidad_org_nombre";

alter table "public"."evaluacion_inicial" add constraint "evaluacion_inicial_id_grupo_fkey" FOREIGN KEY (id_grupo) REFERENCES public.grupo_tratamiento(id_grupo) ON DELETE CASCADE not valid;

alter table "public"."evaluacion_inicial" validate constraint "evaluacion_inicial_id_grupo_fkey";

alter table "public"."evaluacion_inicial" add constraint "evaluacion_inicial_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) not valid;

alter table "public"."evaluacion_inicial" validate constraint "evaluacion_inicial_id_organizacion_fkey";

alter table "public"."evolucion_clinica" add constraint "evolucion_clinica_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) not valid;

alter table "public"."evolucion_clinica" validate constraint "evolucion_clinica_id_organizacion_fkey";

alter table "public"."evolucion_clinica" add constraint "evolucion_clinica_id_turno_fkey" FOREIGN KEY (id_turno) REFERENCES public.turno(id_turno) ON DELETE SET NULL not valid;

alter table "public"."evolucion_clinica" validate constraint "evolucion_clinica_id_turno_fkey";

alter table "public"."grupo_tratamiento" add constraint "grupo_tratamiento_id_especialidad_fkey" FOREIGN KEY (id_especialidad) REFERENCES public.especialidad(id_especialidad) ON DELETE SET NULL not valid;

alter table "public"."grupo_tratamiento" validate constraint "grupo_tratamiento_id_especialidad_fkey";

alter table "public"."grupo_tratamiento" add constraint "grupo_tratamiento_id_especialista_fkey" FOREIGN KEY (id_especialista) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE not valid;

alter table "public"."grupo_tratamiento" validate constraint "grupo_tratamiento_id_especialista_fkey";

alter table "public"."grupo_tratamiento" add constraint "grupo_tratamiento_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) ON DELETE CASCADE not valid;

alter table "public"."grupo_tratamiento" validate constraint "grupo_tratamiento_id_organizacion_fkey";

alter table "public"."grupo_tratamiento" add constraint "grupo_tratamiento_id_paciente_fkey" FOREIGN KEY (id_paciente) REFERENCES public.paciente(id_paciente) ON DELETE CASCADE not valid;

alter table "public"."grupo_tratamiento" validate constraint "grupo_tratamiento_id_paciente_fkey";

alter table "public"."grupo_tratamiento" add constraint "grupo_tratamiento_tipo_plan_check" CHECK ((tipo_plan = ANY (ARRAY['particular'::text, 'obra_social'::text]))) not valid;

alter table "public"."grupo_tratamiento" validate constraint "grupo_tratamiento_tipo_plan_check";

alter table "public"."notificacion" add constraint "notificacion_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) not valid;

alter table "public"."notificacion" validate constraint "notificacion_id_organizacion_fkey";

alter table "public"."notificacion" add constraint "notificacion_id_turno_fkey" FOREIGN KEY (id_turno) REFERENCES public.turno(id_turno) ON DELETE SET NULL not valid;

alter table "public"."notificacion" validate constraint "notificacion_id_turno_fkey";

alter table "public"."paciente" add constraint "paciente_dni_key" UNIQUE using index "paciente_dni_key";

alter table "public"."paciente" add constraint "paciente_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) not valid;

alter table "public"."paciente" validate constraint "paciente_id_organizacion_fkey";

alter table "public"."paciente" add constraint "paciente_telefono_key" UNIQUE using index "paciente_telefono_key";

alter table "public"."rol" add constraint "rol_nombre_key" UNIQUE using index "rol_nombre_key";

alter table "public"."turno" add constraint "fk_turno_especialidad" FOREIGN KEY (id_especialidad) REFERENCES public.especialidad(id_especialidad) not valid;

alter table "public"."turno" validate constraint "fk_turno_especialidad";

alter table "public"."turno" add constraint "turno_dificultad_check" CHECK (((dificultad)::text = ANY (ARRAY[('principiante'::character varying)::text, ('intermedio'::character varying)::text, ('avanzado'::character varying)::text]))) not valid;

alter table "public"."turno" validate constraint "turno_dificultad_check";

alter table "public"."turno" add constraint "turno_id_box_fkey" FOREIGN KEY (id_box) REFERENCES public.box(id_box) not valid;

alter table "public"."turno" validate constraint "turno_id_box_fkey";

alter table "public"."turno" add constraint "turno_id_especialista_fkey" FOREIGN KEY (id_especialista) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE not valid;

alter table "public"."turno" validate constraint "turno_id_especialista_fkey";

alter table "public"."turno" add constraint "turno_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) not valid;

alter table "public"."turno" validate constraint "turno_id_organizacion_fkey";

alter table "public"."turno" add constraint "turno_id_paciente_fkey" FOREIGN KEY (id_paciente) REFERENCES public.paciente(id_paciente) not valid;

alter table "public"."turno" validate constraint "turno_id_paciente_fkey";

alter table "public"."turno" add constraint "turno_tipo_plan_check" CHECK (((tipo_plan)::text = ANY (ARRAY[('particular'::character varying)::text, ('obra_social'::character varying)::text]))) not valid;

alter table "public"."turno" validate constraint "turno_tipo_plan_check";

alter table "public"."usuario" add constraint "usuario_color_check" CHECK (((color)::text ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'::text)) not valid;

alter table "public"."usuario" validate constraint "usuario_color_check";

alter table "public"."usuario" add constraint "usuario_email_key" UNIQUE using index "usuario_email_key";

alter table "public"."usuario" add constraint "usuario_id_especialidad_fkey" FOREIGN KEY (id_especialidad) REFERENCES public.especialidad(id_especialidad) not valid;

alter table "public"."usuario" validate constraint "usuario_id_especialidad_fkey";

alter table "public"."usuario_especialidad" add constraint "usuario_especialidad_id_especialidad_fkey" FOREIGN KEY (id_especialidad) REFERENCES public.especialidad(id_especialidad) ON DELETE CASCADE not valid;

alter table "public"."usuario_especialidad" validate constraint "usuario_especialidad_id_especialidad_fkey";

alter table "public"."usuario_especialidad" add constraint "usuario_especialidad_id_usuario_fkey" FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE not valid;

alter table "public"."usuario_especialidad" validate constraint "usuario_especialidad_id_usuario_fkey";

alter table "public"."usuario_especialidad" add constraint "usuario_especialidad_id_usuario_id_especialidad_key" UNIQUE using index "usuario_especialidad_id_usuario_id_especialidad_key";

alter table "public"."usuario_especialidad" add constraint "usuario_especialidad_id_usuario_organizacion_fkey" FOREIGN KEY (id_usuario_organizacion) REFERENCES public.usuario_organizacion(id_usuario_organizacion) not valid;

alter table "public"."usuario_especialidad" validate constraint "usuario_especialidad_id_usuario_organizacion_fkey";

alter table "public"."usuario_organizacion" add constraint "uq_usuario_org" UNIQUE using index "uq_usuario_org";

alter table "public"."usuario_organizacion" add constraint "usuario_organizacion_id_organizacion_fkey" FOREIGN KEY (id_organizacion) REFERENCES public.organizacion(id_organizacion) not valid;

alter table "public"."usuario_organizacion" validate constraint "usuario_organizacion_id_organizacion_fkey";

alter table "public"."usuario_organizacion" add constraint "usuario_organizacion_id_rol_fkey" FOREIGN KEY (id_rol) REFERENCES public.rol(id) not valid;

alter table "public"."usuario_organizacion" validate constraint "usuario_organizacion_id_rol_fkey";

alter table "public"."usuario_organizacion" add constraint "usuario_organizacion_id_usuario_fkey" FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) not valid;

alter table "public"."usuario_organizacion" validate constraint "usuario_organizacion_id_usuario_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.asignar_precio_turno()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    precio_asignado numeric;
BEGIN
    -- Solo asignar si el precio no fue especificado
    IF NEW.precio IS NULL THEN
        -- Buscar el precio correspondiente al especialista, especialidad y tipo de plan
        SELECT
            CASE
                WHEN NEW.tipo_plan = 'particular' THEN ue.precio_particular
                WHEN NEW.tipo_plan = 'obra social' THEN ue.precio_obra_social
                ELSE NULL
            END
        INTO precio_asignado
        FROM usuario_especialidad ue
        WHERE ue.id_usuario = NEW.id_especialista
          AND ue.id_especialidad = NEW.id_especialidad
        LIMIT 1;

        -- Si encontró el precio, asignarlo
        IF precio_asignado IS NOT NULL THEN
            NEW.precio := precio_asignado;
        ELSE
            RAISE NOTICE 'No se encontró precio para el especialista %, especialidad %, plan %',
                NEW.id_especialista, NEW.id_especialidad, NEW.tipo_plan;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auth_bcrypt_hash(pass text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT crypt(pass, gen_salt('bf'));
$function$
;

CREATE OR REPLACE FUNCTION public.buscar_pacientes_smart(search_term text, org_id uuid, max_rows integer)
 RETURNS SETOF public.paciente
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM paciente
  WHERE 
    id_organizacion = org_id -- 🔒 Seguridad Multi-tenant obligatoria
    AND (
      -- Opción A: Concatenación simple (resuelve tu problema "Julio Roca")
      (nombre || ' ' || apellido) ILIKE '%' || search_term || '%'
      OR
      -- Opción B: También busca si escriben primero el apellido "Roca Julio"
      (apellido || ' ' || nombre) ILIKE '%' || search_term || '%'
      OR
      -- Opción C: DNI
      dni ILIKE search_term || '%'
    )
  ORDER BY apellido, nombre
  LIMIT max_rows;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."box" to "anon";

grant insert on table "public"."box" to "anon";

grant references on table "public"."box" to "anon";

grant select on table "public"."box" to "anon";

grant trigger on table "public"."box" to "anon";

grant truncate on table "public"."box" to "anon";

grant update on table "public"."box" to "anon";

grant delete on table "public"."box" to "authenticated";

grant insert on table "public"."box" to "authenticated";

grant references on table "public"."box" to "authenticated";

grant select on table "public"."box" to "authenticated";

grant trigger on table "public"."box" to "authenticated";

grant truncate on table "public"."box" to "authenticated";

grant update on table "public"."box" to "authenticated";

grant delete on table "public"."box" to "service_role";

grant insert on table "public"."box" to "service_role";

grant references on table "public"."box" to "service_role";

grant select on table "public"."box" to "service_role";

grant trigger on table "public"."box" to "service_role";

grant truncate on table "public"."box" to "service_role";

grant update on table "public"."box" to "service_role";

grant delete on table "public"."especialidad" to "anon";

grant insert on table "public"."especialidad" to "anon";

grant references on table "public"."especialidad" to "anon";

grant select on table "public"."especialidad" to "anon";

grant trigger on table "public"."especialidad" to "anon";

grant truncate on table "public"."especialidad" to "anon";

grant update on table "public"."especialidad" to "anon";

grant delete on table "public"."especialidad" to "authenticated";

grant insert on table "public"."especialidad" to "authenticated";

grant references on table "public"."especialidad" to "authenticated";

grant select on table "public"."especialidad" to "authenticated";

grant trigger on table "public"."especialidad" to "authenticated";

grant truncate on table "public"."especialidad" to "authenticated";

grant update on table "public"."especialidad" to "authenticated";

grant delete on table "public"."especialidad" to "service_role";

grant insert on table "public"."especialidad" to "service_role";

grant references on table "public"."especialidad" to "service_role";

grant select on table "public"."especialidad" to "service_role";

grant trigger on table "public"."especialidad" to "service_role";

grant truncate on table "public"."especialidad" to "service_role";

grant update on table "public"."especialidad" to "service_role";

grant delete on table "public"."evaluacion_inicial" to "anon";

grant insert on table "public"."evaluacion_inicial" to "anon";

grant references on table "public"."evaluacion_inicial" to "anon";

grant select on table "public"."evaluacion_inicial" to "anon";

grant trigger on table "public"."evaluacion_inicial" to "anon";

grant truncate on table "public"."evaluacion_inicial" to "anon";

grant update on table "public"."evaluacion_inicial" to "anon";

grant delete on table "public"."evaluacion_inicial" to "authenticated";

grant insert on table "public"."evaluacion_inicial" to "authenticated";

grant references on table "public"."evaluacion_inicial" to "authenticated";

grant select on table "public"."evaluacion_inicial" to "authenticated";

grant trigger on table "public"."evaluacion_inicial" to "authenticated";

grant truncate on table "public"."evaluacion_inicial" to "authenticated";

grant update on table "public"."evaluacion_inicial" to "authenticated";

grant delete on table "public"."evaluacion_inicial" to "service_role";

grant insert on table "public"."evaluacion_inicial" to "service_role";

grant references on table "public"."evaluacion_inicial" to "service_role";

grant select on table "public"."evaluacion_inicial" to "service_role";

grant trigger on table "public"."evaluacion_inicial" to "service_role";

grant truncate on table "public"."evaluacion_inicial" to "service_role";

grant update on table "public"."evaluacion_inicial" to "service_role";

grant delete on table "public"."evolucion_clinica" to "anon";

grant insert on table "public"."evolucion_clinica" to "anon";

grant references on table "public"."evolucion_clinica" to "anon";

grant select on table "public"."evolucion_clinica" to "anon";

grant trigger on table "public"."evolucion_clinica" to "anon";

grant truncate on table "public"."evolucion_clinica" to "anon";

grant update on table "public"."evolucion_clinica" to "anon";

grant delete on table "public"."evolucion_clinica" to "authenticated";

grant insert on table "public"."evolucion_clinica" to "authenticated";

grant references on table "public"."evolucion_clinica" to "authenticated";

grant select on table "public"."evolucion_clinica" to "authenticated";

grant trigger on table "public"."evolucion_clinica" to "authenticated";

grant truncate on table "public"."evolucion_clinica" to "authenticated";

grant update on table "public"."evolucion_clinica" to "authenticated";

grant delete on table "public"."evolucion_clinica" to "service_role";

grant insert on table "public"."evolucion_clinica" to "service_role";

grant references on table "public"."evolucion_clinica" to "service_role";

grant select on table "public"."evolucion_clinica" to "service_role";

grant trigger on table "public"."evolucion_clinica" to "service_role";

grant truncate on table "public"."evolucion_clinica" to "service_role";

grant update on table "public"."evolucion_clinica" to "service_role";

grant delete on table "public"."grupo_tratamiento" to "anon";

grant insert on table "public"."grupo_tratamiento" to "anon";

grant references on table "public"."grupo_tratamiento" to "anon";

grant select on table "public"."grupo_tratamiento" to "anon";

grant trigger on table "public"."grupo_tratamiento" to "anon";

grant truncate on table "public"."grupo_tratamiento" to "anon";

grant update on table "public"."grupo_tratamiento" to "anon";

grant delete on table "public"."grupo_tratamiento" to "authenticated";

grant insert on table "public"."grupo_tratamiento" to "authenticated";

grant references on table "public"."grupo_tratamiento" to "authenticated";

grant select on table "public"."grupo_tratamiento" to "authenticated";

grant trigger on table "public"."grupo_tratamiento" to "authenticated";

grant truncate on table "public"."grupo_tratamiento" to "authenticated";

grant update on table "public"."grupo_tratamiento" to "authenticated";

grant delete on table "public"."grupo_tratamiento" to "service_role";

grant insert on table "public"."grupo_tratamiento" to "service_role";

grant references on table "public"."grupo_tratamiento" to "service_role";

grant select on table "public"."grupo_tratamiento" to "service_role";

grant trigger on table "public"."grupo_tratamiento" to "service_role";

grant truncate on table "public"."grupo_tratamiento" to "service_role";

grant update on table "public"."grupo_tratamiento" to "service_role";

grant delete on table "public"."notificacion" to "anon";

grant insert on table "public"."notificacion" to "anon";

grant references on table "public"."notificacion" to "anon";

grant select on table "public"."notificacion" to "anon";

grant trigger on table "public"."notificacion" to "anon";

grant truncate on table "public"."notificacion" to "anon";

grant update on table "public"."notificacion" to "anon";

grant delete on table "public"."notificacion" to "authenticated";

grant insert on table "public"."notificacion" to "authenticated";

grant references on table "public"."notificacion" to "authenticated";

grant select on table "public"."notificacion" to "authenticated";

grant trigger on table "public"."notificacion" to "authenticated";

grant truncate on table "public"."notificacion" to "authenticated";

grant update on table "public"."notificacion" to "authenticated";

grant delete on table "public"."notificacion" to "service_role";

grant insert on table "public"."notificacion" to "service_role";

grant references on table "public"."notificacion" to "service_role";

grant select on table "public"."notificacion" to "service_role";

grant trigger on table "public"."notificacion" to "service_role";

grant truncate on table "public"."notificacion" to "service_role";

grant update on table "public"."notificacion" to "service_role";

grant delete on table "public"."organizacion" to "anon";

grant insert on table "public"."organizacion" to "anon";

grant references on table "public"."organizacion" to "anon";

grant select on table "public"."organizacion" to "anon";

grant trigger on table "public"."organizacion" to "anon";

grant truncate on table "public"."organizacion" to "anon";

grant update on table "public"."organizacion" to "anon";

grant delete on table "public"."organizacion" to "authenticated";

grant insert on table "public"."organizacion" to "authenticated";

grant references on table "public"."organizacion" to "authenticated";

grant select on table "public"."organizacion" to "authenticated";

grant trigger on table "public"."organizacion" to "authenticated";

grant truncate on table "public"."organizacion" to "authenticated";

grant update on table "public"."organizacion" to "authenticated";

grant delete on table "public"."organizacion" to "service_role";

grant insert on table "public"."organizacion" to "service_role";

grant references on table "public"."organizacion" to "service_role";

grant select on table "public"."organizacion" to "service_role";

grant trigger on table "public"."organizacion" to "service_role";

grant truncate on table "public"."organizacion" to "service_role";

grant update on table "public"."organizacion" to "service_role";

grant delete on table "public"."paciente" to "anon";

grant insert on table "public"."paciente" to "anon";

grant references on table "public"."paciente" to "anon";

grant select on table "public"."paciente" to "anon";

grant trigger on table "public"."paciente" to "anon";

grant truncate on table "public"."paciente" to "anon";

grant update on table "public"."paciente" to "anon";

grant delete on table "public"."paciente" to "authenticated";

grant insert on table "public"."paciente" to "authenticated";

grant references on table "public"."paciente" to "authenticated";

grant select on table "public"."paciente" to "authenticated";

grant trigger on table "public"."paciente" to "authenticated";

grant truncate on table "public"."paciente" to "authenticated";

grant update on table "public"."paciente" to "authenticated";

grant delete on table "public"."paciente" to "service_role";

grant insert on table "public"."paciente" to "service_role";

grant references on table "public"."paciente" to "service_role";

grant select on table "public"."paciente" to "service_role";

grant trigger on table "public"."paciente" to "service_role";

grant truncate on table "public"."paciente" to "service_role";

grant update on table "public"."paciente" to "service_role";

grant delete on table "public"."rol" to "anon";

grant insert on table "public"."rol" to "anon";

grant references on table "public"."rol" to "anon";

grant select on table "public"."rol" to "anon";

grant trigger on table "public"."rol" to "anon";

grant truncate on table "public"."rol" to "anon";

grant update on table "public"."rol" to "anon";

grant delete on table "public"."rol" to "authenticated";

grant insert on table "public"."rol" to "authenticated";

grant references on table "public"."rol" to "authenticated";

grant select on table "public"."rol" to "authenticated";

grant trigger on table "public"."rol" to "authenticated";

grant truncate on table "public"."rol" to "authenticated";

grant update on table "public"."rol" to "authenticated";

grant delete on table "public"."rol" to "service_role";

grant insert on table "public"."rol" to "service_role";

grant references on table "public"."rol" to "service_role";

grant select on table "public"."rol" to "service_role";

grant trigger on table "public"."rol" to "service_role";

grant truncate on table "public"."rol" to "service_role";

grant update on table "public"."rol" to "service_role";

grant delete on table "public"."turno" to "anon";

grant insert on table "public"."turno" to "anon";

grant references on table "public"."turno" to "anon";

grant select on table "public"."turno" to "anon";

grant trigger on table "public"."turno" to "anon";

grant truncate on table "public"."turno" to "anon";

grant update on table "public"."turno" to "anon";

grant delete on table "public"."turno" to "authenticated";

grant insert on table "public"."turno" to "authenticated";

grant references on table "public"."turno" to "authenticated";

grant select on table "public"."turno" to "authenticated";

grant trigger on table "public"."turno" to "authenticated";

grant truncate on table "public"."turno" to "authenticated";

grant update on table "public"."turno" to "authenticated";

grant delete on table "public"."turno" to "service_role";

grant insert on table "public"."turno" to "service_role";

grant references on table "public"."turno" to "service_role";

grant select on table "public"."turno" to "service_role";

grant trigger on table "public"."turno" to "service_role";

grant truncate on table "public"."turno" to "service_role";

grant update on table "public"."turno" to "service_role";

grant delete on table "public"."usuario" to "anon";

grant insert on table "public"."usuario" to "anon";

grant references on table "public"."usuario" to "anon";

grant select on table "public"."usuario" to "anon";

grant trigger on table "public"."usuario" to "anon";

grant truncate on table "public"."usuario" to "anon";

grant update on table "public"."usuario" to "anon";

grant delete on table "public"."usuario" to "authenticated";

grant insert on table "public"."usuario" to "authenticated";

grant references on table "public"."usuario" to "authenticated";

grant select on table "public"."usuario" to "authenticated";

grant trigger on table "public"."usuario" to "authenticated";

grant truncate on table "public"."usuario" to "authenticated";

grant update on table "public"."usuario" to "authenticated";

grant delete on table "public"."usuario" to "service_role";

grant insert on table "public"."usuario" to "service_role";

grant references on table "public"."usuario" to "service_role";

grant select on table "public"."usuario" to "service_role";

grant trigger on table "public"."usuario" to "service_role";

grant truncate on table "public"."usuario" to "service_role";

grant update on table "public"."usuario" to "service_role";

grant delete on table "public"."usuario_especialidad" to "anon";

grant insert on table "public"."usuario_especialidad" to "anon";

grant references on table "public"."usuario_especialidad" to "anon";

grant select on table "public"."usuario_especialidad" to "anon";

grant trigger on table "public"."usuario_especialidad" to "anon";

grant truncate on table "public"."usuario_especialidad" to "anon";

grant update on table "public"."usuario_especialidad" to "anon";

grant delete on table "public"."usuario_especialidad" to "authenticated";

grant insert on table "public"."usuario_especialidad" to "authenticated";

grant references on table "public"."usuario_especialidad" to "authenticated";

grant select on table "public"."usuario_especialidad" to "authenticated";

grant trigger on table "public"."usuario_especialidad" to "authenticated";

grant truncate on table "public"."usuario_especialidad" to "authenticated";

grant update on table "public"."usuario_especialidad" to "authenticated";

grant delete on table "public"."usuario_especialidad" to "service_role";

grant insert on table "public"."usuario_especialidad" to "service_role";

grant references on table "public"."usuario_especialidad" to "service_role";

grant select on table "public"."usuario_especialidad" to "service_role";

grant trigger on table "public"."usuario_especialidad" to "service_role";

grant truncate on table "public"."usuario_especialidad" to "service_role";

grant update on table "public"."usuario_especialidad" to "service_role";

grant delete on table "public"."usuario_organizacion" to "anon";

grant insert on table "public"."usuario_organizacion" to "anon";

grant references on table "public"."usuario_organizacion" to "anon";

grant select on table "public"."usuario_organizacion" to "anon";

grant trigger on table "public"."usuario_organizacion" to "anon";

grant truncate on table "public"."usuario_organizacion" to "anon";

grant update on table "public"."usuario_organizacion" to "anon";

grant delete on table "public"."usuario_organizacion" to "authenticated";

grant insert on table "public"."usuario_organizacion" to "authenticated";

grant references on table "public"."usuario_organizacion" to "authenticated";

grant select on table "public"."usuario_organizacion" to "authenticated";

grant trigger on table "public"."usuario_organizacion" to "authenticated";

grant truncate on table "public"."usuario_organizacion" to "authenticated";

grant update on table "public"."usuario_organizacion" to "authenticated";

grant delete on table "public"."usuario_organizacion" to "service_role";

grant insert on table "public"."usuario_organizacion" to "service_role";

grant references on table "public"."usuario_organizacion" to "service_role";

grant select on table "public"."usuario_organizacion" to "service_role";

grant trigger on table "public"."usuario_organizacion" to "service_role";

grant truncate on table "public"."usuario_organizacion" to "service_role";

grant update on table "public"."usuario_organizacion" to "service_role";


  create policy "Permitir todo para autenticados"
  on "public"."evaluacion_inicial"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Usuarios pueden actualizar grupos"
  on "public"."grupo_tratamiento"
  as permissive
  for update
  to public
using ((id_organizacion IN ( SELECT usuario_organizacion.id_organizacion
   FROM public.usuario_organizacion
  WHERE (usuario_organizacion.id_usuario = auth.uid()))));



  create policy "Usuarios pueden crear grupos"
  on "public"."grupo_tratamiento"
  as permissive
  for insert
  to public
with check ((id_organizacion IN ( SELECT usuario_organizacion.id_organizacion
   FROM public.usuario_organizacion
  WHERE (usuario_organizacion.id_usuario = auth.uid()))));



  create policy "Usuarios pueden ver grupos de su organización"
  on "public"."grupo_tratamiento"
  as permissive
  for select
  to public
using ((id_organizacion IN ( SELECT usuario_organizacion.id_organizacion
   FROM public.usuario_organizacion
  WHERE (usuario_organizacion.id_usuario = auth.uid()))));


CREATE TRIGGER trg_asignar_precio_turno BEFORE INSERT OR UPDATE ON public.turno FOR EACH ROW EXECUTE FUNCTION public.asignar_precio_turno();

CREATE TRIGGER update_usuario_especialidad_updated_at BEFORE UPDATE ON public.usuario_especialidad FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


