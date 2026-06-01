# Deploy do HospNow

## Arquitetura gratuita recomendada

- Frontend: GitHub Pages
- Backend: Render Web Service no plano Free
- Banco: Neon PostgreSQL no plano Free

O GitHub Pages publica apenas arquivos estáticos. O backend Spring Boot e o PostgreSQL precisam rodar em serviços separados.

## Segurança

Não publique credenciais reais no GitHub. O backend lê as credenciais por variáveis de ambiente:

- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `APP_ALLOWED_ORIGINS`
- `ADMIN_IMPORT_KEY`

Para desenvolvimento local, copie `backend/hospnow-api/src/main/resources/application-local.example.properties` para `application-local.properties` e preencha seus dados locais. Esse arquivo está no `.gitignore`.

Se uma senha real já foi exposta em commit, troque a senha no banco antes de publicar o repositório.

## Banco gratuito no Neon

1. Crie uma conta em https://neon.com
2. Crie um projeto PostgreSQL.
3. Copie a connection string.
4. Separe os dados para o Spring:

- `DATABASE_URL`: use a URL JDBC no formato `jdbc:postgresql://host-do-neon/database?sslmode=require`
- `DATABASE_USERNAME`: use o usuário informado pelo Neon
- `DATABASE_PASSWORD`: use a senha informada pelo Neon

O prefixo `jdbc:` é importante para Spring Boot.

## Backend gratuito no Render

1. Crie uma conta em https://render.com
2. New > Web Service
3. Conecte o repositório `Pedrobarberini/Hospnow`
4. Configure:

```txt
Root Directory: backend/hospnow-api
Language: Docker
Dockerfile Path: Dockerfile
Instance Type: Free
```

5. Se o Render pedir build/start command, deixe em branco quando estiver usando Docker.
6. Em Environment Variables, configure:

- `DATABASE_URL`: URL JDBC do Neon
- `DATABASE_USERNAME`: usuário do Neon
- `DATABASE_PASSWORD`: senha do Neon
- `SPRING_PROFILES_ACTIVE`: `prod`
- `APP_ALLOWED_ORIGINS`: `https://pedrobarberini.github.io`
- `ADMIN_IMPORT_KEY`: uma chave forte para proteger `POST /admin/imports/*`

Depois do deploy, copie a URL pública do backend. Exemplo:

```txt
https://hospnow-api.onrender.com
```

## Importação oficial CNES e ANS

Depois que o backend estiver no ar e o `ADMIN_IMPORT_KEY` estiver configurado, você pode importar hospitais oficiais por município:

```bash
curl -X POST "https://hospnow.onrender.com/admin/imports/cnes?codigoMunicipio=355280&limit=40" \
  -H "X-Import-Key: sua-chave"
```

Para vincular planos reais da ANS aos hospitais importados pelo CNES:

```bash
curl -X POST "https://hospnow.onrender.com/admin/imports/ans?maxRows=250000" \
  -H "X-Import-Key: sua-chave"
```

A importação da ANS usa uma base grande; em plano gratuito, prefira limites menores e rode só quando precisar atualizar a demonstração.

## Atualização automática via GitHub Actions

O arquivo `.github/workflows/official-data-import.yml` chama as rotas de importação sem expor a chave no repositório.

No GitHub, configure:

1. `Settings > Secrets and variables > Actions > Secrets`
2. Crie a secret `ADMIN_IMPORT_KEY` com a mesma chave cadastrada no Render.
3. Opcionalmente, em `Variables`, crie `HOSPNOW_API_URL` se a URL do backend mudar.

Depois disso, o workflow:

- Roda toda segunda-feira para atualizar hospitais do CNES.
- Roda no primeiro dia de cada mês para tentar vincular planos da ANS lendo apenas os CSVs das UFs importadas.
- Pode ser acionado manualmente em `Actions > Refresh official health data > Run workflow`.

## Frontend no GitHub Pages

O workflow `.github/workflows/frontend-pages.yml` publica `frontend/hospnow-web/dist` no GitHub Pages.

No GitHub, configure:

1. `Settings > Pages > Build and deployment > GitHub Actions`
2. `Settings > Secrets and variables > Actions > Variables`
3. Opcionalmente, crie a variável `VITE_API_URL` com a URL pública do backend.

Exemplo:

```txt
VITE_API_URL=https://hospnow-api.onrender.com
```

Se essa variável não existir, o frontend publicado usa `https://hospnow.onrender.com` como URL de produção.

Depois disso, rode novamente o workflow do GitHub Pages.
