-- EcoFlow — esquema PostgreSQL / Supabase
-- Ejecutar en el SQL Editor del proyecto (o vía `supabase db reset` si usa CLI).
-- Requiere extensión pgcrypto (gen_random_uuid) — ya disponible en Supabase.

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'installer' check (role in ('admin', 'installer')),
  created_at timestamptz not null default now()
);

create table if not exists public.installers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  phone text,
  specialty text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  address text not null,
  status text not null default 'Pendiente'
    check (status in ('Pendiente', 'En Progreso', 'Completado')),
  assigned_installer_id uuid references public.installers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(10, 2) not null check (unit_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_installers_profile_id on public.installers (profile_id);
create index if not exists idx_projects_assigned_installer_id on public.projects (assigned_installer_id);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_materials_project_id on public.materials (project_id);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (SECURITY DEFINER para evitar recursión RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.current_installer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select i.id
  from public.installers i
  where i.profile_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.projects pr
      where pr.id = p_project_id
        and pr.assigned_installer_id = public.current_installer_id()
    );
$$;

-- ---------------------------------------------------------------------------
-- Trigger: perfil + fila de instalador al registrar en Auth
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_role text;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'usuario'), '@', 1)
  );

  v_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'installer');
  if v_role not in ('admin', 'installer') then
    v_role := 'installer';
  end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, v_full_name, v_role);

  if v_role = 'installer' then
    insert into public.installers (profile_id)
    values (new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trigger: updated_at en projects
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.installers enable row level security;
alter table public.projects enable row level security;
alter table public.materials enable row level security;

-- Evita políticas duplicadas al re-ejecutar el script
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

drop policy if exists "installers_select_own_or_admin" on public.installers;
drop policy if exists "installers_admin_write" on public.installers;
drop policy if exists "installers_update_own" on public.installers;

drop policy if exists "projects_admin_all" on public.projects;
drop policy if exists "projects_installer_select" on public.projects;
drop policy if exists "projects_installer_update" on public.projects;

drop policy if exists "materials_select" on public.materials;
drop policy if exists "materials_insert" on public.materials;
drop policy if exists "materials_update" on public.materials;
drop policy if exists "materials_delete" on public.materials;

-- profiles
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- installers
create policy "installers_select_own_or_admin"
  on public.installers
  for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy "installers_admin_write"
  on public.installers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "installers_update_own"
  on public.installers
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- projects
-- Admin: CRUD completo sobre todos los registros
create policy "projects_admin_all"
  on public.projects
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Instalador: solo SELECT de proyectos asignados a su installer_id
create policy "projects_installer_select"
  on public.projects
  for select
  to authenticated
  using (assigned_installer_id = public.current_installer_id());

-- Instalador: solo UPDATE de proyectos asignados (no puede reasignarse ni insertar)
create policy "projects_installer_update"
  on public.projects
  for update
  to authenticated
  using (assigned_installer_id = public.current_installer_id())
  with check (assigned_installer_id = public.current_installer_id());

-- materials: visibles y modificables solo si hay acceso al proyecto padre
create policy "materials_select"
  on public.materials
  for select
  to authenticated
  using (public.can_access_project(project_id));

create policy "materials_insert"
  on public.materials
  for insert
  to authenticated
  with check (public.can_access_project(project_id));

create policy "materials_update"
  on public.materials
  for update
  to authenticated
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy "materials_delete"
  on public.materials
  for delete
  to authenticated
  using (public.can_access_project(project_id));

-- ---------------------------------------------------------------------------
-- Privilegios de rol (RLS sigue siendo el control efectivo)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on table public.profiles, public.installers, public.projects, public.materials
  to anon, authenticated;

grant insert, update, delete on table public.profiles, public.installers, public.projects, public.materials
  to authenticated;

commit;
