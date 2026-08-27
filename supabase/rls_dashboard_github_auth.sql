-- Morena Pitaya CRM — acesso mínimo para dashboard autenticado via Supabase Auth.
-- Estilo de operação: o navegador apenas lê; n8n usa credencial de servidor segura (service_role/secret key), nunca a chave pública do dashboard.
-- Pré-requisito: execute este arquivo no SQL Editor como administrador do projeto Supabase.

begin;

-- 1. Lista explícita de pessoas autorizadas a acessar o dashboard.
create table if not exists public.crm_dashboard_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'operator', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_dashboard_members enable row level security;

-- Somente uma função interna consulta esta tabela; ela não é exposta diretamente ao dashboard.
revoke all on table public.crm_dashboard_members from anon, authenticated;

create or replace function public.crm_dashboard_is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crm_dashboard_members member
    where member.user_id = auth.uid()
      and member.is_active is true
  );
$$;

revoke all on function public.crm_dashboard_is_member() from public;
grant execute on function public.crm_dashboard_is_member() to authenticated;

-- 2. A role anônima não pode acessar dados CRM, mesmo que uma chave pública esteja no navegador.
revoke all on table
  public.crm_contacts,
  public.crm_interactions,
  public.crm_orders,
  public.crm_instances,
  public.crm_opportunities,
  public.crm_tasks,
  public.crm_products,
  public.crm_contact_channel_identities,
  public.crm_pipeline_stage_history,
  public.crm_lead_score_snapshots,
  public.crm_order_items,
  public.crm_automation_runs
from anon;

revoke all on table
  public.vw_dashboard_instances,
  public.vw_dashboard_lead_queue,
  public.vw_dashboard_funil
from anon;

-- 3. Usuários autenticados só podem ler a camada usada pelo dashboard.
-- Escrita fica reservada aos fluxos de servidor (n8n com service_role/secret key).
revoke insert, update, delete, truncate, references, trigger on table
  public.crm_contacts,
  public.crm_interactions,
  public.crm_orders,
  public.crm_instances,
  public.crm_opportunities,
  public.crm_tasks,
  public.crm_products,
  public.crm_contact_channel_identities,
  public.crm_pipeline_stage_history,
  public.crm_lead_score_snapshots,
  public.crm_order_items,
  public.crm_automation_runs
from authenticated;

grant select on table
  public.crm_contacts,
  public.crm_interactions,
  public.crm_orders,
  public.crm_instances,
  public.crm_opportunities,
  public.crm_tasks,
  public.crm_products,
  public.crm_contact_channel_identities,
  public.crm_pipeline_stage_history,
  public.crm_lead_score_snapshots,
  public.crm_order_items,
  public.crm_automation_runs
to authenticated;

grant select on table
  public.vw_dashboard_instances,
  public.vw_dashboard_lead_queue,
  public.vw_dashboard_funil
to authenticated;

-- 4. As views passam a respeitar a role do usuário que consulta.
alter view public.vw_dashboard_instances set (security_invoker = true);
alter view public.vw_dashboard_lead_queue set (security_invoker = true);
alter view public.vw_dashboard_funil set (security_invoker = true);

-- 5. Uma única regra de leitura por tabela: apenas membros ativos do dashboard.
-- Remova versões anteriores somente se tiver criado políticas com estes mesmos nomes.
drop policy if exists "crm_dashboard_read_contacts" on public.crm_contacts;
create policy "crm_dashboard_read_contacts" on public.crm_contacts
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_interactions" on public.crm_interactions;
create policy "crm_dashboard_read_interactions" on public.crm_interactions
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_orders" on public.crm_orders;
create policy "crm_dashboard_read_orders" on public.crm_orders
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_instances" on public.crm_instances;
create policy "crm_dashboard_read_instances" on public.crm_instances
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_opportunities" on public.crm_opportunities;
create policy "crm_dashboard_read_opportunities" on public.crm_opportunities
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_tasks" on public.crm_tasks;
create policy "crm_dashboard_read_tasks" on public.crm_tasks
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_products" on public.crm_products;
create policy "crm_dashboard_read_products" on public.crm_products
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_identities" on public.crm_contact_channel_identities;
create policy "crm_dashboard_read_identities" on public.crm_contact_channel_identities
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_stage_history" on public.crm_pipeline_stage_history;
create policy "crm_dashboard_read_stage_history" on public.crm_pipeline_stage_history
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_score_snapshots" on public.crm_lead_score_snapshots;
create policy "crm_dashboard_read_score_snapshots" on public.crm_lead_score_snapshots
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_order_items" on public.crm_order_items;
create policy "crm_dashboard_read_order_items" on public.crm_order_items
for select to authenticated using (public.crm_dashboard_is_member());

drop policy if exists "crm_dashboard_read_automation_runs" on public.crm_automation_runs;
create policy "crm_dashboard_read_automation_runs" on public.crm_automation_runs
for select to authenticated using (public.crm_dashboard_is_member());

commit;

-- APÓS O PRIMEIRO LOGIN COM GITHUB, execute manualmente este bloco substituindo o UUID.
-- O UUID pode ser localizado em Authentication > Users ou pela consulta abaixo.
--
-- select id, email, raw_user_meta_data ->> 'user_name' as github_user
-- from auth.users
-- order by created_at desc;
--
-- insert into public.crm_dashboard_members (user_id, role)
-- values ('COLE_AQUI_O_UUID_DO_USUARIO', 'admin')
-- on conflict (user_id) do update set role = excluded.role, is_active = true, updated_at = now();

