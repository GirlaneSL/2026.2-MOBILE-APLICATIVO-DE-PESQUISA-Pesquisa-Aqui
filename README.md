# Pesquisa Aqui

Plataforma para criar, aplicar e acompanhar pesquisas de campo. O projeto reúne três partes que conversam entre si:

- **API** (`api/`): back-end em NestJS com banco PostgreSQL.
- **Web** (`web/`): painel administrativo em Next.js, usado por administradores para montar pesquisas e acompanhar resultados.
- **Mobile** (`mobile/`): aplicativo Expo / React Native, usado pelos pesquisadores em campo para coletar respostas, inclusive sem internet.

> Esta é a documentação da branch **`dev-kaiky`**. Ela contém a evolução mais recente do painel web (dashboard com dados reais), da API e do app mobile.

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Como rodar o projeto](#como-rodar-o-projeto)
  - [1. API](#1-api)
  - [2. Web](#2-web)
  - [3. Mobile](#3-mobile)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Perfis de usuário](#perfis-de-usuário)
- [Modelo de dados](#modelo-de-dados)
- [Endpoints da API](#endpoints-da-api)
- [Regras de negócio importantes](#regras-de-negócio-importantes)
- [Testes e qualidade de código](#testes-e-qualidade-de-código)
- [Fluxo de trabalho com branches](#fluxo-de-trabalho-com-branches)
- [Problemas comuns](#problemas-comuns)

---

## Visão geral

O fluxo de uso do sistema é:

1. Um **superadministrador** cadastra empresas e seus administradores.
2. O **administrador** da empresa cadastra pesquisadores e monta a pesquisa (seções, questões, regras de exibição) pelo painel web.
3. Ao publicar a pesquisa e vincular pesquisadores, ela fica disponível no app mobile.
4. O **pesquisador** baixa a pesquisa no aparelho, aplica as entrevistas (com ou sem internet) e sincroniza as coletas quando houver conexão.
5. O painel web mostra gráficos, tabelas e as últimas atualizações com base nas coletas recebidas.

## Funcionalidades

### Painel web
- Login com sessão por cookie (`access_token`) e rotas protegidas.
- Dashboards diferentes para superadministrador e administrador (cards, gráficos, tabela de pesquisas e últimas atualizações, ligados a dados reais).
- Cadastro e gestão de empresas e administradores.
- Cadastro e listagem de pesquisadores.
- Criação, edição e publicação de pesquisas.
- Montagem do questionário: seções, questões, opções, reordenação e regras de exibição condicional.
- Vinculação de pesquisadores a uma pesquisa e consulta das coletas recebidas.

### Aplicativo mobile
- Login com token guardado em armazenamento seguro (`expo-secure-store`).
- Lista de pesquisas disponíveis e download para uso offline (cache local).
- Coleta de respostas com 12 tipos de questão (texto, numérico, data, hora, sim/não, escolha única, múltipla escolha, escala 1–5, foto, múltiplas fotos, localização e áudio).
- Regras de exibição condicional aplicadas durante a entrevista.
- Termo de consentimento do entrevistado e gravação de áudio da entrevista, quando a pesquisa exige.
- Registro automático do local onde a entrevista começa.
- Sincronização das coletas com a API, com banner de modo offline e envio idempotente (reenviar a mesma coleta não duplica no servidor).

### API
- Autenticação JWT, via cookie (web) e via cabeçalho `Authorization: Bearer` (mobile).
- CRUD de empresas, usuários, pesquisas, seções, questões, opções e regras.
- Recebimento de coletas com upload de áudio e validação de consentimento.
- Validação automática de entradas (`class-validator`, com `whitelist` e `transform`).

## Tecnologias

| Parte | Principais tecnologias |
| --- | --- |
| API | NestJS 11, TypeScript, Prisma Next (`@prisma/orm-postgres`), PostgreSQL ≥ 15, JWT (`@nestjs/jwt`), bcrypt, class-validator, Jest |
| Web | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui + Base UI, Recharts, jose, react-hot-toast |
| Mobile | Expo 57, React Native 0.86, React 19, Expo Router (rotas por arquivo), expo-audio, expo-location, expo-secure-store, AsyncStorage, NetInfo, Reanimated |

## Estrutura do repositório

```
.
├── api/                      # Back-end NestJS
│   ├── src/
│   │   ├── auth/             # Login, logout, /auth/me, guard JWT
│   │   ├── user/             # Usuários (admins e pesquisadores)
│   │   ├── company/          # Empresas
│   │   ├── research/         # Pesquisas, publicação, pesquisadores, download
│   │   ├── section/          # Seções do questionário
│   │   ├── question/         # Questões e opções
│   │   ├── question-rule/    # Regras de exibição condicional
│   │   ├── collection/       # Coletas (respostas, consentimento, áudio)
│   │   └── prisma/           # Contrato do banco (contract.prisma), cliente e seed
│   ├── migrations/           # Snapshots de contrato do Prisma Next
│   ├── test/                 # Testes e2e
│   └── .env.example
├── web/                      # Painel administrativo Next.js
│   ├── app/
│   │   ├── (autenticacao)/login
│   │   └── (sidebar)/        # Home, empresas, pesquisadores, pesquisas
│   ├── components/ui/        # Componentes de interface (shadcn/ui)
│   ├── lib/                  # Clientes da API (auth, research, company...)
│   └── proxy.ts              # Proteção de rotas por JWT
└── mobile/                   # App Expo / React Native
    ├── app/                  # Rotas (login, home, pesquisas, sincronização, usuário, coleta)
    ├── components/           # Componentes (QuestionInput, ConsentModal, OfflineBanner...)
    ├── context/              # AuthContext
    ├── hooks/                # useInterviewRecording, useNetworkStatus...
    └── lib/                  # API, cache de pesquisas, fila de coletas, regras de exibição
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior (recomendado: versão LTS atual) e npm
- [PostgreSQL](https://www.postgresql.org/) **15 ou superior**
- Para o mobile: app **Expo Go** no celular, ou um emulador Android / simulador iOS
- Git

## Como rodar o projeto

Clone o repositório e entre na branch:

```bash
git clone https://github.com/GirlaneSL/2026.2-MOBILE-APLICATIVO-DE-PESQUISA-Pesquisa-Aqui.git
cd 2026.2-MOBILE-APLICATIVO-DE-PESQUISA-Pesquisa-Aqui
git checkout dev-kaiky
```

Suba as partes nesta ordem: **API → Web → Mobile**.

### 1. API

```bash
cd api
npm install
cp .env.example .env     # depois edite o .env (veja "Variáveis de ambiente")
```

Crie um banco PostgreSQL vazio e aponte o `DATABASE_URL` para ele. Em seguida:

```bash
# gera/atualiza os arquivos do contrato (contract.json e contract.d.ts)
npm run contract:emit

# cria o superadministrador inicial
npm run seed

# inicia em modo desenvolvimento (com watch)
npm run start:dev
```

A API sobe em `http://localhost:3001` (ou na porta definida em `PORT`).

> Sobre o banco: o projeto usa o **Prisma Next**. O contrato dos dados fica em `api/src/prisma/contract.prisma`. Sempre que alterá-lo, rode `npm run contract:emit` e versione `contract.json` e `contract.d.ts`. Detalhes adicionais estão em [`api/prisma-next.md`](api/prisma-next.md).

**Usuário criado pelo seed (somente desenvolvimento):**

| Campo | Valor |
| --- | --- |
| Usuário | `admin` |
| Senha | `admin123` |
| Perfil | `SUPERADMINISTRATOR` |

Troque essa senha antes de qualquer uso fora do ambiente local.

### 2. Web

```bash
cd web
npm install
```

Crie o arquivo `web/.env.local` com o **mesmo** `JWT_SECRET` usado na API (o middleware valida o token localmente):

```env
JWT_SECRET=o-mesmo-valor-da-api
```

Depois:

```bash
npm run dev
```

O painel abre em `http://localhost:3000`. Faça login com o usuário do seed.

> Atenção: nesta branch a URL da API do painel está fixa em `http://localhost:3001` (`web/lib/apiFetcher.ts`). Se a API rodar em outro endereço, altere esse arquivo.

### 3. Mobile

```bash
cd mobile
npm install
```

Crie o arquivo `mobile/.env` informando o endereço da API **acessível pelo celular**:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_NA_REDE_LOCAL:3001
```

Dicas sobre esse endereço:

- Em **celular físico**, use o IP da sua máquina na rede Wi-Fi (por exemplo `http://192.168.0.10:3001`). `localhost` aponta para o próprio celular.
- No **emulador Android**, use `http://10.0.2.2:3001`.
- No **simulador iOS**, `http://localhost:3001` funciona.
- Se `EXPO_PUBLIC_API_URL` não for definida, o app usa `http://localhost:3001`.

Inicie o app:

```bash
npm start            # abre o Expo; escaneie o QR Code com o Expo Go
npm run android      # emulador Android
npm run ios          # simulador iOS
```

> O app usa microfone (gravação de entrevista) e localização. As permissões são solicitadas em tempo de uso.

## Variáveis de ambiente

### API (`api/.env`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | String de conexão PostgreSQL, ex.: `postgresql://user:password@localhost:5432/mydb` |
| `JWT_SECRET` | Sim | Segredo usado para assinar e validar os tokens JWT |
| `PORT` | Não | Porta da API (padrão `3001`) |
| `AUDIO_STORAGE_DIR` | Não | Pasta onde ficam os áudios das entrevistas (padrão `./storage/audio`) |
| `AUDIO_MAX_BYTES` | Não | Tamanho máximo do áudio de uma coleta, em bytes (padrão `157286400`, ou 150 MB) |

### Web (`web/.env.local`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `JWT_SECRET` | Sim | Mesmo segredo da API, usado para validar o cookie `access_token` |

### Mobile (`mobile/.env`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Recomendada | URL base da API (padrão `http://localhost:3001`) |

> Nunca faça commit de arquivos `.env` com valores reais.

## Perfis de usuário

| Perfil | Onde usa | O que faz |
| --- | --- | --- |
| `SUPERADMINISTRATOR` | Web | Gerencia empresas e seus administradores |
| `ADMINISTRATOR` | Web | Gerencia pesquisadores e pesquisas da própria empresa |
| `RESEARCHER` | Mobile | Aplica entrevistas e sincroniza as coletas |

## Modelo de dados

Principais entidades (definidas em `api/src/prisma/contract.prisma`):

- **Company**: empresa (`ACTIVE` / `INACTIVE`).
- **User**: usuário com `profile`, vinculado a uma empresa.
- **Research**: pesquisa, com status `DRAFT`, `PUBLISHED`, `IN_FIELD` ou `CLOSED`, e a opção `recordInterview` (exige gravação e consentimento).
- **Section** → **Question** → **QuestionOption**: estrutura do questionário.
- **QuestionRule**: regra "a questão B só aparece se a questão A receber a resposta X".
- **Collection**: uma entrevista feita por um pesquisador (respostas, consentimento, áudio opcional).
- **Answer**: resposta a uma questão dentro de uma coleta.
- **ResearchResearcher**: vínculo entre pesquisa e pesquisadores.
- **ResearchDownload**: controle de downloads da pesquisa por aparelho.

Tipos de questão (`QuestionType`): `FREE_TEXT`, `NUMERIC`, `DATE`, `TIME`, `YES_NO`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `SCALE_1_5`, `PHOTO`, `MULTIPLE_PHOTOS`, `LOCATION`, `AUDIO`.

## Endpoints da API

Todas as rotas, exceto `POST /auth/login` e `POST /auth/logout`, exigem autenticação (`AuthGuard`).

| Recurso | Rotas |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Usuários | `POST /user`, `GET /user`, `GET /user/admins`, `DELETE /user/:username` |
| Empresas | `GET /company`, `POST /company`, `PATCH /company/:id` |
| Pesquisas | `POST /research`, `GET /research`, `GET /research/:id`, `PATCH /research/:id`, `DELETE /research/:id`, `POST /research/:id/publish`, `GET /research/:id/researchers`, `POST /research/:id/researchers/:userId`, `DELETE /research/:id/researchers/:userId`, `GET /research/:id/download` |
| Seções | `POST /section`, `POST /section/reorder`, `GET /section`, `GET /section/:id`, `PATCH /section/:id`, `DELETE /section/:id` |
| Questões | `POST /question`, `POST /question/reorder`, `GET /question`, `GET /question/:id`, `PATCH /question/:id`, `DELETE /question/:id`, `POST /question/:id/option`, `GET /question/:id/options`, `PATCH /question/option/:id`, `DELETE /question/option/:id` |
| Regras | `POST /question-rule`, `GET /question-rule`, `DELETE /question-rule/:id` |
| Coletas | `POST /collection`, `GET /collection`, `GET /collection/:id/audio` |

## Regras de negócio importantes

- **Regras de exibição**: a questão de origem precisa vir **antes** da questão afetada na ordem do questionário (seção, depois questão). Só os tipos `YES_NO`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE` e `SCALE_1_5` podem ser origem de uma regra.
- **Consentimento**: em pesquisas que gravam a entrevista, a coleta só é aceita se o consentimento tiver sido registrado de forma explícita, com data e hora, **antes** do início da coleta. Caso contrário a API responde `400` com o código `CONSENT_REQUIRED`.
- **Idempotência das coletas**: cada coleta carrega um `clientId` único gerado no aparelho, então reenvios após falha de rede não geram duplicidade.
- **Áudio**: limitado por `AUDIO_MAX_BYTES` (150 MB por padrão).
- **Sessão expirada**: ao receber `401`, o web faz logout e o mobile limpa o token e volta para a tela de login.

## Testes e qualidade de código

```bash
# API
cd api
npm run test         # testes unitários (Jest)
npm run test:cov     # cobertura
npm run test:e2e     # testes ponta a ponta
npm run lint         # ESLint
npm run format       # Prettier

# Web
cd web
npm run lint
npm run build        # verifica se o build de produção compila

# Mobile
cd mobile
npm run lint
```

## Fluxo de trabalho com branches

| Branch | Uso |
| --- | --- |
| `main` | Versão estável |
| `dev-kaiky` | Desenvolvimento de Kaiky (esta branch) |
| `dev-girlane` | Desenvolvimento de Girlane |
| `mobile` | Desenvolvimento do aplicativo mobile |

Sugestão de fluxo:

1. Crie suas alterações na sua branch de desenvolvimento.
2. Use mensagens de commit no padrão *Conventional Commits* (ex.: `feat(web): ...`, `fix(api): ...`).
3. Abra um Pull Request para `main` e peça revisão antes do merge.

## Problemas comuns

- **O app mobile não conecta na API**: confira se o celular e o computador estão na mesma rede, se `EXPO_PUBLIC_API_URL` usa o IP da máquina (não `localhost`) e se o firewall libera a porta `3001`. Depois de alterar o `.env`, reinicie o Expo com `npx expo start -c`.
- **Painel web redireciona sempre para `/login`**: o `JWT_SECRET` do `web/.env.local` precisa ser idêntico ao da API.
- **Erro de conexão com o banco ao subir a API**: verifique o `DATABASE_URL` e se o PostgreSQL é versão 15 ou superior.
- **Tipos do banco desatualizados após mudar o contrato**: rode `npm run contract:emit` dentro de `api/`.
- **Falha de login no web por CORS/cookie**: a API aceita qualquer origem com credenciais; confirme que o painel está chamando o endereço correto da API.

---

Projeto acadêmico, semestre 2026.2.
