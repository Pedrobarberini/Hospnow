# Deploy do HospNow

## Segurança

Não publique credenciais reais no GitHub. O backend lê as credenciais por variáveis de ambiente:

- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`

Para desenvolvimento local, copie `backend/hospnow-api/src/main/resources/application-local.example.properties` para `application-local.properties` e preencha seus dados locais. Esse arquivo está no `.gitignore`.

Se uma senha real já foi exposta em commit, troque a senha no banco antes de publicar o repositório.

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

## Backend

GitHub Pages não executa Spring Boot. Publique o backend em Render, Railway, Fly.io, VPS ou outro provedor Java.

No provedor do backend, configure as variáveis:

```txt
DATABASE_URL=jdbc:postgresql://host:5432/database
DATABASE_USERNAME=usuario
DATABASE_PASSWORD=senha
SPRING_PROFILES_ACTIVE=prod
```
