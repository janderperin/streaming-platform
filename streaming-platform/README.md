# Plataforma de Live Streaming

Uma plataforma completa de live streaming inspirada no StreamYard e Livepush, construída com tecnologias gratuitas e open source.

## 🚀 Funcionalidades

- **Live Streaming no Navegador**: WebRTC e RTMP para transmissões de baixa latência
- **Agendamento de Vídeos**: Transmissão automática de vídeos pré-gravados
- **Multistream Gratuito**: Transmissão simultânea para YouTube, Facebook e Twitch
- **Estúdio Online**: Interface completa com convidados, layouts e overlays
- **Re-streaming do YouTube**: Captura e retransmissão de lives públicas do YouTube
- **Chat Unificado**: Agregação de mensagens de todas as plataformas
- **Gravação e Hospedagem**: Armazenamento e reprodução de transmissões

## 🏗️ Arquitetura

### Frontend
- **Next.js 15** com TypeScript
- **TailwindCSS** para estilização
- **Video.js** para reprodução de vídeo
- **Socket.io** para comunicação em tempo real
- **Hospedagem**: Vercel (gratuito)

### Backend
- **Node.js** com Express e TypeScript
- **PostgreSQL** via Supabase (gratuito)
- **Socket.io** para WebRTC e chat
- **Hospedagem**: Railway ou Render (gratuito)

### Streaming
- **Nginx RTMP** para ingestão e distribuição
- **OBS Studio** para captura (cliente)
- **Restream Free** para multistreaming
- **youtube-dl/yt-dlp** para re-streaming

### Armazenamento
- **Cloudflare R2** para vídeos (gratuito)
- **Firebase Auth** para autenticação (gratuito)

## 📁 Estrutura do Projeto

```
streaming-platform/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities and configs
│   │   └── types/           # TypeScript types
│   └── public/              # Static assets
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utilities
│   │   ├── config/          # Configuration
│   │   └── types/           # TypeScript types
│   └── dist/                # Compiled JavaScript
├── nginx-rtmp/              # Nginx RTMP configuration
├── docs/                    # Documentation
└── scripts/                 # Deployment and utility scripts
```

## 🛠️ Configuração e Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Nginx com módulo RTMP
- OBS Studio (para usuários finais)

### Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd streaming-platform
```

2. **Configure o Backend**
```bash
cd backend
npm install
cp .env.example .env
# Configure as variáveis de ambiente no .env
npm run dev
```

3. **Configure o Frontend**
```bash
cd frontend
npm install
npm run dev
```

4. **Configure o Nginx RTMP**
```bash
# Instale o Nginx com módulo RTMP
# Configure usando os arquivos em nginx-rtmp/
```

### Variáveis de Ambiente

Consulte os arquivos `.env.example` em cada diretório para configurar:
- Banco de dados (Supabase)
- Autenticação (Firebase/Auth0)
- Armazenamento (Cloudflare R2/Mux)
- Servidor RTMP
- APIs externas (Restream, etc.)

## 🚀 Deploy

### Frontend (Vercel)
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático via Git

### Backend (Railway/Render)
1. Conecte o repositório ao Railway/Render
2. Configure as variáveis de ambiente
3. Deploy automático via Git

### Nginx RTMP
1. Configure um servidor VPS
2. Instale Nginx com módulo RTMP
3. Use a configuração em `nginx-rtmp/`

## 📖 Documentação

- [Arquitetura do Sistema](docs/arquitetura_sistema_streaming.md)
- [Guia de Configuração](docs/configuracao.md)
- [API Reference](docs/api.md)
- [Guia do Usuário](docs/usuario.md)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação
- Entre em contato via email

---

**Desenvolvido com ❤️ pela equipe Manus AI**

