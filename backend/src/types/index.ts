// Tipos de usuário
export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  firebaseUid?: string;
  auth0Sub?: string;
  isActive: boolean;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  firebaseUid?: string;
  auth0Sub?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
}

// Tipos de stream
export interface Stream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status: 'draft' | 'scheduled' | 'live' | 'ended' | 'error';
  streamKey: string;
  rtmpUrl?: string;
  hlsUrl?: string;
  dashUrl?: string;
  viewerCount: number;
  maxViewers: number;
  durationSeconds: number;
  isRecording: boolean;
  recordingUrl?: string;
  scheduledStartAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStreamData {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  scheduledStartAt?: Date;
  isRecording?: boolean;
}

export interface UpdateStreamData {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  scheduledStartAt?: Date;
  isRecording?: boolean;
}

// Tipos de vídeo
export interface Video {
  id: string;
  userId: string;
  title: string;
  description?: string;
  filename: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize?: number;
  durationSeconds?: number;
  format?: string;
  resolution?: string;
  status: 'processing' | 'ready' | 'error';
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoData {
  title: string;
  description?: string;
  filename: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize?: number;
  durationSeconds?: number;
  format?: string;
  resolution?: string;
  isPublic?: boolean;
}

// Tipos de agendamento
export interface Schedule {
  id: string;
  userId: string;
  streamId?: string;
  videoId?: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled' | 'error';
  type: 'live' | 'video';
  autoStart: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduleData {
  streamId?: string;
  videoId?: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  type: 'live' | 'video';
  autoStart?: boolean;
}

// Tipos de convidado
export interface Guest {
  id: string;
  streamId: string;
  name: string;
  email?: string;
  inviteToken: string;
  status: 'invited' | 'joined' | 'left' | 'banned';
  permissions: {
    canShareScreen: boolean;
    canUseMic: boolean;
    canUseCamera: boolean;
  };
  joinedAt?: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGuestData {
  streamId: string;
  name: string;
  email?: string;
  permissions?: {
    canShareScreen?: boolean;
    canUseMic?: boolean;
    canUseCamera?: boolean;
  };
}

// Tipos de configuração de multistream
export interface MultistreamConfig {
  id: string;
  userId: string;
  platform: 'youtube' | 'facebook' | 'twitch' | 'custom';
  platformUserId?: string;
  platformUsername?: string;
  streamKey: string;
  rtmpUrl: string;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMultistreamConfigData {
  platform: 'youtube' | 'facebook' | 'twitch' | 'custom';
  platformUserId?: string;
  platformUsername?: string;
  streamKey: string;
  rtmpUrl: string;
  isActive?: boolean;
}

// Tipos de re-stream do YouTube
export interface YouTubeRestream {
  id: string;
  userId: string;
  streamId?: string;
  youtubeUrl: string;
  youtubeVideoId?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'capturing' | 'streaming' | 'ended' | 'error';
  captureProcessId?: number;
  errorMessage?: string;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateYouTubeRestreamData {
  youtubeUrl: string;
  streamId?: string;
}

// Tipos de mensagem de chat
export interface ChatMessage {
  id: string;
  streamId: string;
  platform: 'youtube' | 'facebook' | 'twitch' | 'internal';
  platformUserId?: string;
  username: string;
  message: string;
  timestamp: Date;
  isModerator: boolean;
  isSubscriber: boolean;
  badges: string[];
  emotes: any[];
  createdAt: Date;
}

export interface CreateChatMessageData {
  streamId: string;
  userId?: string;
  platform: 'youtube' | 'facebook' | 'twitch' | 'internal';
  platformUserId?: string;
  username: string;
  message: string;
  isModerator?: boolean;
  isSubscriber?: boolean;
  badges?: string[];
  emotes?: any[];
}

// Tipos de analytics
export interface Analytics {
  id: string;
  streamId?: string;
  videoId?: string;
  userId: string;
  eventType: 'view' | 'like' | 'share' | 'comment' | 'subscribe';
  platform?: 'youtube' | 'facebook' | 'twitch' | 'internal';
  viewerIp?: string;
  viewerCountry?: string;
  viewerCity?: string;
  userAgent?: string;
  referrer?: string;
  sessionDuration?: number;
  timestamp: Date;
  metadata: any;
}

export interface CreateAnalyticsData {
  streamId?: string;
  videoId?: string;
  eventType: 'view' | 'like' | 'share' | 'comment' | 'subscribe';
  platform?: 'youtube' | 'facebook' | 'twitch' | 'internal';
  viewerIp?: string;
  viewerCountry?: string;
  viewerCity?: string;
  userAgent?: string;
  referrer?: string;
  sessionDuration?: number;
  metadata?: any;
}

// Tipos de overlay
export interface Overlay {
  id: string;
  userId: string;
  name: string;
  type: 'banner' | 'logo' | 'text' | 'countdown' | 'webcam' | 'screen';
  content: any;
  fileUrl?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOverlayData {
  name: string;
  type: 'banner' | 'logo' | 'text' | 'countdown' | 'webcam' | 'screen';
  content: any;
  fileUrl?: string;
  position?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  isActive?: boolean;
}

// Tipos de notificação
export interface Notification {
  id: string;
  userId: string;
  type: 'stream_started' | 'stream_ended' | 'guest_joined' | 'guest_left' | 'chat_message' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  metadata: any;
  createdAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  type: 'stream_started' | 'stream_ended' | 'guest_joined' | 'guest_left' | 'chat_message' | 'system';
  title: string;
  message: string;
  metadata?: any;
}

// Tipos de resposta da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos de filtros e consultas
export interface QueryFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// Tipos de configuração
export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  allowedOrigins: string[];
  rtmpServerUrl: string;
  cloudflareR2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    endpoint: string;
  };
  restream: {
    apiKey: string;
    rtmpUrl: string;
    streamKey: string;
  };
}

// Tipos de Socket.IO
export interface SocketEvents {
  'join-stream': (streamId: string) => void;
  'leave-stream': (streamId: string) => void;
  'send-chat-message': (data: { streamId: string; message: string }) => void;
  'webrtc-offer': (data: { streamId: string; offer: any; targetUserId?: string }) => void;
  'webrtc-answer': (data: { streamId: string; answer: any; targetUserId: string }) => void;
  'webrtc-ice-candidate': (data: { streamId: string; candidate: any; targetUserId?: string }) => void;
  'start-stream': (streamId: string) => void;
  'stop-stream': (streamId: string) => void;
  'start-screen-share': (data: { streamId: string }) => void;
  'stop-screen-share': (data: { streamId: string }) => void;
  'guest-status-update': (data: { streamId: string; status: string }) => void;
}

