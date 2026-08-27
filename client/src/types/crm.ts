/** Morena Pitaya CRM — normalized read models from the Supabase v2 dashboard views. */
export type DashboardInstance = {
  instance_id: number;
  instance_slug: string;
  instance_nome: string;
  canal: string;
  instance_type: string;
  status: string;
  interacoes_30d: number;
  recebidas_30d: number;
  enviadas_30d: number;
  contatos_ativos_30d: number;
  tempo_medio_resposta_segundos: number | null;
  entradas_pendentes: number;
};

export type LeadQueueRow = {
  contact_id: number;
  nome: string | null;
  estagio_funil: string | null;
  lead_score: number | null;
  lead_score_intent: number | null;
  lead_score_value: number | null;
  lead_score_urgency: number | null;
  lead_score_version: string | null;
  lead_score_updated_at: string | null;
  lead_score_explanation: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  valid_orders_count: number | null;
  valid_orders_value_total: number | null;
  average_order_value: number | null;
  do_not_contact: boolean | null;
  canal: string | null;
  identificador_canal: string | null;
  instance_id: number | null;
  instance_slug: string | null;
  instance_nome: string | null;
  opportunity_id: number | null;
  opportunity_priority: string | null;
  next_action_at: string | null;
  tarefas_abertas: number | null;
  tarefas_vencidas: number | null;
  fila_recomendada: string | null;
};

export type FunnelRow = {
  estagio_funil: string | null;
  contatos: number;
  score_medio: number | null;
  valor_pedidos_nao_cancelados: number | null;
  contatos_com_pedido_nao_cancelado: number | null;
  ativos_30d: number;
  elegiveis_para_acao: number;
};

export type DashboardOverview = {
  instances: DashboardInstance[];
  leads: LeadQueueRow[];
  funnel: FunnelRow[];
};

