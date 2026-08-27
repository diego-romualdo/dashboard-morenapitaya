# Especificação de referência — CRM Morena Pitaya

## Referência obrigatória

O frontend legado fornecido pelo usuário é a **fonte de verdade visual e de experiência** para esta implementação. A interface deve reproduzir seu painel operacional em tema escuro: barra lateral fixa, marca Morena Pitaya, abas operacionais, indicadores, cartões, gráficos, tabelas, busca, filtros de período, paginação, exportação e estados de carregamento/vazio/erro.

## Direção escolhida

### Design Movement

**Painel editorial noturno de boutique digital.** A interface combina a densidade funcional de um CRM com a elegância de uma marca de moda: azul-marinho profundo, rosa pitaya como sinal de ação e verde orgânico para estados de canal e sucesso.

### Core Principles

1. A barra lateral é uma âncora operacional persistente, com hierarquia clara e transições discretas.
2. Informações comerciais devem ser legíveis à primeira vista, com números grandes, cartões definidos e indicadores contextuais.
3. Gráficos e tabelas devem parecer instrumentos de trabalho: contraste alto, detalhes leves e nenhuma decoração que prejudique a leitura.
4. Estados vazios, de carregamento e de erro fazem parte do produto, sem dados fictícios como fallback.

### Color Philosophy

O azul-marinho quase preto cria foco e contraste para sessões de trabalho longas. O rosa pitaya é reservado a seleção, prioridade e chamadas para ação. O verde é semântico, associado a WhatsApp, sucesso e atividade saudável. Cinzas azulados sustentam a informação secundária.

### Layout Paradigm

Uma faixa lateral fixa organiza os módulos. O conteúdo funciona como uma superfície operacional modular: cabeçalho com filtros, KPIs em faixa, cartões de análise e tabelas responsivas em sequência vertical. Em telas pequenas, a lateral se torna um painel deslizante.

### Signature Elements

1. Fio coral de 3 px nos cartões-chave.
2. Etiquetas compactas de canal, funil e prioridade em tons semânticos.
3. Barras finas para score e frequência, com animação breve ao atualizar.

### Interaction Philosophy

Os controles respondem de forma imediata. Navegação, filtros e paginação atualizam o contexto sem tirar o usuário da superfície de decisão. Ações repetidas mantêm animações mínimas; operações ocasionais recebem feedback visível.

### Animation

Usar transições de 140–220 ms com `cubic-bezier(0.23, 1, 0.32, 1)`. Cartões podem entrar em cascata de forma sutil e indicadores podem preencher de modo breve. Respeitar `prefers-reduced-motion`; não usar animações que escondam ou atrasem dados.

### Typography System

`Playfair Display` para títulos de página, números de KPI e marca; `DM Sans` para interfaces, dados e tabelas. Títulos são serenos e assertivos; rótulos curtos usam caixa alta, peso médio e espaçamento moderado.

### Brand Essence

**CRM operacional para a Morena Pitaya transformar conversas, interesse de produto e pedidos em decisões comerciais claras.**

Personalidade: **editorial, ágil, acolhedora**.

### Brand Voice

Títulos são diretos e focados em ação; microcopy esclarece o estado do dado sem prometer além do que existe.

Exemplos: “Priorize quem demonstrou intenção agora.” e “Nenhum código foi identificado neste período.”

### Wordmark & Logo

Usar o nome Morena Pitaya como wordmark editorial em Playfair Display, em rosa pitaya, com subtítulo técnico em caixa alta. A marca deve funcionar sem símbolo decorativo obrigatório e utilizar o ativo original do repositório quando disponível.

### Signature Brand Color

**Pitaya Pulse — `#e8375a`**.

## Decisões funcionais obrigatórias

- O frontend deve usar as views v2: `vw_dashboard_instances`, `vw_dashboard_lead_queue` e `vw_dashboard_funil`.
- O dashboard deve exigir sessão Supabase antes de carregar dados.
- Não haverá dados de demonstração quando uma consulta falhar.
- Nenhuma chave `service_role` ou secret key poderá ser incluída no frontend.
- A revisão do fluxo n8n que popula `crm_products` ocorrerá antes da conclusão do processo.
