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

Depois do deploy, copie a URL pública do backend. Exemplo:

```txt
https://hospnow-api.onrender.com
```

## Frontend no GitHub Pages

O workflow `.github/workflows/frontend-pages.yml` publica `frontend/hospnow-web/dist` no GitHub Pages.

No GitHub, configure:

1. `Settings > Pages > Build and deployment > GitHub Actions`
2. `Settings > Secrets and variables > Actions > Variables`
3. Crie a variável `VITE_API_URL` com a URL pública do backend.

Exemplo:

```txt
VITE_API_URL=https://hospnow-api.onrender.com
```

Depois disso, rode novamente o workflow do GitHub Pages.
