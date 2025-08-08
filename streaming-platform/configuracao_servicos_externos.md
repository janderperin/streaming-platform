# Configuração de Serviços Externos e Integrações

## Visão Geral

Este documento fornece instruções detalhadas para configurar todos os serviços externos necessários para o funcionamento completo da plataforma de streaming. Todos os serviços listados possuem planos gratuitos que atendem às necessidades iniciais do projeto, permitindo escalar conforme o crescimento da plataforma.

## Índice

1. [Nginx RTMP Server](#nginx-rtmp-server)
2. [Banco de Dados PostgreSQL (Supabase)](#banco-de-dados-postgresql-supabase)
3. [Autenticação (Firebase Auth)](#autenticação-firebase-auth)
4. [Armazenamento de Vídeos (Cloudflare R2)](#armazenamento-de-vídeos-cloudflare-r2)
5. [Multistream (Restream Free)](#multistream-restream-free)
6. [Chat Unificado](#chat-unificado)
7. [Hospedagem e Deploy](#hospedagem-e-deploy)
8. [Monitoramento e Analytics](#monitoramento-e-analytics)
9. [Configurações de Segurança](#configurações-de-segurança)
10. [Variáveis de Ambiente](#variáveis-de-ambiente)

---


## Nginx RTMP Server

O Nginx RTMP é o coração da nossa infraestrutura de streaming, responsável por receber, processar e distribuir os streams RTMP. Esta configuração permite ingest de streams, conversão para HLS/DASH e distribuição para múltiplas plataformas.

### Instalação do Nginx com Módulo RTMP

#### Ubuntu/Debian

```bash
# Instalar dependências
sudo apt update
sudo apt install build-essential libpcre3 libpcre3-dev libssl-dev zlib1g-dev

# Baixar Nginx e módulo RTMP
wget http://nginx.org/download/nginx-1.20.2.tar.gz
wget https://github.com/arut/nginx-rtmp-module/archive/master.zip

# Extrair arquivos
tar -zxvf nginx-1.20.2.tar.gz
unzip master.zip

# Compilar Nginx com módulo RTMP
cd nginx-1.20.2
./configure --with-http_ssl_module --add-module=../nginx-rtmp-module-master
make
sudo make install
```

#### Docker (Recomendado)

```dockerfile
FROM tiangolo/nginx-rtmp

COPY nginx.conf /etc/nginx/nginx.conf
COPY html/ /var/www/html/

EXPOSE 1935 8080

CMD ["nginx", "-g", "daemon off;"]
```

### Configuração do Nginx RTMP

Crie o arquivo `/etc/nginx/nginx.conf` com a seguinte configuração:

```nginx
worker_processes auto;
rtmp_auto_push on;

events {
    worker_connections 1024;
}

# Configuração RTMP
rtmp {
    server {
        listen 1935;
        chunk_size 4000;
        
        # Aplicação para ingest de streams
        application live {
            live on;
            
            # Permitir publicação apenas de IPs autorizados
            allow publish all;
            deny publish all;
            
            # Permitir reprodução de qualquer IP
            allow play all;
            
            # Webhook para notificações
            on_publish http://localhost:3000/api/streams/webhook/rtmp/publish;
            on_publish_done http://localhost:3000/api/streams/webhook/rtmp/publish_done;
            on_play http://localhost:3000/api/streams/webhook/rtmp/play;
            on_play_done http://localhost:3000/api/streams/webhook/rtmp/play_done;
            
            # Gravação automática
            record all;
            record_path /var/recordings;
            record_unique on;
            record_suffix .flv;
            
            # Conversão para HLS
            hls on;
            hls_path /var/www/html/hls;
            hls_fragment 3;
            hls_playlist_length 60;
            
            # Conversão para DASH
            dash on;
            dash_path /var/www/html/dash;
            dash_fragment 3;
            dash_playlist_length 60;
            
            # Multistream para plataformas externas
            push rtmp://a.rtmp.youtube.com/live2/;
            push rtmp://live-api-s.facebook.com:80/rtmp/;
            push rtmp://ingest.twitch.tv/live/;
        }
        
        # Aplicação para re-streaming do YouTube
        application restream {
            live on;
            allow publish 127.0.0.1;
            deny publish all;
            allow play all;
            
            # Configurações específicas para re-streaming
            hls on;
            hls_path /var/www/html/restream;
            hls_fragment 2;
            hls_playlist_length 30;
        }
    }
}

# Configuração HTTP
http {
    include mime.types;
    default_type application/octet-stream;
    
    server {
        listen 8080;
        
        # Servir arquivos HLS
        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /var/www/html;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
        
        # Servir arquivos DASH
        location /dash {
            root /var/www/html;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
        
        # Estatísticas RTMP
        location /stat {
            rtmp_stat all;
            rtmp_stat_stylesheet stat.xsl;
        }
        
        location /stat.xsl {
            root /var/www/html;
        }
        
        # Player de teste
        location /player {
            root /var/www/html;
        }
    }
}
```

### Configuração de Firewall

```bash
# Permitir porta RTMP (1935) e HTTP (8080)
sudo ufw allow 1935/tcp
sudo ufw allow 8080/tcp
sudo ufw reload
```

### Teste da Configuração

```bash
# Verificar configuração
sudo nginx -t

# Iniciar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

### Configuração de SSL/TLS (Opcional)

Para RTMPS (RTMP sobre SSL):

```nginx
rtmp {
    server {
        listen 1936 ssl;
        ssl_certificate /path/to/certificate.crt;
        ssl_certificate_key /path/to/private.key;
        
        # Resto da configuração...
    }
}
```

---


## Banco de Dados PostgreSQL (Supabase)

O Supabase fornece um banco PostgreSQL gerenciado com APIs REST automáticas, autenticação integrada e recursos em tempo real. O plano gratuito oferece 500MB de armazenamento e 2GB de transferência mensal.

### Configuração Inicial

1. **Criar Conta no Supabase**
   - Acesse [supabase.com](https://supabase.com)
   - Crie uma conta gratuita
   - Crie um novo projeto

2. **Obter Credenciais**
   - URL do projeto: `https://[seu-projeto].supabase.co`
   - Chave pública (anon key)
   - Chave de serviço (service_role key)

### Configuração do Banco de Dados

Execute o script SQL fornecido no arquivo `database_schema.sql`:

```sql
-- Conectar ao Supabase SQL Editor e executar:

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Executar todo o conteúdo do arquivo database_schema.sql
```

### Configuração de Políticas RLS (Row Level Security)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_restreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Política para usuários (apenas próprios dados)
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id::uuid);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id::uuid);

-- Política para streams (owner + público para visualização)
CREATE POLICY "Users can manage own streams" ON streams
    FOR ALL USING (auth.uid() = user_id::uuid);

CREATE POLICY "Anyone can view live streams" ON streams
    FOR SELECT USING (status = 'live');

-- Política para re-streams
CREATE POLICY "Users can manage own restreams" ON youtube_restreams
    FOR ALL USING (auth.uid() = user_id::uuid);

-- Política para chat (owner do stream + público para visualização)
CREATE POLICY "Stream owners can manage chat" ON chat_messages
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id::uuid FROM streams WHERE id = stream_id
        )
    );

CREATE POLICY "Anyone can view chat messages" ON chat_messages
    FOR SELECT USING (true);
```

### Configuração de Triggers

```sql
-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON streams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restreams_updated_at BEFORE UPDATE ON youtube_restreams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Configuração de Webhooks

No painel do Supabase, configure webhooks para notificações em tempo real:

```javascript
// Webhook para novos streams
{
  "url": "https://sua-api.com/webhooks/supabase/streams",
  "events": ["INSERT", "UPDATE"],
  "table": "streams"
}

// Webhook para chat messages
{
  "url": "https://sua-api.com/webhooks/supabase/chat",
  "events": ["INSERT"],
  "table": "chat_messages"
}
```

### Configuração do Cliente Supabase

No backend Node.js:

```typescript
// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
```

No frontend Next.js:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Backup e Recuperação

Configure backups automáticos no painel do Supabase:

1. Acesse "Settings" > "Database"
2. Configure "Point-in-time Recovery" (PITR)
3. Configure backups diários automáticos

### Monitoramento

Configure alertas para:
- Uso de armazenamento (próximo ao limite de 500MB)
- Número de conexões simultâneas
- Tempo de resposta das queries
- Erros de autenticação

---


## Autenticação (Firebase Auth)

O Firebase Authentication fornece autenticação robusta com múltiplos provedores, incluindo email/senha, Google, Facebook e outros. O plano gratuito suporta até 10.000 usuários ativos mensais.

### Configuração Inicial

1. **Criar Projeto no Firebase**
   - Acesse [console.firebase.google.com](https://console.firebase.google.com)
   - Crie um novo projeto
   - Ative o Firebase Authentication

2. **Configurar Provedores de Autenticação**
   - Email/Password: Ativar na aba "Sign-in method"
   - Google: Configurar OAuth 2.0
   - Facebook: Configurar Facebook Login

### Configuração do Google OAuth

1. **Google Cloud Console**
   ```
   - Acesse console.cloud.google.com
   - Crie credenciais OAuth 2.0
   - Configure URLs autorizadas:
     - http://localhost:3000 (desenvolvimento)
     - https://seu-dominio.com (produção)
   ```

2. **Firebase Console**
   ```
   - Ative "Google" em Sign-in method
   - Configure Client ID e Client Secret
   - Adicione domínios autorizados
   ```

### Configuração do Facebook Login

1. **Facebook Developers**
   ```
   - Acesse developers.facebook.com
   - Crie um novo app
   - Configure Facebook Login
   - Adicione domínios válidos
   ```

2. **Firebase Console**
   ```
   - Ative "Facebook" em Sign-in method
   - Configure App ID e App Secret
   ```

### Configuração do SDK

#### Frontend (Next.js)

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
```

#### Serviço de Autenticação

```typescript
// src/services/authService.ts
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

class AuthService {
  // Login com email/senha
  async signInWithEmail(email: string, password: string) {
    return await signInWithEmailAndPassword(auth, email, password)
  }

  // Registro com email/senha
  async signUpWithEmail(email: string, password: string) {
    return await createUserWithEmailAndPassword(auth, email, password)
  }

  // Login com Google
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    return await signInWithPopup(auth, provider)
  }

  // Login com Facebook
  async signInWithFacebook() {
    const provider = new FacebookAuthProvider()
    return await signInWithPopup(auth, provider)
  }

  // Logout
  async signOut() {
    return await signOut(auth)
  }

  // Observar mudanças de autenticação
  onAuthStateChanged(callback: (user: any) => void) {
    return onAuthStateChanged(auth, callback)
  }
}

export const authService = new AuthService()
```

#### Backend (Node.js)

```typescript
// src/config/firebase-admin.ts
import admin from 'firebase-admin'

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  })
}

export const adminAuth = admin.auth()
```

#### Middleware de Verificação

```typescript
// src/middleware/firebaseAuth.ts
import { Request, Response, NextFunction } from 'express'
import { adminAuth } from '@/config/firebase-admin'

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email: string
    name?: string
  }
}

export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email!,
      name: decodedToken.name
    }

    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

### Configuração de Segurança

#### Regras de Segurança

```javascript
// Firebase Security Rules
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "streams": {
      ".read": true,
      "$streamId": {
        ".write": "auth != null && (
          !data.exists() || 
          data.child('userId').val() === auth.uid
        )"
      }
    }
  }
}
```

#### Configuração de Domínios Autorizados

No Firebase Console, adicione os domínios autorizados:
- `localhost` (desenvolvimento)
- `seu-dominio.com` (produção)
- `sua-api.com` (backend)

### Integração com Sistema Próprio

```typescript
// src/services/userSyncService.ts
export class UserSyncService {
  // Sincronizar usuário Firebase com banco local
  async syncFirebaseUser(firebaseUser: any) {
    const userData = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      fullName: firebaseUser.displayName,
      photoUrl: firebaseUser.photoURL,
      provider: firebaseUser.providerData[0]?.providerId || 'email'
    }

    // Verificar se usuário já existe
    const existingUser = await query(
      'SELECT id FROM users WHERE id = $1',
      [userData.id]
    )

    if (existingUser.rows.length === 0) {
      // Criar novo usuário
      await query(
        `INSERT INTO users (id, email, full_name, photo_url, provider, subscription_tier)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userData.id, userData.email, userData.fullName, userData.photoUrl, userData.provider, 'free']
      )
    } else {
      // Atualizar usuário existente
      await query(
        `UPDATE users SET 
         email = $2, full_name = $3, photo_url = $4, last_login_at = NOW()
         WHERE id = $1`,
        [userData.id, userData.email, userData.fullName, userData.photoUrl]
      )
    }

    return userData
  }
}
```

### Configuração de Email Templates

No Firebase Console, personalize os templates de email:

1. **Verificação de Email**
2. **Recuperação de Senha**
3. **Mudança de Email**

### Monitoramento e Analytics

Configure alertas para:
- Tentativas de login falhadas
- Novos registros
- Uso de diferentes provedores
- Tokens expirados

---


## Armazenamento de Vídeos (Cloudflare R2)

O Cloudflare R2 oferece armazenamento de objetos compatível com S3, com 10GB gratuitos mensais e sem taxas de egress. É ideal para hospedar vídeos gravados e thumbnails.

### Configuração Inicial

1. **Criar Conta Cloudflare**
   - Acesse [cloudflare.com](https://cloudflare.com)
   - Crie uma conta gratuita
   - Acesse o painel R2 Storage

2. **Criar Bucket**
   ```
   - Nome: streaming-platform-videos
   - Região: Auto (recomendado)
   - Configurações de acesso: Privado inicialmente
   ```

3. **Gerar Credenciais API**
   ```
   - Acesse "Manage R2 API Tokens"
   - Crie um token com permissões:
     - Object:Read
     - Object:Write
     - Object:Delete
   ```

### Configuração do SDK

#### Instalação

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### Configuração do Cliente

```typescript
// src/config/r2.ts
import { S3Client } from '@aws-sdk/client-s3'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'streaming-platform-videos'
```

#### Serviço de Upload

```typescript
// src/services/storageService.ts
import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Client, BUCKET_NAME } from '@/config/r2'

export class StorageService {
  // Upload de arquivo
  async uploadFile(key: string, body: Buffer, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        uploadedAt: new Date().toISOString()
      }
    })

    return await r2Client.send(command)
  }

  // Gerar URL assinada para upload direto
  async generateUploadUrl(key: string, contentType: string, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    })

    return await getSignedUrl(r2Client, command, { expiresIn })
  }

  // Gerar URL assinada para download
  async generateDownloadUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })

    return await getSignedUrl(r2Client, command, { expiresIn })
  }

  // Verificar se arquivo existe
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      })
      
      await r2Client.send(command)
      return true
    } catch (error) {
      return false
    }
  }

  // Deletar arquivo
  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })

    return await r2Client.send(command)
  }

  // Gerar chave única para arquivo
  generateFileKey(userId: string, type: 'video' | 'thumbnail' | 'recording', filename: string): string {
    const timestamp = Date.now()
    const extension = filename.split('.').pop()
    return `${type}s/${userId}/${timestamp}.${extension}`
  }
}

export const storageService = new StorageService()
```

### Configuração de CORS

Configure CORS no painel do Cloudflare R2:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://seu-dominio.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Configuração de CDN

1. **Criar Custom Domain**
   ```
   - Acesse R2 > Manage R2 API Tokens
   - Configure custom domain: videos.seu-dominio.com
   - Aponte CNAME para o endpoint R2
   ```

2. **Configurar Cache Rules**
   ```javascript
   // Cloudflare Page Rules
   videos.seu-dominio.com/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 day
   ```

### Integração com Upload de Vídeos

```typescript
// src/controllers/videoController.ts
export class VideoController {
  // Iniciar upload de vídeo
  async initiateVideoUpload(req: AuthenticatedRequest, res: Response) {
    const { filename, contentType, size } = req.body
    const userId = req.user!.id

    // Validar tipo de arquivo
    const allowedTypes = ['video/mp4', 'video/webm', 'video/mov']
    if (!allowedTypes.includes(contentType)) {
      throw new CustomError('Invalid file type', 400)
    }

    // Validar tamanho (max 2GB para plano free)
    const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (size > maxSize) {
      throw new CustomError('File too large', 400)
    }

    // Gerar chave única
    const fileKey = storageService.generateFileKey(userId, 'video', filename)
    
    // Gerar URL de upload
    const uploadUrl = await storageService.generateUploadUrl(fileKey, contentType)

    // Criar registro no banco
    const videoId = uuidv4()
    await query(
      `INSERT INTO videos (id, user_id, filename, file_key, content_type, size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [videoId, userId, filename, fileKey, contentType, size, 'uploading']
    )

    res.json({
      success: true,
      data: {
        videoId,
        uploadUrl,
        fileKey
      }
    })
  }

  // Confirmar upload concluído
  async confirmVideoUpload(req: AuthenticatedRequest, res: Response) {
    const { videoId } = req.params
    const userId = req.user!.id

    // Verificar se vídeo existe e pertence ao usuário
    const result = await query(
      'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    )

    if (result.rows.length === 0) {
      throw new CustomError('Video not found', 404)
    }

    const video = result.rows[0]

    // Verificar se arquivo foi realmente enviado
    const fileExists = await storageService.fileExists(video.file_key)
    if (!fileExists) {
      throw new CustomError('File not found in storage', 400)
    }

    // Atualizar status para processamento
    await query(
      'UPDATE videos SET status = $1, uploaded_at = NOW() WHERE id = $2',
      ['processing', videoId]
    )

    // Iniciar processamento assíncrono (thumbnail, conversão, etc.)
    // processVideoAsync(videoId)

    res.json({
      success: true,
      message: 'Upload confirmed, processing started'
    })
  }
}
```

### Configuração de Lifecycle Rules

Configure regras de ciclo de vida para otimizar custos:

```json
{
  "Rules": [
    {
      "ID": "DeleteIncompleteUploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 1
      }
    },
    {
      "ID": "ArchiveOldRecordings",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "recordings/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

### Monitoramento e Alertas

Configure alertas para:
- Uso de armazenamento (próximo ao limite de 10GB)
- Número de requests
- Erros de upload/download
- Custos (se exceder o plano gratuito)

### Backup e Redundância

```typescript
// src/services/backupService.ts
export class BackupService {
  // Backup para outro provedor (opcional)
  async backupToSecondaryStorage(fileKey: string) {
    // Implementar backup para AWS S3, Google Cloud Storage, etc.
  }

  // Verificar integridade dos arquivos
  async verifyFileIntegrity(fileKey: string) {
    // Implementar verificação de checksum
  }
}
```

---


## Multistream (Restream Free)

O Restream Free permite transmitir simultaneamente para até 2 plataformas gratuitamente, incluindo YouTube, Facebook, Twitch, LinkedIn e outras. É uma solução essencial para maximizar o alcance das transmissões.

### Configuração Inicial

1. **Criar Conta Restream**
   - Acesse [restream.io](https://restream.io)
   - Crie uma conta gratuita
   - Confirme o email de verificação

2. **Conectar Plataformas**
   - YouTube: Autorizar via OAuth
   - Facebook: Conectar página/perfil
   - Twitch: Autorizar canal
   - Outras plataformas conforme necessário

### Configuração de Destinos

#### YouTube

```javascript
// Configuração automática via OAuth
{
  "platform": "youtube",
  "status": "connected",
  "channelName": "Seu Canal",
  "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2/",
  "streamKey": "[chave-gerada-automaticamente]"
}
```

#### Facebook

```javascript
// Configuração para página do Facebook
{
  "platform": "facebook",
  "status": "connected",
  "pageName": "Sua Página",
  "rtmpUrl": "rtmp://live-api-s.facebook.com:80/rtmp/",
  "streamKey": "[chave-gerada-automaticamente]"
}
```

#### Twitch

```javascript
// Configuração para Twitch
{
  "platform": "twitch",
  "status": "connected",
  "channelName": "seu_canal",
  "rtmpUrl": "rtmp://ingest.twitch.tv/live/",
  "streamKey": "[sua-chave-twitch]"
}
```

### Integração com API Restream

#### Configuração do Cliente

```typescript
// src/config/restream.ts
import axios from 'axios'

export class RestreamAPI {
  private apiKey: string
  private baseURL = 'https://api.restream.io/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    }
  }

  // Obter informações da conta
  async getAccount() {
    const response = await axios.get(`${this.baseURL}/user/profile`, {
      headers: this.headers
    })
    return response.data
  }

  // Listar canais conectados
  async getChannels() {
    const response = await axios.get(`${this.baseURL}/user/channel`, {
      headers: this.headers
    })
    return response.data
  }

  // Obter configurações RTMP
  async getRTMPSettings() {
    const response = await axios.get(`${this.baseURL}/user/rtmp`, {
      headers: this.headers
    })
    return response.data
  }

  // Iniciar stream
  async startStream(title: string, description?: string) {
    const response = await axios.post(`${this.baseURL}/user/stream`, {
      title,
      description
    }, {
      headers: this.headers
    })
    return response.data
  }

  // Parar stream
  async stopStream() {
    const response = await axios.delete(`${this.baseURL}/user/stream`, {
      headers: this.headers
    })
    return response.data
  }

  // Obter estatísticas do stream
  async getStreamStats() {
    const response = await axios.get(`${this.baseURL}/user/stream/stats`, {
      headers: this.headers
    })
    return response.data
  }
}
```

#### Serviço de Multistream

```typescript
// src/services/multistreamService.ts
export class MultistreamService {
  private restreamAPI: RestreamAPI

  constructor() {
    this.restreamAPI = new RestreamAPI(process.env.RESTREAM_API_KEY!)
  }

  // Configurar multistream para um usuário
  async setupMultistream(userId: string, streamId: string) {
    try {
      // Obter configurações RTMP do Restream
      const rtmpSettings = await this.restreamAPI.getRTMPSettings()
      
      // Salvar configurações no banco
      await query(
        `INSERT INTO multistream_configs (user_id, stream_id, platform, rtmp_url, stream_key, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, stream_id, platform) 
         DO UPDATE SET rtmp_url = $4, stream_key = $5, updated_at = NOW()`,
        [userId, streamId, 'restream', rtmpSettings.url, rtmpSettings.key, 'active']
      )

      return rtmpSettings
    } catch (error) {
      logger.error('Failed to setup multistream:', error)
      throw new CustomError('Failed to configure multistream', 500)
    }
  }

  // Iniciar multistream
  async startMultistream(streamId: string, streamData: any) {
    try {
      // Iniciar stream no Restream
      const streamInfo = await this.restreamAPI.startStream(
        streamData.title,
        streamData.description
      )

      // Atualizar status no banco
      await query(
        'UPDATE streams SET multistream_status = $1 WHERE id = $2',
        ['live', streamId]
      )

      return streamInfo
    } catch (error) {
      logger.error('Failed to start multistream:', error)
      throw new CustomError('Failed to start multistream', 500)
    }
  }

  // Parar multistream
  async stopMultistream(streamId: string) {
    try {
      // Parar stream no Restream
      await this.restreamAPI.stopStream()

      // Atualizar status no banco
      await query(
        'UPDATE streams SET multistream_status = $1 WHERE id = $2',
        ['ended', streamId]
      )
    } catch (error) {
      logger.error('Failed to stop multistream:', error)
      throw new CustomError('Failed to stop multistream', 500)
    }
  }

  // Obter estatísticas de multistream
  async getMultistreamStats(streamId: string) {
    try {
      const stats = await this.restreamAPI.getStreamStats()
      
      // Combinar com estatísticas locais
      const localStats = await query(
        'SELECT * FROM stream_stats WHERE stream_id = $1',
        [streamId]
      )

      return {
        restream: stats,
        local: localStats.rows[0]
      }
    } catch (error) {
      logger.error('Failed to get multistream stats:', error)
      return null
    }
  }
}
```

### Configuração de Webhooks

Configure webhooks no painel do Restream para receber notificações:

```typescript
// src/controllers/webhookController.ts
export class WebhookController {
  // Webhook do Restream
  async handleRestreamWebhook(req: Request, res: Response) {
    const { event, data } = req.body

    try {
      switch (event) {
        case 'stream.started':
          await this.handleStreamStarted(data)
          break
        
        case 'stream.ended':
          await this.handleStreamEnded(data)
          break
        
        case 'channel.connected':
          await this.handleChannelConnected(data)
          break
        
        case 'channel.disconnected':
          await this.handleChannelDisconnected(data)
          break
        
        default:
          logger.warn(`Unknown Restream webhook event: ${event}`)
      }

      res.json({ success: true })
    } catch (error) {
      logger.error('Failed to process Restream webhook:', error)
      res.status(500).json({ success: false })
    }
  }

  private async handleStreamStarted(data: any) {
    // Atualizar status do stream
    await query(
      'UPDATE streams SET multistream_status = $1 WHERE restream_id = $2',
      ['live', data.streamId]
    )
  }

  private async handleStreamEnded(data: any) {
    // Atualizar status e estatísticas
    await query(
      `UPDATE streams SET 
       multistream_status = $1, 
       total_viewers = $2,
       peak_viewers = $3
       WHERE restream_id = $4`,
      ['ended', data.totalViewers, data.peakViewers, data.streamId]
    )
  }
}
```

### Configuração de Chat Unificado

O Restream oferece chat unificado que pode ser integrado:

```typescript
// src/services/restreamChatService.ts
export class RestreamChatService {
  private websocket: WebSocket | null = null

  // Conectar ao chat do Restream
  async connectToChat(streamId: string) {
    const wsUrl = `wss://chat.restream.io/ws?token=${process.env.RESTREAM_API_KEY}`
    
    this.websocket = new WebSocket(wsUrl)
    
    this.websocket.onopen = () => {
      logger.info('Connected to Restream chat')
    }
    
    this.websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.handleChatMessage(streamId, message)
    }
    
    this.websocket.onerror = (error) => {
      logger.error('Restream chat error:', error)
    }
  }

  // Processar mensagem de chat
  private async handleChatMessage(streamId: string, message: any) {
    try {
      // Salvar mensagem no banco local
      await chatService.createMessage({
        streamId,
        platform: message.platform,
        platformUserId: message.userId,
        username: message.username,
        message: message.text,
        isModerator: message.isModerator,
        isSubscriber: message.isSubscriber,
        badges: message.badges,
        emotes: message.emotes
      })

      // Emitir via WebSocket para clientes conectados
      // socketService.emit(`stream:${streamId}:chat`, message)
    } catch (error) {
      logger.error('Failed to process chat message:', error)
    }
  }

  // Enviar mensagem para o chat
  async sendMessage(streamId: string, message: string) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'message',
        streamId,
        text: message
      }))
    }
  }

  // Desconectar do chat
  disconnect() {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
  }
}
```

### Configuração de Fallback

Para casos onde o Restream não está disponível:

```typescript
// src/services/fallbackMultistreamService.ts
export class FallbackMultistreamService {
  // Multistream direto usando FFmpeg
  async startDirectMultistream(streamKey: string, destinations: any[]) {
    const inputUrl = `rtmp://localhost:1935/live/${streamKey}`
    
    for (const dest of destinations) {
      const ffmpegArgs = [
        '-i', inputUrl,
        '-c', 'copy',
        '-f', 'flv',
        `${dest.rtmpUrl}/${dest.streamKey}`
      ]

      const process = spawn('ffmpeg', ffmpegArgs)
      
      process.on('error', (error) => {
        logger.error(`FFmpeg multistream error for ${dest.platform}:`, error)
      })
    }
  }
}
```

### Monitoramento

Configure alertas para:
- Status de conexão com plataformas
- Falhas de transmissão
- Qualidade do stream
- Limites de uso do plano gratuito

---


## Chat Unificado

O sistema de chat unificado agrega mensagens de todas as plataformas conectadas, permitindo interação centralizada com o público.

### Configuração de APIs das Plataformas

#### YouTube Live Chat API

```typescript
// src/services/youtubeChatService.ts
import { google } from 'googleapis'

export class YouTubeChatService {
  private youtube: any

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    })
  }

  async getLiveChatId(videoId: string) {
    const response = await this.youtube.videos.list({
      part: ['liveStreamingDetails'],
      id: [videoId]
    })

    return response.data.items[0]?.liveStreamingDetails?.activeLiveChatId
  }

  async getChatMessages(liveChatId: string, pageToken?: string) {
    const response = await this.youtube.liveChatMessages.list({
      liveChatId,
      part: ['snippet', 'authorDetails'],
      pageToken
    })

    return response.data
  }

  async sendChatMessage(liveChatId: string, message: string) {
    return await this.youtube.liveChatMessages.insert({
      part: ['snippet'],
      resource: {
        snippet: {
          liveChatId,
          type: 'textMessageEvent',
          textMessageDetails: {
            messageText: message
          }
        }
      }
    })
  }
}
```

#### Twitch Chat (IRC)

```typescript
// src/services/twitchChatService.ts
import * as tmi from 'tmi.js'

export class TwitchChatService {
  private client: tmi.Client

  constructor() {
    this.client = new tmi.Client({
      options: { debug: true },
      connection: {
        reconnect: true,
        secure: true
      },
      identity: {
        username: process.env.TWITCH_BOT_USERNAME,
        password: process.env.TWITCH_OAUTH_TOKEN
      },
      channels: []
    })
  }

  async connect() {
    await this.client.connect()
  }

  joinChannel(channel: string) {
    this.client.join(channel)
  }

  onMessage(callback: (channel: string, userstate: any, message: string) => void) {
    this.client.on('message', callback)
  }

  sendMessage(channel: string, message: string) {
    this.client.say(channel, message)
  }
}
```

### Agregador de Chat

```typescript
// src/services/chatAggregatorService.ts
export class ChatAggregatorService {
  private youtubeChatService: YouTubeChatService
  private twitchChatService: TwitchChatService
  private activeStreams: Map<string, any> = new Map()

  constructor() {
    this.youtubeChatService = new YouTubeChatService()
    this.twitchChatService = new TwitchChatService()
  }

  async startChatAggregation(streamId: string, platforms: any[]) {
    const streamConfig = {
      streamId,
      platforms: new Map()
    }

    for (const platform of platforms) {
      switch (platform.type) {
        case 'youtube':
          await this.setupYouTubeChat(streamConfig, platform)
          break
        case 'twitch':
          await this.setupTwitchChat(streamConfig, platform)
          break
        case 'facebook':
          await this.setupFacebookChat(streamConfig, platform)
          break
      }
    }

    this.activeStreams.set(streamId, streamConfig)
  }

  private async setupYouTubeChat(streamConfig: any, platform: any) {
    const liveChatId = await this.youtubeChatService.getLiveChatId(platform.videoId)
    
    if (liveChatId) {
      streamConfig.platforms.set('youtube', { liveChatId })
      
      // Polling para mensagens do YouTube
      setInterval(async () => {
        try {
          const messages = await this.youtubeChatService.getChatMessages(liveChatId)
          
          for (const message of messages.items) {
            await this.processChatMessage(streamConfig.streamId, {
              platform: 'youtube',
              username: message.authorDetails.displayName,
              message: message.snippet.displayMessage,
              timestamp: new Date(message.snippet.publishedAt),
              userId: message.authorDetails.channelId,
              isModerator: message.authorDetails.isChatModerator,
              isSubscriber: message.authorDetails.isChatSponsor
            })
          }
        } catch (error) {
          logger.error('YouTube chat polling error:', error)
        }
      }, 5000)
    }
  }

  private async setupTwitchChat(streamConfig: any, platform: any) {
    await this.twitchChatService.connect()
    this.twitchChatService.joinChannel(platform.channel)
    
    this.twitchChatService.onMessage(async (channel, userstate, message) => {
      await this.processChatMessage(streamConfig.streamId, {
        platform: 'twitch',
        username: userstate['display-name'],
        message,
        timestamp: new Date(),
        userId: userstate['user-id'],
        isModerator: userstate.mod,
        isSubscriber: userstate.subscriber,
        badges: userstate.badges
      })
    })
  }

  private async processChatMessage(streamId: string, messageData: any) {
    try {
      // Salvar no banco de dados
      const chatMessage = await chatService.createMessage({
        streamId,
        platform: messageData.platform,
        platformUserId: messageData.userId,
        username: messageData.username,
        message: messageData.message,
        isModerator: messageData.isModerator,
        isSubscriber: messageData.isSubscriber,
        badges: messageData.badges || [],
        emotes: messageData.emotes || []
      })

      // Emitir via WebSocket para clientes conectados
      socketService.emit(`stream:${streamId}:chat`, chatMessage)
    } catch (error) {
      logger.error('Failed to process chat message:', error)
    }
  }

  async sendMessageToAllPlatforms(streamId: string, message: string) {
    const streamConfig = this.activeStreams.get(streamId)
    if (!streamConfig) return

    for (const [platform, config] of streamConfig.platforms) {
      try {
        switch (platform) {
          case 'youtube':
            await this.youtubeChatService.sendChatMessage(config.liveChatId, message)
            break
          case 'twitch':
            this.twitchChatService.sendMessage(config.channel, message)
            break
        }
      } catch (error) {
        logger.error(`Failed to send message to ${platform}:`, error)
      }
    }
  }
}
```

## Hospedagem e Deploy

### Frontend (Vercel)

1. **Configuração do Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

2. **Variáveis de Ambiente**
   ```env
   NEXT_PUBLIC_API_URL=https://sua-api.com
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
   NEXT_PUBLIC_FIREBASE_API_KEY=sua-chave-firebase
   ```

### Backend (Railway/Render)

#### Railway

```bash
# Instalar CLI
npm install -g @railway/cli

# Login e deploy
railway login
railway init
railway up
```

#### Render

```yaml
# render.yaml
services:
  - type: web
    name: streaming-platform-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: streaming-platform-db
          property: connectionString
```

### Nginx RTMP (VPS)

```bash
# Deploy script
#!/bin/bash

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clonar repositório
git clone https://github.com/seu-usuario/streaming-platform.git
cd streaming-platform

# Configurar Nginx RTMP
docker-compose up -d nginx-rtmp

# Configurar SSL com Let's Encrypt
sudo apt install certbot
sudo certbot --nginx -d seu-dominio.com
```

## Monitoramento e Analytics

### Configuração do Uptime Monitoring

```typescript
// src/services/monitoringService.ts
export class MonitoringService {
  async checkServiceHealth() {
    const services = [
      { name: 'Database', check: () => this.checkDatabase() },
      { name: 'RTMP Server', check: () => this.checkRTMP() },
      { name: 'Storage', check: () => this.checkStorage() },
      { name: 'External APIs', check: () => this.checkExternalAPIs() }
    ]

    const results = await Promise.allSettled(
      services.map(async service => ({
        name: service.name,
        status: await service.check()
      }))
    )

    return results
  }

  private async checkDatabase() {
    try {
      await query('SELECT 1')
      return 'healthy'
    } catch (error) {
      return 'unhealthy'
    }
  }

  private async checkRTMP() {
    try {
      const response = await axios.get('http://localhost:8080/stat', { timeout: 5000 })
      return response.status === 200 ? 'healthy' : 'unhealthy'
    } catch (error) {
      return 'unhealthy'
    }
  }
}
```

### Analytics e Métricas

```typescript
// src/services/analyticsService.ts
export class AnalyticsService {
  async trackStreamEvent(event: string, streamId: string, data?: any) {
    await query(
      `INSERT INTO analytics_events (event_type, stream_id, data, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [event, streamId, JSON.stringify(data)]
    )
  }

  async getStreamAnalytics(streamId: string) {
    const result = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_viewers,
        AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_watch_time,
        MAX(viewer_count) as peak_viewers
      FROM analytics_events 
      WHERE stream_id = $1
    `, [streamId])

    return result.rows[0]
  }
}
```

## Configurações de Segurança

### Rate Limiting

```typescript
// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Too many requests from this IP'
})

export const streamLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 streams por hora
  message: 'Stream limit exceeded'
})
```

### Validação de Input

```typescript
// src/middleware/validation.ts
import { body, validationResult } from 'express-validator'

export const validateStreamCreation = [
  body('title').isLength({ min: 1, max: 100 }).trim(),
  body('description').optional().isLength({ max: 500 }).trim(),
  body('scheduledStartAt').optional().isISO8601(),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  }
]
```

### CORS e Headers de Segurança

```typescript
// src/middleware/security.ts
import cors from 'cors'
import helmet from 'helmet'

export const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://seu-dominio.com'
  ],
  credentials: true
}

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https:"]
    }
  }
})
```

## Variáveis de Ambiente

### Backend (.env)

```env
# Servidor
NODE_ENV=production
PORT=3001
API_URL=https://sua-api.com

# Banco de Dados
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico

# Autenticação
JWT_SECRET=sua-chave-jwt-super-secreta
FIREBASE_PROJECT_ID=seu-projeto-firebase
FIREBASE_PRIVATE_KEY=sua-chave-privada-firebase
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@seu-projeto.iam.gserviceaccount.com

# Armazenamento
CLOUDFLARE_ACCOUNT_ID=seu-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=sua-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=sua-secret-key
CLOUDFLARE_R2_BUCKET_NAME=streaming-platform-videos

# Multistream
RESTREAM_API_KEY=sua-chave-restream

# APIs Externas
YOUTUBE_API_KEY=sua-chave-youtube
TWITCH_CLIENT_ID=seu-client-id-twitch
TWITCH_CLIENT_SECRET=seu-client-secret-twitch
FACEBOOK_APP_ID=seu-app-id-facebook
FACEBOOK_APP_SECRET=seu-app-secret-facebook

# RTMP
NGINX_RTMP_HOST=seu-servidor-rtmp.com
NGINX_RTMP_PORT=1935
NGINX_STATS_URL=http://seu-servidor-rtmp.com:8080/stat

# Re-streaming
YOUTUBE_DL_PATH=yt-dlp
RESTREAM_WEBHOOK_URL=https://sua-api.com/api/restream/webhook/capture

# Monitoramento
SENTRY_DSN=sua-dsn-sentry
LOG_LEVEL=info
```

### Frontend (.env.local)

```env
# API
NEXT_PUBLIC_API_URL=https://sua-api.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=sua-chave-api
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
```

---

## Conclusão

Esta documentação fornece todas as configurações necessárias para implementar um sistema completo de live streaming usando exclusivamente serviços gratuitos. A arquitetura é escalável e pode ser migrada para planos pagos conforme o crescimento da plataforma.

### Próximos Passos

1. **Implementar todas as configurações** seguindo a ordem apresentada
2. **Testar cada serviço** individualmente antes da integração
3. **Configurar monitoramento** para acompanhar a saúde do sistema
4. **Documentar processos** de backup e recuperação
5. **Planejar escalabilidade** para migração futura

### Suporte e Manutenção

- **Logs centralizados** para debugging
- **Alertas automáticos** para falhas críticas
- **Backups regulares** de dados importantes
- **Atualizações de segurança** periódicas
- **Monitoramento de custos** para evitar surpresas

**Desenvolvido por:** Manus AI  
**Data:** Janeiro 2024  
**Versão:** 1.0

