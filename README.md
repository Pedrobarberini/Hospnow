# HospNow

HospNow é uma aplicação full stack que ajuda usuários a encontrar hospitais e clínicas compatíveis com seus planos de saúde. O projeto simula uma rede credenciada, com listagem de hospitais, filtros, mapa interativo, geolocalização, busca manual por endereço e uma API publicada em ambiente gratuito.

## Demonstração

- Frontend: https://pedrobarberini.github.io/Hospnow/
- Backend API: https://hospnow.onrender.com

> O backend está hospedado no plano gratuito do Render. Por isso, a primeira requisição pode demorar um pouco quando o serviço estiver "dormindo".

## Objetivo do Projeto

A proposta do HospNow é resolver uma dúvida comum de usuários de planos de saúde: "quais hospitais aceitam meu convênio perto de mim?"

Na aplicação, o usuário pode:

- Visualizar hospitais e clínicas em uma interface moderna.
- Filtrar hospitais por plano de saúde.
- Filtrar hospitais por especialidade médica.
- Ver os hospitais em um mapa interativo.
- Usar a localização atual do navegador.
- Digitar um endereço manualmente.
- Comparar a própria localização com a localização dos hospitais.
- Ordenar os hospitais mais próximos.

## Texto Para Portfólio

O HospNow é uma plataforma full stack desenvolvida para simular a busca por hospitais e clínicas compatíveis com planos de saúde. A aplicação conecta um frontend em React a uma API REST em Spring Boot, utilizando PostgreSQL como banco de dados relacional.

No frontend, o usuário consegue visualizar hospitais em cards, aplicar filtros por plano de saúde e especialidade médica, utilizar geolocalização, informar um endereço manualmente e acompanhar os resultados em um mapa interativo com OpenStreetMap e Leaflet.

No backend, a aplicação organiza entidades como usuários, hospitais, planos de saúde e especialidades médicas, com relacionamentos muitos-para-muitos entre hospitais, planos e especialidades. A API expõe endpoints REST para listagem, cadastro e busca filtrada dos dados.

O projeto também foi preparado para deploy gratuito, utilizando GitHub Pages para o frontend, Render para o backend em Docker e Neon como banco PostgreSQL em nuvem. Além da implementação funcional, o projeto demonstra boas práticas de separação entre frontend e backend, configuração por variáveis de ambiente, proteção de credenciais sensíveis e integração entre serviços externos.

## Tecnologias Utilizadas

### Frontend

**React**

React foi utilizado para construir a interface do usuário. A aplicação foi dividida em componentes reutilizáveis, como cards de hospitais, filtros, cabeçalho e visualização do mapa. Ele também controla os estados da tela, como plano selecionado, especialidade selecionada, localização do usuário e lista de hospitais retornada pela API.

**TypeScript**

TypeScript foi utilizado no frontend para adicionar tipagem estática ao projeto. Ele define estruturas como `Hospital`, `HealthPlan` e os dados utilizados pelos serviços, ajudando a reduzir erros e deixando a integração com a API mais segura.

**Vite**

Vite foi utilizado como ferramenta de build e desenvolvimento do frontend. Ele fornece um servidor local rápido durante o desenvolvimento e gera os arquivos finais da aplicação para publicação no GitHub Pages.

**Axios**

Axios foi utilizado para fazer as requisições HTTP do frontend para o backend. Ele aparece nos serviços responsáveis por consumir endpoints como `/hospitals`, `/plans`, `/specialties` e `/hospitals/search`.

**Leaflet**

Leaflet foi utilizado para renderizar o mapa interativo da aplicação. Com ele, os hospitais são exibidos como marcadores no mapa, permitindo uma visualização geográfica da rede credenciada.

**React Leaflet**

React Leaflet foi utilizado para integrar o Leaflet ao ecossistema React. Isso permite trabalhar com o mapa usando componentes React, mantendo o padrão de desenvolvimento do frontend.

**OpenStreetMap**

OpenStreetMap foi utilizado como fonte dos mapas exibidos pelo Leaflet. Ele permite que o projeto tenha mapas funcionais sem depender de uma solução paga.

### Backend

**Java 21**

Java 21 foi utilizado como linguagem principal do backend. Ele sustenta a API da aplicação, as regras de negócio e a estrutura de entidades, serviços, controllers e repositórios.

**Spring Boot 4**

Spring Boot foi utilizado para criar a API REST do projeto. Ele simplifica a configuração da aplicação, o gerenciamento de dependências, a criação de endpoints e a integração com o banco de dados.

**Spring Web MVC**

Spring Web MVC foi utilizado para expor as rotas HTTP da API. Os controllers, como `HospitalController`, `HealthPlanController`, `SpecialtyController` e `ApiStatusController`, recebem as requisições do frontend e retornam os dados em formato JSON.

**Spring Data JPA**

Spring Data JPA foi utilizado para facilitar o acesso ao banco de dados por meio de repositórios. Ele reduz a necessidade de escrever SQL manualmente e permite criar consultas como busca de hospitais por plano de saúde ou especialidade.

**Hibernate**

Hibernate foi utilizado como implementação JPA. Ele faz o mapeamento entre as entidades Java e as tabelas do banco de dados, incluindo relacionamentos muitos-para-muitos entre hospitais, planos e especialidades.

**PostgreSQL**

PostgreSQL foi utilizado como banco de dados relacional. Ele armazena usuários, hospitais, planos de saúde, especialidades e tabelas de relacionamento. No ambiente local, o projeto usa PostgreSQL instalado na máquina; no deploy, usa Neon PostgreSQL.

**Lombok**

Lombok foi utilizado para reduzir código repetitivo no backend, como getters, setters e construtores em entidades e DTOs.

### Deploy e Infraestrutura

**GitHub**

GitHub foi utilizado para versionar o código, organizar o histórico de commits e hospedar o repositório do projeto.

**GitHub Pages**

GitHub Pages foi utilizado para publicar o frontend. Como o frontend é uma aplicação estática gerada pelo Vite, ele pode ser hospedado diretamente no Pages.

**GitHub Actions**

GitHub Actions foi utilizado para automatizar o deploy do frontend. A cada push na branch principal, o workflow instala as dependências, gera o build do React e publica a pasta `dist` no GitHub Pages.

**Render**

Render foi utilizado para hospedar o backend Spring Boot. Como a tela de criação do serviço não oferecia runtime Java diretamente, o backend foi preparado para rodar via Docker.

**Docker**

Docker foi utilizado para empacotar o backend. O `Dockerfile` compila o projeto com Java 21, gera o arquivo `.jar` e inicia a aplicação no ambiente de produção.

**Neon**

Neon foi utilizado como banco PostgreSQL em nuvem. Ele permite que o backend publicado no Render acesse um banco online sem depender do banco local da máquina.

## Funcionalidades Principais

- Listagem de hospitais e clínicas.
- Cards com nome, endereço, telefone, planos e especialidades.
- Filtro por plano de saúde.
- Filtro por especialidade médica.
- Busca combinada por plano e especialidade.
- Mapa interativo com marcadores dos hospitais.
- Uso da localização atual do usuário.
- Busca manual por endereço.
- Cálculo de distância.
- Ordenação por hospitais mais próximos.
- Dados iniciais para simulação.
- Deploy completo com frontend, backend e banco em serviços separados.

## Arquitetura do Projeto

```txt
HospNow
├── backend/hospnow-api
│   ├── controller
│   ├── dto
│   ├── entity
│   ├── repository
│   ├── service
│   └── config
└── frontend/hospnow-web
    ├── components
    ├── pages
    ├── services
    └── types
```

## Principais Endpoints

```txt
GET  /
GET  /hospitals
POST /hospitals
GET  /hospitals/plan/{nomePlano}
GET  /hospitals/specialty/{nomeEspecialidade}
GET  /hospitals/search?plan={plan}&specialty={specialty}
GET  /plans
POST /plans
GET  /specialties
POST /specialties
GET  /users
POST /users
```

## Modelo de Dados

Principais entidades:

- `User`: representa os usuários da plataforma.
- `HealthPlan`: representa os planos de saúde.
- `Hospital`: representa hospitais e clínicas.
- `Specialty`: representa especialidades médicas.

Relacionamentos importantes:

- Um hospital pode aceitar vários planos de saúde.
- Um plano de saúde pode ser aceito por vários hospitais.
- Um hospital pode ter várias especialidades.

## Segurança e Configuração

O projeto evita publicar credenciais reais no repositório. Dados sensíveis são configurados por variáveis de ambiente:

```txt
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
SPRING_PROFILES_ACTIVE
APP_ALLOWED_ORIGINS
```

No ambiente local, credenciais do banco devem ficar em `application-local.properties`, arquivo ignorado pelo Git.

## Como Rodar Localmente

### Backend

```bash
cd backend/hospnow-api
./mvnw spring-boot:run
```

No Windows:

```bash
cd backend/hospnow-api
./mvnw.cmd spring-boot:run
```

### Frontend

```bash
cd frontend/hospnow-web
npm install
npm run dev
```

O frontend local roda em:

```txt
http://localhost:5173
```

## Deploy

A estratégia atual de deploy gratuito é:

- Frontend: GitHub Pages
- Backend: Render com Docker
- Banco de dados: Neon PostgreSQL

Mais detalhes estão no arquivo `DEPLOY.md`.

## Melhorias Futuras

- Autenticação com JWT.
- Tela de login integrada ao backend.
- Tela de cadastro integrada ao backend.
- Favoritar hospitais.
- Página de detalhes do hospital.
- Integração com dados reais de hospitais.
- Filtros avançados por cidade, distância e pronto atendimento.
- Testes automatizados para services e controllers.
- Pipeline de CI para validação do backend.
