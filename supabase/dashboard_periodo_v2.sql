-- Dashboard CRM v2 — métricas parametrizadas por período.
-- Aplicar no Supabase SQL Editor antes de publicar o frontend correspondente.
-- O período altera métricas de atividade e a classificação da fila; não altera o score histórico.

create or replace function public.crm_dashboard_instances_period(p_days integer)
returns table (
  instance_id bigint,
  instance_slug text,
  instance_nome text,
  canal text,
  instance_type text,
  status text,
  interacoes_30d bigint,
  recebidas_30d bigint,
  enviadas_30d bigint,
  contatos_ativos_30d bigint,
  tempo_medio_resposta_segundos numeric,
  entradas_pendentes bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    i.id,
    i.slug,
    i.nome,
    i.canal,
    i.instance_type,
    i.status,
    count(ci.id) filter (
      where ci.horario_msg >= now() - make_interval(days => p_days)
    ),
    count(ci.id) filter (
      where ci.tipo = 'recebida'
        and ci.horario_msg >= now() - make_interval(days => p_days)
    ),
    count(ci.id) filter (
      where ci.tipo = 'enviada'
        and ci.horario_msg >= now() - make_interval(days => p_days)
    ),
    count(distinct ci.contact_id) filter (
      where ci.horario_msg >= now() - make_interval(days => p_days)
    ),
    round(avg(ci.tempo_resposta) filter (
      where ci.tempo_resposta is not null
        and ci.horario_msg >= now() - make_interval(days => p_days)
    ), 1),
    count(ci.id) filter (
      where ci.tipo = 'recebida'
        and ci.respondida is false
        and ci.horario_msg >= now() - make_interval(days => p_days)
    )
  from public.crm_instances i
  left join public.crm_interactions ci on ci.instance_id = i.id
  where p_days in (7, 14, 30)
  group by i.id, i.slug, i.nome, i.canal, i.instance_type, i.status;
$$;

create or replace function public.crm_dashboard_leads_period(
  p_days integer,
  p_canal text default null
)
returns table (
  contact_id bigint,
  nome text,
  estagio_funil text,
  lead_score integer,
  lead_score_intent integer,
  lead_score_value integer,
  lead_score_urgency integer,
  lead_score_version text,
  lead_score_updated_at timestamptz,
  lead_score_explanation jsonb,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  valid_orders_count integer,
  valid_orders_value_total numeric,
  average_order_value numeric,
  do_not_contact boolean,
  canal text,
  identificador_canal text,
  instance_id bigint,
  instance_slug text,
  instance_nome text,
  opportunity_id bigint,
  opportunity_priority text,
  next_action_at timestamptz,
  tarefas_abertas integer,
  tarefas_vencidas integer,
  fila_recomendada text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.nome,
    c.estagio_funil,
    c.lead_score,
    c.lead_score_intent,
    c.lead_score_value,
    c.lead_score_urgency,
    c.lead_score_version,
    c.lead_score_updated_at,
    c.lead_score_explanation,
    c.last_inbound_at,
    c.last_outbound_at,
    c.valid_orders_count,
    c.valid_orders_value_total,
    c.average_order_value,
    c.do_not_contact,
    identity.canal,
    identity.external_id,
    i.id,
    i.slug,
    i.nome,
    opportunity.id,
    opportunity.priority,
    opportunity.next_action_at,
    pending_tasks.qtd,
    overdue_tasks.qtd,
    case
      when c.do_not_contact then 'bloqueado'
      when c.lead_score_urgency >= 16 or overdue_tasks.qtd > 0 then 'servico'
      when c.lead_score_intent >= 25
        and c.last_inbound_at >= now() - make_interval(days => p_days) then 'vendas'
      when c.lead_score_value >= 12
        and coalesce(c.last_inbound_at, c.last_order_at, c.criado_em)
          < now() - make_interval(days => p_days) then 'reativacao'
      else 'nutrir'
    end
  from public.crm_contacts c
  left join lateral (
    select cci.*
    from public.crm_contact_channel_identities cci
    where cci.contact_id = c.id
      and (p_canal is null or cci.canal = p_canal)
    order by cci.is_primary desc, cci.last_seen_at desc nulls last, cci.id
    limit 1
  ) identity on true
  left join public.crm_instances i
    on i.id = coalesce(identity.preferred_instance_id, c.origin_instance_id)
  left join lateral (
    select o.*
    from public.crm_opportunities o
    where o.contact_id = c.id
      and o.status = 'aberta'
    order by case o.priority
      when 'critica' then 4
      when 'alta' then 3
      when 'normal' then 2
      else 1
    end desc, o.next_action_at asc nulls last, o.id desc
    limit 1
  ) opportunity on true
  left join lateral (
    select count(*)::integer as qtd
    from public.crm_tasks t
    where t.contact_id = c.id
      and t.status = 'aberta'
  ) pending_tasks on true
  left join lateral (
    select count(*)::integer as qtd
    from public.crm_tasks t
    where t.contact_id = c.id
      and t.status = 'aberta'
      and t.due_at is not null
      and t.due_at < now()
  ) overdue_tasks on true
  where p_days in (7, 14, 30)
    and (p_canal is null or identity.canal = p_canal)
  order by c.lead_score desc nulls last, c.last_inbound_at desc nulls last
  limit 250;
$$;

create or replace function public.crm_dashboard_funnel_period(p_days integer)
returns table (
  estagio_funil text,
  contatos bigint,
  score_medio numeric,
  valor_pedidos_nao_cancelados numeric,
  contatos_com_pedido_nao_cancelado bigint,
  ativos_30d bigint,
  elegiveis_para_acao bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(c.estagio_funil, 'sem_estagio'),
    count(*),
    round(avg(c.lead_score), 1),
    coalesce(sum(c.valid_orders_value_total), 0),
    count(*) filter (where c.valid_orders_count > 0),
    count(*) filter (
      where c.last_inbound_at >= now() - make_interval(days => p_days)
    ),
    count(*) filter (where c.do_not_contact is false)
  from public.crm_contacts c
  where p_days in (7, 14, 30)
  group by coalesce(c.estagio_funil, 'sem_estagio');
$$;

comment on function public.crm_dashboard_instances_period(integer)
is 'Métricas de instâncias para janela de 7, 14 ou 30 dias.';
comment on function public.crm_dashboard_leads_period(integer, text)
is 'Fila de leads por janela e canal; não altera o score histórico.';
comment on function public.crm_dashboard_funnel_period(integer)
is 'Funil com atividade parametrizada por janela.';

grant execute on function public.crm_dashboard_instances_period(integer) to authenticated;
grant execute on function public.crm_dashboard_leads_period(integer, text) to authenticated;
grant execute on function public.crm_dashboard_funnel_period(integer) to authenticated;