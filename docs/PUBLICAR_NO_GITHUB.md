# Publicar o dashboard no GitHub pelo seu computador

Este guia transfere o novo dashboard para `diego-romualdo/dashboard-morenapitaya` usando a sua sessão GitHub local. Não compartilhe senha, token, Client Secret do GitHub OAuth ou credenciais do Supabase.

## O que o pacote contém

O pacote traz a implementação React do dashboard, o workflow do GitHub Pages, o script de RLS já aplicado no Supabase e os documentos de configuração. Ele não traz variáveis `.env`, chaves ou tokens.

## Procedimento pelo terminal

Abra um terminal em uma pasta de trabalho temporária e execute os comandos em ordem. Substitua `CAMINHO_DO_ZIP` pelo arquivo baixado e `CAMINHO_DE_TRABALHO` por uma pasta vazia da sua escolha.

```bash
mkdir -p CAMINHO_DE_TRABALHO
cd CAMINHO_DE_TRABALHO
git clone https://github.com/diego-romualdo/dashboard-morenapitaya.git
unzip CAMINHO_DO_ZIP -d pacote
```

Em seguida, copie os arquivos do pacote para o clone, preservando o arquivo `CNAME` que já existe no repositório. No macOS e Linux:

```bash
cd dashboard-morenapitaya
cp CNAME ../CNAME.bak
rm -rf ./* ./.github
cp -R ../pacote/dashboard-morenapitaya-v2/. .
mv ../CNAME.bak ./CNAME
```

No Windows, a operação de cópia pode ser feita pelo Explorador de Arquivos: abra a pasta `pacote/dashboard-morenapitaya-v2`, copie todo o conteúdo para a pasta clonada `dashboard-morenapitaya`, substitua os arquivos existentes e preserve o arquivo `CNAME`.

Antes do envio, execute:

```bash
git status
git add -A
git commit -m "feat: dashboard CRM autenticado com Supabase v2"
git push origin main
```

Se o `git push` solicitar autenticação, conclua o login pelo GitHub no navegador aberto pelo próprio Git. Depois do envio, verifique que a página do repositório mostra o novo commit.

## O que ocorrerá no repositório

Os arquivos estáticos antigos `index.html`, `style.css` e a imagem local serão substituídos pelo projeto React. O arquivo `CNAME` será preservado. O workflow `.github/workflows/deploy-pages.yml` será incluído para gerar e publicar automaticamente o dashboard a cada envio para a branch `main`.

## Antes de habilitar a publicação

No repositório GitHub, configure os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, conforme descrito em `docs/GUIA_GITHUB_PAGES_SUPABASE.md`. Depois habilite **GitHub Actions** como fonte do GitHub Pages.

