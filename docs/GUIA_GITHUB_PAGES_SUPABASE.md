# Guia de implantação — CRM Morena Pitaya

Este projeto é um dashboard React estático. Ele pode ser publicado no GitHub Pages, mas a autenticação e os dados continuam no Supabase. O navegador usará apenas a **publishable key** do Supabase; a chave `service_role` ou secret key nunca pode entrar no repositório, no GitHub Pages ou no código do navegador.

## 1. Preparar autenticação GitHub no Supabase

No Supabase, abra **Authentication → Providers → GitHub** e habilite o provedor. Crie um OAuth App nas configurações de desenvolvedor do GitHub. Use como callback a URL exibida pelo Supabase, no formato:

```text
https://SEU_PROJECT_REF.supabase.co/auth/v1/callback
```

Em **Authentication → URL Configuration**, inclua a URL final do dashboard na lista de Redirect URLs. Para um repositório de projeto, ela costuma ser:

```text
https://SEU_USUARIO.github.io/dashboard-morenapitaya/
```

Se houver um domínio personalizado no arquivo `CNAME`, cadastre também a URL exata do domínio, por exemplo:

```text
https://dashboard.seudominio.com/
```

## 2. Aplicar a política de segurança

No SQL Editor do Supabase, execute o arquivo:

```text
supabase/rls_dashboard_github_auth.sql
```

O script cria uma lista explícita de membros do dashboard, remove o acesso anônimo, mantém usuários autenticados somente em leitura e preserva a escrita para os fluxos de servidor. Ele também configura as views v2 para respeitarem o RLS do usuário que as consulta.

## 3. Adicionar o primeiro administrador

Depois de publicar o site e entrar com GitHub uma vez, abra **Authentication → Users** no Supabase ou consulte `auth.users` no SQL Editor. Copie o UUID do usuário e execute:

```sql
insert into public.crm_dashboard_members (user_id, role)
values ('UUID_DO_USUARIO', 'admin')
on conflict (user_id) do update
set role = excluded.role,
    is_active = true,
    updated_at = now();
```

Repita a operação para cada pessoa autorizada, usando `admin`, `operator` ou `viewer` conforme a futura política operacional.

## 4. Configurar segredos no GitHub

No repositório GitHub, abra **Settings → Secrets and variables → Actions** e crie os dois secrets abaixo:

| Secret | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase, por exemplo `https://SEU_PROJECT_REF.supabase.co` ou o domínio de API configurado. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key do Supabase. Se seu projeto ainda estiver no formato legado, use a anon key temporariamente. |

Esses dois valores são usados apenas para gerar o build do frontend. A publishable key identifica o projeto; o acesso aos dados continua dependente de sessão Supabase e das políticas RLS.

## 5. Habilitar GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` já está preparado para publicar o diretório `dist`. No GitHub, abra **Settings → Pages** e selecione **GitHub Actions** como fonte de publicação.

O build usa a base `/${repository}/`, adequada para `https://usuario.github.io/repositorio/`. Caso um domínio personalizado seja o destino final, ajuste a etapa de build no workflow para:

```yaml
run: pnpm exec vite build --base=/
```

## 6. Verificação operacional

Após o primeiro deploy, confirme nesta ordem:

1. O botão **Entrar com GitHub** redireciona e retorna ao dashboard.
2. Um usuário ainda não incluído em `crm_dashboard_members` não visualiza dados.
3. Um membro ativo visualiza as três views v2 sem erros de RLS.
4. O n8n segue usando uma credencial de servidor e consegue inserir os primeiros contatos, interações, pedidos e produtos.
5. O dashboard exibe estados vazios corretos em vez de números fictícios até a entrada dos primeiros eventos.

## Ponto pendente obrigatório

Antes de declarar a implementação concluída, envie o fluxo n8n que preenche `crm_products`. Ele será validado para garantir deduplicação, mapeamento dos campos de produto e atualização segura do catálogo.

