/**
 * Morena Pitaya CRM — v2 read layer.
 * Visual direction: real operational signals only; queries consume the curated views rather than reassembling the CRM in the browser.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardOverview, DashboardInstance, FunnelRow, LeadQueueRow } from "@/types/crm";

const asNumber = (value: unknown) => Number(value ?? 0);

export async function loadDashboardOverview(client: SupabaseClient): Promise<DashboardOverview> {
  const [instancesResult, leadsResult, funnelResult] = await Promise.all([
    client.from("vw_dashboard_instances").select("*").order("instance_nome"),
    client
      .from("vw_dashboard_lead_queue")
      .select("*")
      .order("lead_score", { ascending: false, nullsFirst: false })
      .limit(250),
    client.from("vw_dashboard_funil").select("*").order("contatos", { ascending: false }),
  ]);

  const error = instancesResult.error ?? leadsResult.error ?? funnelResult.error;
  if (error) throw error;

  return {
    instances: (instancesResult.data ?? []).map((row) => ({
      ...row,
      interacoes_30d: asNumber(row.interacoes_30d),
      recebidas_30d: asNumber(row.recebidas_30d),
      enviadas_30d: asNumber(row.enviadas_30d),
      contatos_ativos_30d: asNumber(row.contatos_ativos_30d),
      entradas_pendentes: asNumber(row.entradas_pendentes),
    })) as DashboardInstance[],
    leads: (leadsResult.data ?? []).map((row) => ({
      ...row,
      lead_score: asNumber(row.lead_score),
      lead_score_intent: asNumber(row.lead_score_intent),
      lead_score_value: asNumber(row.lead_score_value),
      lead_score_urgency: asNumber(row.lead_score_urgency),
      valid_orders_count: asNumber(row.valid_orders_count),
      valid_orders_value_total: asNumber(row.valid_orders_value_total),
      average_order_value: asNumber(row.average_order_value),
      tarefas_abertas: asNumber(row.tarefas_abertas),
      tarefas_vencidas: asNumber(row.tarefas_vencidas),
    })) as LeadQueueRow[],
    funnel: (funnelResult.data ?? []).map((row) => ({
      ...row,
      contatos: asNumber(row.contatos),
      score_medio: asNumber(row.score_medio),
      valor_pedidos_nao_cancelados: asNumber(row.valor_pedidos_nao_cancelados),
      contatos_com_pedido_nao_cancelado: asNumber(row.contatos_com_pedido_nao_cancelado),
      ativos_30d: asNumber(row.ativos_30d),
      elegiveis_para_acao: asNumber(row.elegiveis_para_acao),
    })) as FunnelRow[],
  };
}

export function exportAsCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escaped = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = `\uFEFF${headers.map(escaped).join(",")}\n${rows.map((row) => row.map(escaped).join(",")).join("\n")}`;
  const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

