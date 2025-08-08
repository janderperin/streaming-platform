# Estrutura Detalhada do Projeto

## Visão Geral

Este documento detalha a estrutura completa do projeto de plataforma de live streaming, explicando a organização de arquivos, responsabilidades de cada componente e como eles se integram.

## Estrutura de Diretórios

```
streaming-platform/
├── README.md                           # Documentação principal
├── LICENSE                             # Licença do projeto
├── .gitignore                          # Arquivos ignorados pelo Git
├── docker-compose.yml                  # Configuração Docker (opcional)
├── 
├── frontend/                           # Aplicação Next.js
│   ├── package.json                    # Dependências e scripts
│   ├── next.config.js                  # Configuração do Next.js
│   ├── tailwind.config.js              # Configuração do TailwindCSS
│   ├── tsconfig.json                   # Configuração TypeScript
│   ├── .env.local                      # Variáveis de ambiente (local)
│   ├── .env.example                    # Exemplo de variáveis de ambiente
│   ├── .gitignore                      # Arquivos ignorados
│   ├── 
│   ├── public/                         # Assets estáticos
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   ├── images/                     # Imagens da aplicação
│   │   └── icons/                      # Ícones e assets
│   ├── 
│   └── src/                            # Código fonte
│       ├── app/                        # App Router (Next.js 13+)
│       │   ├── layout.tsx              # Layout raiz
│       │   ├── page.tsx                # Página inicial
│       │   ├── globals.css             # Estilos globais
│       │   ├── 
│       │   ├── auth/                   # Páginas de autenticação
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   ├── register/
│       │   │   │   └── page.tsx
│       │   │   └── callback/
│       │   │       └── page.tsx
│       │   ├── 
│       │   ├── dashboard/              # Painel do usuário
│       │   │   ├── page.tsx            # Dashboard principal
│       │   │   ├── layout.tsx          # Layout do dashboard
│       │   │   ├── streams/            # Gerenciamento de streams
│       │   │   │   ├── page.tsx
│       │   │   │   ├── new/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx
│       │   │   │       └── edit/
│       │   │   │           └── page.tsx
│       │   │   ├── videos/             # Gerenciamento de vídeos
│       │   │   │   ├── page.tsx
│       │   │   │   ├── upload/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx
│       │   │   ├── schedule/           # Agendamentos
│       │   │   │   ├── page.tsx
│       │   │   │   └── new/
│       │   │   │       └── page.tsx
│       │   │   ├── analytics/          # Estatísticas
│       │   │   │   └── page.tsx
│       │   │   └── settings/           # Configurações
│       │   │       └── page.tsx
│       │   ├── 
│       │   ├── studio/                 # Estúdio online
│       │   │   ├── page.tsx            # Lista de estúdios
│       │   │   └── [id]/               # Estúdio específico
│       │   │       ├── page.tsx        # Interface do estúdio
│       │   │       ├── guest/          # Página para convidados
│       │   │       │   └── page.tsx
│       │   │       └── preview/        # Preview da transmissão
│       │   │           └── page.tsx
│       │   ├── 
│       │   ├── watch/                  # Páginas de visualização
│       │   │   └── [id]/               # Stream específico
│       │   │       └── page.tsx
│       │   ├── 
│       │   ├── restream/               # Re-streaming do YouTube
│       │   │   ├── page.tsx            # Lista de re-streams
│       │   │   ├── new/                # Novo re-stream
│       │   │   │   └── page.tsx
│       │   │   └── [id]/               # Re-stream específico
│       │   │       └── page.tsx
│       │   ├── 
│       │   └── api/                    # API Routes (se necessário)
│       │       └── auth/
│       │           └── callback/
│       │               └── route.ts
│       ├── 
│       ├── components/                 # Componentes React
│       │   ├── ui/                     # Componentes base (botões, inputs, etc.)
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Spinner.tsx
│       │   │   └── index.ts            # Exports centralizados
│       │   ├── 
│       │   ├── layout/                 # Componentes de layout
│       │   │   ├── Header.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── Navigation.tsx
│       │   ├── 
│       │   ├── auth/                   # Componentes de autenticação
│       │   │   ├── LoginForm.tsx
│       │   │   ├── RegisterForm.tsx
│       │   │   ├── AuthGuard.tsx
│       │   │   └── LogoutButton.tsx
│       │   ├── 
│       │   ├── dashboard/              # Componentes do dashboard
│       │   │   ├── StreamCard.tsx
│       │   │   ├── VideoCard.tsx
│       │   │   ├── AnalyticsChart.tsx
│       │   │   ├── QuickActions.tsx
│       │   │   └── RecentActivity.tsx
│       │   ├── 
│       │   ├── studio/                 # Componentes do estúdio
│       │   │   ├── StudioInterface.tsx
│       │   │   ├── VideoPreview.tsx
│       │   │   ├── ControlPanel.tsx
│       │   │   ├── GuestManager.tsx
│       │   │   ├── LayoutSelector.tsx
│       │   │   ├── OverlayEditor.tsx
│       │   │   ├── ChatPanel.tsx
│       │   │   ├── ScreenShare.tsx
│       │   │   └── StreamControls.tsx
│       │   ├── 
│       │   ├── video/                  # Componentes de vídeo
│       │   │   ├── VideoPlayer.tsx
│       │   │   ├── VideoUpload.tsx
│       │   │   ├── VideoList.tsx
│       │   │   ├── VideoEditor.tsx
│       │   │   └── ThumbnailGenerator.tsx
│       │   ├── 
│       │   ├── streaming/              # Componentes de streaming
│       │   │   ├── StreamSetup.tsx
│       │   │   ├── StreamStatus.tsx
│       │   │   ├── MultiStreamConfig.tsx
│       │   │   ├── RTMPSettings.tsx
│       │   │   └── StreamAnalytics.tsx
│       │   ├── 
│       │   ├── restream/               # Componentes de re-streaming
│       │   │   ├── YouTubeUrlInput.tsx
│       │   │   ├── RestreamPreview.tsx
│       │   │   ├── RestreamControls.tsx
│       │   │   └── RestreamStatus.tsx
│       │   ├── 
│       │   └── chat/                   # Componentes de chat
│       │       ├── ChatWidget.tsx
│       │       ├── ChatMessage.tsx
│       │       ├── ChatInput.tsx
│       │       └── UnifiedChat.tsx
│       ├── 
│       ├── hooks/                      # Custom React Hooks
│       │   ├── useAuth.ts              # Hook de autenticação
│       │   ├── useWebRTC.ts            # Hook para WebRTC
│       │   ├── useSocket.ts            # Hook para Socket.io
│       │   ├── useStream.ts            # Hook para gerenciar streams
│       │   ├── useVideo.ts             # Hook para vídeos
│       │   ├── useChat.ts              # Hook para chat
│       │   ├── useLocalStorage.ts      # Hook para localStorage
│       │   └── useApi.ts               # Hook para chamadas de API
│       ├── 
│       ├── lib/                        # Bibliotecas e utilitários
│       │   ├── api.ts                  # Cliente API (axios)
│       │   ├── auth.ts                 # Configuração de autenticação
│       │   ├── socket.ts               # Configuração Socket.io
│       │   ├── webrtc.ts               # Configuração WebRTC
│       │   ├── video.ts                # Utilitários de vídeo
│       │   ├── utils.ts                # Utilitários gerais
│       │   ├── constants.ts            # Constantes da aplicação
│       │   ├── validations.ts          # Esquemas de validação
│       │   └── storage.ts              # Utilitários de armazenamento
│       ├── 
│       ├── store/                      # Estado global (Zustand)
│       │   ├── authStore.ts            # Estado de autenticação
│       │   ├── streamStore.ts          # Estado de streams
│       │   ├── videoStore.ts           # Estado de vídeos
│       │   ├── chatStore.ts            # Estado de chat
│       │   ├── studioStore.ts          # Estado do estúdio
│       │   └── index.ts                # Exports centralizados
│       ├── 
│       └── types/                      # Definições TypeScript
│           ├── auth.ts                 # Tipos de autenticação
│           ├── stream.ts               # Tipos de stream
│           ├── video.ts                # Tipos de vídeo
│           ├── chat.ts                 # Tipos de chat
│           ├── studio.ts               # Tipos do estúdio
│           ├── api.ts                  # Tipos de API
│           └── index.ts                # Exports centralizados
├── 
├── backend/                            # Servidor Node.js
│   ├── package.json                    # Dependências e scripts
│   ├── tsconfig.json                   # Configuração TypeScript
│   ├── .env.example                    # Exemplo de variáveis de ambiente
│   ├── .env                            # Variáveis de ambiente (local)
│   ├── .gitignore                      # Arquivos ignorados
│   ├── 
│   ├── src/                            # Código fonte
│   │   ├── index.ts                    # Ponto de entrada
│   │   ├── app.ts                      # Configuração do Express
│   │   ├── server.ts                   # Servidor HTTP/Socket.io
│   │   ├── 
│   │   ├── config/                     # Configurações
│   │   │   ├── database.ts             # Configuração do banco
│   │   │   ├── auth.ts                 # Configuração de autenticação
│   │   │   ├── storage.ts              # Configuração de armazenamento
│   │   │   ├── rtmp.ts                 # Configuração RTMP
│   │   │   ├── socket.ts               # Configuração Socket.io
│   │   │   └── index.ts                # Exports centralizados
│   │   ├── 
│   │   ├── controllers/                # Controladores de rota
│   │   │   ├── authController.ts       # Autenticação
│   │   │   ├── streamController.ts     # Streams
│   │   │   ├── videoController.ts      # Vídeos
│   │   │   ├── userController.ts       # Usuários
│   │   │   ├── studioController.ts     # Estúdio
│   │   │   ├── restreamController.ts   # Re-streaming
│   │   │   ├── chatController.ts       # Chat
│   │   │   └── analyticsController.ts  # Analytics
│   │   ├── 
│   │   ├── middleware/                 # Middlewares
│   │   │   ├── auth.ts                 # Autenticação
│   │   │   ├── validation.ts           # Validação
│   │   │   ├── upload.ts               # Upload de arquivos
│   │   │   ├── cors.ts                 # CORS
│   │   │   ├── rateLimit.ts            # Rate limiting
│   │   │   ├── errorHandler.ts         # Tratamento de erros
│   │   │   └── logger.ts               # Logging
│   │   ├── 
│   │   ├── models/                     # Modelos de dados
│   │   │   ├── User.ts                 # Modelo de usuário
│   │   │   ├── Stream.ts               # Modelo de stream
│   │   │   ├── Video.ts                # Modelo de vídeo
│   │   │   ├── Guest.ts                # Modelo de convidado
│   │   │   ├── Chat.ts                 # Modelo de chat
│   │   │   ├── Schedule.ts             # Modelo de agendamento
│   │   │   └── Analytics.ts            # Modelo de analytics
│   │   ├── 
│   │   ├── routes/                     # Definições de rotas
│   │   │   ├── auth.ts                 # Rotas de autenticação
│   │   │   ├── streams.ts              # Rotas de streams
│   │   │   ├── videos.ts               # Rotas de vídeos
│   │   │   ├── users.ts                # Rotas de usuários
│   │   │   ├── studio.ts               # Rotas do estúdio
│   │   │   ├── restream.ts             # Rotas de re-streaming
│   │   │   ├── chat.ts                 # Rotas de chat
│   │   │   ├── analytics.ts            # Rotas de analytics
│   │   │   └── index.ts                # Agregador de rotas
│   │   ├── 
│   │   ├── services/                   # Lógica de negócio
│   │   │   ├── authService.ts          # Serviços de autenticação
│   │   │   ├── streamService.ts        # Serviços de stream
│   │   │   ├── videoService.ts         # Serviços de vídeo
│   │   │   ├── storageService.ts       # Serviços de armazenamento
│   │   │   ├── rtmpService.ts          # Serviços RTMP
│   │   │   ├── restreamService.ts      # Serviços de re-streaming
│   │   │   ├── chatService.ts          # Serviços de chat
│   │   │   ├── emailService.ts         # Serviços de email
│   │   │   ├── analyticsService.ts     # Serviços de analytics
│   │   │   └── schedulerService.ts     # Serviços de agendamento
│   │   ├── 
│   │   ├── utils/                      # Utilitários
│   │   │   ├── logger.ts               # Sistema de logs
│   │   │   ├── validation.ts           # Validações
│   │   │   ├── encryption.ts           # Criptografia
│   │   │   ├── fileUtils.ts            # Utilitários de arquivo
│   │   │   ├── dateUtils.ts            # Utilitários de data
│   │   │   ├── streamUtils.ts          # Utilitários de stream
│   │   │   └── constants.ts            # Constantes
│   │   ├── 
│   │   ├── types/                      # Definições TypeScript
│   │   │   ├── auth.ts                 # Tipos de autenticação
│   │   │   ├── stream.ts               # Tipos de stream
│   │   │   ├── video.ts                # Tipos de vídeo
│   │   │   ├── chat.ts                 # Tipos de chat
│   │   │   ├── api.ts                  # Tipos de API
│   │   │   ├── socket.ts               # Tipos de Socket.io
│   │   │   └── index.ts                # Exports centralizados
│   │   ├── 
│   │   └── database/                   # Configuração do banco
│   │       ├── migrations/             # Migrações
│   │       ├── seeds/                  # Seeds de dados
│   │       ├── schema.sql              # Schema do banco
│   │       └── connection.ts           # Conexão com o banco
│   ├── 
│   ├── dist/                           # JavaScript compilado
│   ├── uploads/                        # Uploads temporários
│   ├── logs/                           # Arquivos de log
│   └── tests/                          # Testes
│       ├── unit/                       # Testes unitários
│       ├── integration/                # Testes de integração
│       └── e2e/                        # Testes end-to-end
├── 
├── nginx-rtmp/                         # Configuração Nginx RTMP
│   ├── nginx.conf                      # Configuração principal
│   ├── rtmp.conf                       # Configuração RTMP
│   ├── ssl/                            # Certificados SSL
│   ├── logs/                           # Logs do Nginx
│   ├── recordings/                     # Gravações de stream
│   ├── hls/                            # Arquivos HLS
│   ├── dash/                           # Arquivos DASH
│   └── scripts/                        # Scripts de automação
│       ├── start-recording.sh
│       ├── stop-recording.sh
│       ├── cleanup.sh
│       └── monitor.sh
├── 
├── docs/                               # Documentação
│   ├── README.md                       # Documentação principal
│   ├── INSTALLATION.md                 # Guia de instalação
│   ├── CONFIGURATION.md                # Guia de configuração
│   ├── API.md                          # Documentação da API
│   ├── DEPLOYMENT.md                   # Guia de deploy
│   ├── TROUBLESHOOTING.md              # Solução de problemas
│   ├── CONTRIBUTING.md                 # Guia de contribuição
│   ├── 
│   ├── architecture/                   # Documentação de arquitetura
│   │   ├── overview.md
│   │   ├── database-schema.md
│   │   ├── api-design.md
│   │   └── security.md
│   ├── 
│   ├── user-guides/                    # Guias do usuário
│   │   ├── getting-started.md
│   │   ├── streaming-guide.md
│   │   ├── studio-guide.md
│   │   └── restreaming-guide.md
│   ├── 
│   └── developer/                      # Documentação para desenvolvedores
│       ├── setup.md
│       ├── coding-standards.md
│       ├── testing.md
│       └── release-process.md
├── 
├── scripts/                            # Scripts de automação
│   ├── setup.sh                       # Script de configuração inicial
│   ├── deploy.sh                       # Script de deploy
│   ├── backup.sh                       # Script de backup
│   ├── migrate.sh                      # Script de migração
│   ├── test.sh                         # Script de testes
│   ├── build.sh                        # Script de build
│   ├── 
│   ├── development/                    # Scripts de desenvolvimento
│   │   ├── start-dev.sh                # Iniciar ambiente de dev
│   │   ├── reset-db.sh                 # Reset do banco
│   │   ├── seed-data.sh                # Popular dados de teste
│   │   └── lint.sh                     # Linting
│   ├── 
│   └── production/                     # Scripts de produção
│       ├── deploy-frontend.sh          # Deploy do frontend
│       ├── deploy-backend.sh           # Deploy do backend
│       ├── health-check.sh             # Health check
│       └── monitoring.sh               # Monitoramento
├── 
├── docker/                             # Configurações Docker (opcional)
│   ├── Dockerfile.frontend             # Dockerfile do frontend
│   ├── Dockerfile.backend              # Dockerfile do backend
│   ├── Dockerfile.nginx                # Dockerfile do Nginx
│   ├── docker-compose.yml              # Compose para desenvolvimento
│   ├── docker-compose.prod.yml         # Compose para produção
│   └── .dockerignore                   # Arquivos ignorados pelo Docker
├── 
└── .github/                            # GitHub Actions (CI/CD)
    ├── workflows/                      # Workflows de CI/CD
    │   ├── frontend-deploy.yml         # Deploy do frontend
    │   ├── backend-deploy.yml          # Deploy do backend
    │   ├── tests.yml                   # Execução de testes
    │   └── security-scan.yml           # Scan de segurança
    ├── 
    ├── ISSUE_TEMPLATE/                 # Templates de issues
    │   ├── bug_report.md
    │   ├── feature_request.md
    │   └── question.md
    ├── 
    └── PULL_REQUEST_TEMPLATE.md        # Template de PR
```

## Responsabilidades dos Componentes

### Frontend (Next.js)

**Páginas Principais:**
- **Dashboard**: Painel de controle do usuário com visão geral de streams, vídeos e estatísticas
- **Estúdio**: Interface interativa para controle de transmissões ao vivo
- **Watch**: Páginas de visualização de streams para o público
- **Re-streaming**: Interface para configurar re-transmissões do YouTube

**Componentes Chave:**
- **StudioInterface**: Componente principal do estúdio com controles de transmissão
- **VideoPlayer**: Player de vídeo baseado em Video.js para reprodução
- **ChatWidget**: Widget de chat unificado para interação com o público
- **StreamControls**: Controles de transmissão (iniciar, parar, configurar)

### Backend (Node.js)

**Controladores:**
- **streamController**: Gerencia criação, atualização e controle de streams
- **videoController**: Gerencia upload, processamento e armazenamento de vídeos
- **restreamController**: Gerencia re-streaming de conteúdo do YouTube
- **studioController**: Gerencia sessões do estúdio e convidados

**Serviços:**
- **rtmpService**: Interface com o servidor Nginx RTMP
- **storageService**: Gerencia upload e armazenamento de arquivos
- **restreamService**: Implementa captura e re-transmissão de streams
- **chatService**: Gerencia chat unificado e integração com plataformas

### Nginx RTMP

**Funcionalidades:**
- **Ingestão RTMP**: Recebe streams de OBS Studio e outras fontes
- **Distribuição**: Envia streams para Restream e outras plataformas
- **Gravação**: Grava transmissões para armazenamento posterior
- **HLS/DASH**: Gera streams para reprodução no navegador

## Fluxo de Dados

### Transmissão ao Vivo
1. Usuário configura transmissão no dashboard
2. Estúdio estabelece conexão WebRTC/RTMP
3. Stream é enviado para Nginx RTMP
4. Nginx distribui para Restream (multistream)
5. Gravação é armazenada no Cloudflare R2
6. Chat é agregado via Restream Chat API

### Re-streaming do YouTube
1. Usuário insere URL do YouTube no frontend
2. Backend valida e inicia captura com yt-dlp
3. Stream capturado é enviado para Nginx RTMP
4. Nginx processa e distribui como stream normal
5. Overlays e chat podem ser adicionados no estúdio

### Upload de Vídeos
1. Usuário faz upload via frontend
2. Backend processa e valida o arquivo
3. Arquivo é enviado para Cloudflare R2
4. Metadados são salvos no banco de dados
5. Vídeo fica disponível para agendamento

## Considerações de Segurança

- **Autenticação**: JWT tokens com Firebase Auth/Auth0
- **Autorização**: Middleware de verificação de permissões
- **Validação**: Validação rigorosa de inputs no backend
- **CORS**: Configuração adequada para comunicação frontend-backend
- **Rate Limiting**: Proteção contra abuso de APIs
- **Sanitização**: Limpeza de dados de entrada para prevenir XSS

## Escalabilidade

A estrutura foi projetada para facilitar a escalabilidade:

- **Microserviços**: Componentes podem ser separados em serviços independentes
- **Load Balancing**: Nginx pode ser configurado para balanceamento de carga
- **CDN**: Cloudflare R2 oferece distribuição global de conteúdo
- **Database Sharding**: PostgreSQL pode ser particionado conforme necessário
- **Horizontal Scaling**: Containers Docker facilitam escalabilidade horizontal

Esta estrutura fornece uma base sólida para o desenvolvimento de uma plataforma de streaming completa, mantendo a organização, escalabilidade e facilidade de manutenção.

