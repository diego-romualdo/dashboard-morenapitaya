/**
 * Morena Pitaya CRM — editorial night dashboard.
 * Design reference: legacy Claude dashboard. Deep navy workspace, Pitaya Pulse selection color, editorial Playfair headlines, compact data cards, and no fabricated operational data.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  BellDot,
  ChevronRight,
  CircleAlert,
  DatabaseZap,
  Download,
  ExternalLink,
  Inbox,
  Instagram,
  LogOut,
  Menu,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { exportAsCsv, loadDashboardOverview } from "@/lib/dashboard";
import { isSupabaseConfigured, supabase, supabaseConfigurationHint } from "@/lib/supabase";
import type { DashboardOverview, FunnelRow, LeadQueueRow } from "@/types/crm";

type TabId = "geral" | "reativacao_ig" | "reativacao_wa" | "interacoes" | "procurados";

const BRAND_SYMBOL = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663028630151/VHZiItUcBQsMjRvb.png";
const AUTH_ART = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663028630151/IWiiPswKjDkPIuDo.jpg";
const DECISION_ART = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663028630151/QSgUWQwjvATusOrv.jpg";
const PRODUCT_ART = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663028630151/qQTOJSBqlxSyWyNj.jpg";

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "geral", label: "Visão geral", icon: BarChart3 },
  { id: "reativacao_ig", label: "Ativação Instagram", icon: Instagram },
  { id: "reativacao_wa", label: "Ativação WhatsApp", icon: MessageCircle },
  { id: "interacoes", label: "Interações", icon: Inbox },
  { id: "procurados", label: "Mais procurados", icon: PackageSearch },
];

const stageColors: Record<string, string> = {
  lead: "#7a94b0",
  qualificado: "#f39c12",
  cliente: "#2ecc71",
  vip: "#e8375a",
};

const statusLabel: Record<string, string> = {
  agir_agora: "Agir agora",
  prioritario: "Prioritário",
  acompanhar: "Acompanhar",
  nutrir: "Nutrir",
};

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function initials(name: string | null) {
  const parts = (name ?? "Contato").trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]).join("").toUpperCase();
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
}

function EmptyState({ icon: Icon, title, description, compact = false }: { icon: LucideIcon; title: string; description: string; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? "empty-state--compact" : ""}`}>
      <span className="empty-state__icon"><Icon size={compact ? 18 : 26} strokeWidth={1.65} /></span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, tone = "pitaya", icon: Icon }: { label: string; value: string; hint: string; tone?: "pitaya" | "instagram" | "whatsapp" | "olive"; icon: LucideIcon }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top"><span>{label}</span><Icon size={17} strokeWidth={1.8} /></div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function LeadCard({ lead, channel }: { lead: LeadQueueRow; channel: "instagram" | "whatsapp" }) {
  const score = Math.min(100, Math.max(0, Number(lead.lead_score ?? 0)));
  const inactiveDays = daysSince(lead.last_inbound_at ?? lead.last_outbound_at);
  const isInstagram = channel === "instagram";
  return (
    <article className="lead-card">
      <div className="lead-card__head">
        <div className={`lead-avatar ${isInstagram ? "lead-avatar--ig" : "lead-avatar--wa"}`}>{initials(lead.nome)}</div>
        <div className="lead-card__identity"><strong title={lead.nome ?? undefined}>{lead.nome ?? "Contato sem nome"}</strong><span>{lead.identificador_canal ?? "Identificador indisponível"}</span></div>
        <span className={`channel-badge ${isInstagram ? "channel-badge--ig" : "channel-badge--wa"}`}>{isInstagram ? "Instagram" : "WhatsApp"}</span>
      </div>
      <div className="lead-card__stats">
        <div><span>{inactiveDays === null ? "—" : inactiveDays}</span><small>dias sem entrada</small></div>
        <div><span>{formatNumber(lead.valid_orders_count)}</span><small>pedidos válidos</small></div>
      </div>
      <div className="lead-card__tags">
        {lead.estagio_funil && <span className={`stage-badge stage-badge--${lead.estagio_funil}`}>{lead.estagio_funil}</span>}
        <span className={`queue-badge queue-badge--${lead.fila_recomendada ?? "nutrir"}`}>{statusLabel[lead.fila_recomendada ?? "nutrir"] ?? "Em análise"}</span>
      </div>
      <div className="score-line"><span>Lead score</span><div><i style={{ width: `${score}%` }} /></div><strong>{score}</strong></div>
      <p className="lead-card__hint">Última atividade: {formatDate(lead.last_inbound_at ?? lead.last_outbound_at)}</p>
    </article>
  );
}

function LoginScreen({ onSignIn, busy, error }: { onSignIn: () => void; busy: boolean; error: string | null }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__art" style={{ backgroundImage: `linear-gradient(90deg, rgba(15,25,35,.95) 0%, rgba(15,25,35,.72) 48%, rgba(15,25,35,.22) 100%), url(${AUTH_ART})` }} />
      <div className="auth-card-wrap">
        <main className="auth-card">
          <div className="brand-lockup"><img src={BRAND_SYMBOL} alt="Símbolo Morena Pitaya" /><div><span>Morena Pitaya</span><small>CRM Dashboard</small></div></div>
          <div className="auth-card__copy"><p className="eyebrow">Superfície de decisão</p><h1>Conversa, intenção e oportunidade em um único ritmo.</h1><p>Entre para acompanhar as filas comerciais, a saúde dos canais e os sinais que pedem ação.</p></div>
          {!isSupabaseConfigured && (
            <div className="auth-config-note"><ShieldCheck size={18} /><div><strong>Configuração pendente</strong><p>{supabaseConfigurationHint}</p></div></div>
          )}
          {error && <div className="auth-error"><CircleAlert size={17} /> {error}</div>}
          <button className="sign-in-button" type="button" disabled={!isSupabaseConfigured || busy} onClick={onSignIn}>
            {busy ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />} {busy ? "Redirecionando…" : "Entrar com GitHub"}
            <ChevronRight size={17} />
          </button>
          <p className="auth-card__footnote">Acesso restrito à operação Morena Pitaya.</p>
        </main>
      </div>
    </div>
  );
}

function DashboardApp({ session }: { session: Session }) {
  const [tab, setTab] = useState<TabId>("geral");
  const [menuOpen, setMenuOpen] = useState(false);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const data = await loadDashboardOverview(supabase);
      setOverview(data);
      setLoadError(null);
      setUpdatedAt(new Date());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados do CRM.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const metrics = useMemo(() => {
    const instances = overview?.instances ?? [];
    const leads = overview?.leads ?? [];
    return {
      totalLeads: leads.length,
      interactions: instances.reduce((sum, instance) => sum + Number(instance.interacoes_30d ?? 0), 0),
      instagram: instances.filter((instance) => instance.canal === "instagram").reduce((sum, instance) => sum + Number(instance.interacoes_30d ?? 0), 0),
      whatsapp: instances.filter((instance) => instance.canal === "whatsapp").reduce((sum, instance) => sum + Number(instance.interacoes_30d ?? 0), 0),
      pending: instances.reduce((sum, instance) => sum + Number(instance.entradas_pendentes ?? 0), 0),
      actionNow: leads.filter((lead) => lead.fila_recomendada === "agir_agora").length,
      activeInstances: instances.filter((instance) => instance.status === "ativa").length,
      validValue: leads.reduce((sum, lead) => sum + Number(lead.valid_orders_value_total ?? 0), 0),
    };
  }, [overview]);

  const visibleLeads = useMemo(() => {
    const source = overview?.leads ?? [];
    if (tab === "reativacao_ig") return source.filter((lead) => lead.canal === "instagram");
    if (tab === "reativacao_wa") return source.filter((lead) => lead.canal === "whatsapp");
    return source;
  }, [overview, tab]);

  const funnel = overview?.funnel ?? [];
  const channelData = useMemo(() => [
    { name: "Instagram", value: metrics.instagram, color: "#c13584" },
    { name: "WhatsApp", value: metrics.whatsapp, color: "#25d366" },
  ].filter((item) => item.value > 0), [metrics]);

  const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.user_name || session.user.email?.split("@")[0] || "Operação";

  const exportLeads = () => {
    exportAsCsv("fila-de-leads-morena-pitaya.csv", ["Contato", "Canal", "Estágio", "Score", "Fila", "Pedidos válidos", "Valor não cancelado", "Última atividade"], visibleLeads.map((lead) => [lead.nome, lead.canal, lead.estagio_funil, lead.lead_score, lead.fila_recomendada, lead.valid_orders_count, lead.valid_orders_value_total, lead.last_inbound_at ?? lead.last_outbound_at]));
  };

  const signOut = async () => { await supabase?.auth.signOut(); };

  const renderGeneral = () => (
    <>
      <section className="metrics-grid">
        <MetricCard label="Leads na fila" value={loading ? "—" : formatNumber(metrics.totalLeads)} hint="leads elegíveis para ação" icon={UsersRound} />
        <MetricCard label="Interações · 30 dias" value={loading ? "—" : formatNumber(metrics.interactions)} hint="somatório das instâncias" tone="olive" icon={Activity} />
        <MetricCard label="Instagram · 30 dias" value={loading ? "—" : formatNumber(metrics.instagram)} hint="interações registradas" tone="instagram" icon={Instagram} />
        <MetricCard label="WhatsApp · 30 dias" value={loading ? "—" : formatNumber(metrics.whatsapp)} hint="interações registradas" tone="whatsapp" icon={MessageCircle} />
      </section>
      <section className="dashboard-grid dashboard-grid--wide">
        <article className="panel panel--hero">
          <img className="panel__art" src={DECISION_ART} alt="" aria-hidden="true" />
          <div className="panel__heading"><div><p className="eyebrow">Fila comercial</p><h2>Sinais que pedem uma decisão agora</h2></div><span className="live-chip"><i /> Atualização automática</span></div>
          {loading ? <div className="panel-loading"><RefreshCw className="spin" size={20} /> Lendo as views v2…</div> : metrics.actionNow ? <div className="hero-number"><strong>{formatNumber(metrics.actionNow)}</strong><p>contato{metrics.actionNow === 1 ? "" : "s"} com ação recomendada agora</p></div> : <EmptyState icon={BellDot} title="Nenhuma urgência na fila" description="Quando contatos elegíveis entrarem no CRM, as prioridades aparecerão aqui." />}
          <div className="hero-strip"><span><strong>{formatNumber(metrics.activeInstances)}</strong> instâncias ativas</span><span><strong>{formatNumber(metrics.pending)}</strong> entradas pendentes</span><span><strong>{formatCurrency(metrics.validValue)}</strong> valor de pedidos não cancelados</span></div>
        </article>
        <article className="panel panel--chart"><div className="panel__heading"><div><p className="eyebrow">Saúde de relacionamento</p><h2>Estágio do funil</h2></div><BarChart3 size={19} /></div>{funnel.length ? <div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 18, top: 8, bottom: 6 }}><XAxis type="number" hide /><YAxis type="category" dataKey="estagio_funil" axisLine={false} tickLine={false} width={84} tick={{ fill: "#9badc0", fontSize: 11 }} /><Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} contentStyle={{ background: "#162030", border: "1px solid #243448", borderRadius: 10, color: "#e8edf3" }} /><Bar dataKey="contatos" radius={[0, 5, 5, 0]}>{funnel.map((row: FunnelRow, index) => <Cell key={`${row.estagio_funil}-${index}`} fill={stageColors[row.estagio_funil ?? ""] ?? "#7a94b0"} />)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyState icon={BarChart3} title="Funil aguardando contatos" description="A distribuição aparecerá depois da primeira ingestão." compact />}</article>
      </section>
      <section className="dashboard-grid">
        <article className="panel"><div className="panel__heading"><div><p className="eyebrow">Canais</p><h2>Interações por origem</h2></div><MessageCircle size={19} /></div>{channelData.length ? <div className="chart-frame chart-frame--donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={channelData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={4}>{channelData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ background: "#162030", border: "1px solid #243448", borderRadius: 10, color: "#e8edf3" }} /></PieChart></ResponsiveContainer></div> : <EmptyState icon={MessageCircle} title="Sem interações na janela" description="As instâncias já estão prontas para registrar conversas." compact />}</article>
        <article className="panel"><div className="panel__heading"><div><p className="eyebrow">Instâncias</p><h2>Canal a canal</h2></div><span className="panel-counter">{formatNumber(overview?.instances.length ?? 0)}</span></div><div className="instance-list">{overview?.instances.length ? overview.instances.map((instance) => <div className="instance-row" key={instance.instance_id}><span className={`instance-dot instance-dot--${instance.canal}`} /><div><strong>{instance.instance_nome}</strong><small>{instance.instance_type} · {instance.status}</small></div><b>{formatNumber(instance.interacoes_30d)}<small>interações</small></b></div>) : <EmptyState icon={DatabaseZap} title="Instâncias não disponíveis" description="A view de instâncias ainda não retornou registros." compact />}</div></article>
      </section>
    </>
  );

  const renderActivation = (channel: "instagram" | "whatsapp") => {
    const Icon = channel === "instagram" ? Instagram : MessageCircle;
    const channelName = channel === "instagram" ? "Instagram" : "WhatsApp";
    return <section className="panel tab-panel"><div className="panel__heading"><div><p className="eyebrow">Fila de reativação</p><h2>Ativação {channelName}</h2><p className="subcopy">Leads da view v2 por canal, ordenados por score e sinal de ação.</p></div><button className="outline-button" type="button" onClick={exportLeads}><Download size={15} /> Exportar CSV</button></div>{visibleLeads.length ? <div className="lead-grid">{visibleLeads.map((lead) => <LeadCard key={lead.contact_id} lead={lead} channel={channel} />)}</div> : <EmptyState icon={Icon} title={`Nenhum contato ${channelName} na fila`} description="A lista será preenchida pelos fluxos de ingestão e pelas regras da fila v2." />}</section>;
  };

  const renderInteractions = () => <section className="panel tab-panel"><div className="panel__heading"><div><p className="eyebrow">Operação dos canais</p><h2>Interações por instância</h2><p className="subcopy">Janela móvel de 30 dias, consultada diretamente da view de instâncias.</p></div><span className="live-chip"><i /> 30 dias</span></div>{overview?.instances.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Instância</th><th>Canal</th><th>Recebidas</th><th>Enviadas</th><th>Ativos</th><th>Pendentes</th></tr></thead><tbody>{overview.instances.map((instance) => <tr key={instance.instance_id}><td><strong>{instance.instance_nome}</strong><small>{instance.instance_slug}</small></td><td><span className={`channel-badge channel-badge--${instance.canal === "instagram" ? "ig" : instance.canal === "whatsapp" ? "wa" : "neutral"}`}>{instance.canal}</span></td><td>{formatNumber(instance.recebidas_30d)}</td><td>{formatNumber(instance.enviadas_30d)}</td><td>{formatNumber(instance.contatos_ativos_30d)}</td><td><span className={instance.entradas_pendentes ? "pending-count" : "muted-count"}>{formatNumber(instance.entradas_pendentes)}</span></td></tr>)}</tbody></table></div> : <EmptyState icon={Inbox} title="Sem interações registradas" description="Assim que o n8n inserir eventos, o painel passará a indicar o ritmo de cada canal." />}</section>;

  const renderProducts = () => <section className="panel tab-panel product-panel"><img src={PRODUCT_ART} className="product-panel__art" alt="" aria-hidden="true" /><div className="panel__heading"><div><p className="eyebrow">Demanda de produto</p><h2>Mais procurados</h2><p className="subcopy">Este módulo será ativado assim que o fluxo n8n sincronizar o catálogo em <code>crm_products</code> e registrar mensagens de produto.</p></div><span className="coming-chip">Próxima integração</span></div><div className="product-panel__body"><EmptyState icon={PackageSearch} title="Catálogo aguardando sincronização" description="No momento, crm_products não possui registros. O fluxo n8n de produtos será revisado antes da ativação deste ranking." /><button className="outline-button" type="button" onClick={() => setTab("interacoes")}><ArrowDownToLine size={15} /> Ver saúde dos canais</button></div></section>;

  const title = tabs.find((item) => item.id === tab)?.label ?? "Dashboard operacional";
  return (
    <div className="dashboard-shell">
      <button className="mobile-menu" aria-label="Abrir menu" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
      <div className={`mobile-scrim ${menuOpen ? "mobile-scrim--visible" : ""}`} onClick={() => setMenuOpen(false)} />
      <aside className={`dashboard-sidebar ${menuOpen ? "dashboard-sidebar--open" : ""}`}>
        <div className="sidebar-brand"><img src={BRAND_SYMBOL} alt="Símbolo Morena Pitaya" /><div><strong>Morena Pitaya</strong><small>CRM Dashboard</small></div><button type="button" className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div>
        <nav className="sidebar-nav" aria-label="Navegação principal">{tabs.map(({ id, label, icon: Icon }) => <button type="button" className={tab === id ? "active" : ""} key={id} onClick={() => { setTab(id); setMenuOpen(false); }}><Icon size={17} /><span>{label}</span>{id === "geral" && <i className="realtime-dot" />}</button>)}</nav>
        <div className="sidebar-footer"><span><i className="realtime-dot" /> Atualização 60s</span><small>Camada de decisão v2</small></div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header"><div><p className="eyebrow">Operação Morena Pitaya</p><h1>{title}</h1></div><div className="header-actions"><span className="last-update">{updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Conectando às views…"}</span><button className="refresh-button" onClick={() => void refresh()} type="button" disabled={loading}>{loading ? <RefreshCw className="spin" size={16} /> : <RefreshCw size={16} />}<span>Atualizar</span></button><div className="user-menu"><span>{String(userName).slice(0, 2).toUpperCase()}</span><button title="Sair" type="button" onClick={() => void signOut()}><LogOut size={16} /></button></div></div></header>
        {loadError && <div className="data-error"><CircleAlert size={18} /><div><strong>Não foi possível consultar as views do CRM.</strong><p>{loadError}. Verifique as políticas RLS para usuários autenticados e tente novamente.</p></div><button type="button" onClick={() => void refresh()}>Tentar novamente</button></div>}
        {tab === "geral" && renderGeneral()}
        {tab === "reativacao_ig" && renderActivation("instagram")}
        {tab === "reativacao_wa" && renderActivation("whatsapp")}
        {tab === "interacoes" && renderInteractions()}
        {tab === "procurados" && renderProducts()}
      </main>
    </div>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setCheckingSession(false); return; }
    void supabase.auth.getSession().then(({ data, error }) => { setSession(data.session); setAuthError(error?.message ?? null); setCheckingSession(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setCheckingSession(false); });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!supabase) return;
    setAuthBusy(true); setAuthError(null);
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo } });
    if (error) { setAuthError(error.message); setAuthBusy(false); }
  };

  if (checkingSession && isSupabaseConfigured) return <div className="boot-screen"><img src={BRAND_SYMBOL} alt="" /><span>Preparando sua superfície de decisão…</span></div>;
  if (!session) return <LoginScreen onSignIn={() => void signIn()} busy={authBusy} error={authError} />;
  return <DashboardApp session={session} />;
}
