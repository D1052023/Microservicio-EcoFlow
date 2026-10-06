-- EcoFlow — casos de prueba RLS (PostgreSQL / Supabase)
--
-- Cómo ejecutar:
--   1. Aplique supabase/schema.sql.
--   2. Ejecute este script en una transacción (se hace ROLLBACK al final).
--   3. Revise los RAISE NOTICE / las aserciones (ERROR si un caso falla).
--
-- Los UUID de prueba son fijos para reproducibilidad. Se insertan usuarios
-- sintéticos en auth.users (el trigger on_auth_user_created crea profiles).

begin;

create extension if not exists "pgcrypto";

-- Identificadores deterministas
-- Admin:        00000000-0000-0000-0000-0000000000aa
-- Instalador A: 00000000-0000-0000-0000-0000000000a1
-- Instalador B: 00000000-0000-0000-0000-0000000000b2

do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000aa';
  inst_a_id uuid := '00000000-0000-0000-0000-0000000000a1';
  inst_b_id uuid := '00000000-0000-0000-0000-0000000000b2';
  installer_a_row uuid;
  installer_b_row uuid;
  project_a uuid := '00000000-0000-0000-0000-0000000000p1';
  project_b uuid := '00000000-0000-0000-0000-0000000000p2';
  n bigint;
begin
  -- Limpieza idempotente de filas de prueba
  delete from auth.users
  where id in (admin_id, inst_a_id, inst_b_id);

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin.rls@ecoflow.test',
      crypt('test-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin RLS","role":"admin"}'::jsonb,
      now(),
      now()
    ),
    (
      inst_a_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'installer.a@ecoflow.test',
      crypt('test-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Instalador A","role":"installer"}'::jsonb,
      now(),
      now()
    ),
    (
      inst_b_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'installer.b@ecoflow.test',
      crypt('test-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Instalador B","role":"installer"}'::jsonb,
      now(),
      now()
    );

  select i.id into strict installer_a_row from public.installers i where i.profile_id = inst_a_id;
  select i.id into strict installer_b_row from public.installers i where i.profile_id = inst_b_id;

  insert into public.projects (id, title, client_name, address, status, assigned_installer_id)
  values
    (project_a, 'Proyecto A', 'Cliente A', 'Calle 1', 'Pendiente', installer_a_row),
    (project_b, 'Proyecto B', 'Cliente B', 'Calle 2', 'En Progreso', installer_b_row);

  -- -----------------------------------------------------------------------
  -- TC-RLS-01: Admin puede leer TODOS los proyectos
  -- -----------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', admin_id::text, 'role', 'authenticated')::text,
    true
  );

  select count(*) into n from public.projects;
  if n < 2 then
    raise exception 'TC-RLS-01 FALLÓ: admin debía leer todos los proyectos (obtuvo %)', n;
  end if;
  raise notice 'TC-RLS-01 PASÓ: admin leyó % proyectos', n;

  -- -----------------------------------------------------------------------
  -- TC-RLS-02: Instalador A no ve proyectos del Instalador B
  -- -----------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', inst_a_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', inst_a_id::text, 'role', 'authenticated')::text,
    true
  );

  select count(*) into n from public.projects where assigned_installer_id = installer_b_row;
  if n <> 0 then
    raise exception 'TC-RLS-02 FALLÓ: instalador A vio % proyectos de B', n;
  end if;

  select count(*) into n from public.projects;
  if n <> 1 then
    raise exception 'TC-RLS-02 FALLÓ: instalador A debía ver solo 1 proyecto propio (obtuvo %)', n;
  end if;
  raise notice 'TC-RLS-02 PASÓ: instalador A no accede a proyectos de B';

  -- -----------------------------------------------------------------------
  -- TC-RLS-03: Instalador A no puede INSERTAR proyectos
  -- -----------------------------------------------------------------------
  begin
    insert into public.projects (title, client_name, address, status, assigned_installer_id)
    values ('Proyecto ilegal', 'Cliente X', 'Calle X', 'Pendiente', installer_a_row);
    raise exception 'TC-RLS-03 FALLÓ: el INSERT del instalador no fue denegado';
  exception
    when insufficient_privilege or check_violation then
      raise notice 'TC-RLS-03 PASÓ: INSERT denegado (%)', sqlerrm;
    when others then
      if sqlerrm ilike '%policy%' or sqlerrm ilike '%permission%' or sqlstate = '42501' then
        raise notice 'TC-RLS-03 PASÓ: INSERT denegado por RLS (%)', sqlerrm;
      else
        -- En PostgREST/Postgres, un INSERT sin política WITH CHECK suele fallar con
        -- "new row violates row-level security policy"
        if sqlerrm ilike '%row-level security%' then
          raise notice 'TC-RLS-03 PASÓ: INSERT denegado por política RLS';
        else
          raise;
        end if;
      end if;
  end;

  -- -----------------------------------------------------------------------
  -- TC-RLS-04: Anónimo no puede leer projects
  -- -----------------------------------------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);

  select count(*) into n from public.projects;
  if n <> 0 then
    raise exception 'TC-RLS-04 FALLÓ: anónimo leyó % filas', n;
  end if;
  raise notice 'TC-RLS-04 PASÓ: anónimo no lee projects';

  -- Restaurar rol para el ROLLBACK del bloque externo
  perform set_config('role', 'postgres', true);
end $$;

rollback;
