-- Schema do banco de dados para a plataforma de streaming
-- PostgreSQL

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    firebase_uid VARCHAR(255) UNIQUE,
    auth0_sub VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de streams
CREATE TABLE streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, live, ended, error
    stream_key VARCHAR(255) UNIQUE NOT NULL,
    rtmp_url TEXT,
    hls_url TEXT,
    dash_url TEXT,
    viewer_count INTEGER DEFAULT 0,
    max_viewers INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    is_recording BOOLEAN DEFAULT true,
    recording_url TEXT,
    scheduled_start_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vídeos (pré-gravados)
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size BIGINT,
    duration_seconds INTEGER,
    format VARCHAR(10), -- mp4, mov, avi, etc.
    resolution VARCHAR(20), -- 1080p, 720p, etc.
    status VARCHAR(20) DEFAULT 'processing', -- processing, ready, error
    is_public BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, running, completed, cancelled, error
    type VARCHAR(20) NOT NULL, -- live, video
    auto_start BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: deve ter stream_id OU video_id, mas não ambos
    CONSTRAINT check_schedule_type CHECK (
        (stream_id IS NOT NULL AND video_id IS NULL) OR 
        (stream_id IS NULL AND video_id IS NOT NULL)
    )
);

-- Tabela de convidados
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    invite_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'invited', -- invited, joined, left, banned
    permissions JSONB DEFAULT '{"can_share_screen": true, "can_use_mic": true, "can_use_camera": true}',
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações de multistream
CREATE TABLE multistream_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- youtube, facebook, twitch, etc.
    platform_user_id VARCHAR(255),
    platform_username VARCHAR(255),
    stream_key VARCHAR(255) NOT NULL,
    rtmp_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, platform)
);

-- Tabela de re-streams do YouTube
CREATE TABLE youtube_restreams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    youtube_url TEXT NOT NULL,
    youtube_video_id VARCHAR(20),
    title VARCHAR(255),
    description TEXT,
    thumbnail_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, capturing, streaming, ended, error
    capture_process_id INTEGER,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens de chat
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- youtube, facebook, twitch, internal
    platform_user_id VARCHAR(255),
    username VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_moderator BOOLEAN DEFAULT false,
    is_subscriber BOOLEAN DEFAULT false,
    badges JSONB DEFAULT '[]',
    emotes JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de analytics
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- view, like, share, comment, etc.
    platform VARCHAR(50), -- youtube, facebook, twitch, internal
    viewer_ip INET,
    viewer_country VARCHAR(2),
    viewer_city VARCHAR(100),
    user_agent TEXT,
    referrer TEXT,
    session_duration INTEGER, -- em segundos
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Tabela de overlays e banners
CREATE TABLE overlays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- banner, logo, text, countdown, etc.
    content JSONB NOT NULL, -- configurações específicas do overlay
    file_url TEXT, -- para overlays baseados em imagem
    position JSONB DEFAULT '{"x": 0, "y": 0, "width": 100, "height": 50}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de associação entre streams e overlays
CREATE TABLE stream_overlays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    overlay_id UUID NOT NULL REFERENCES overlays(id) ON DELETE CASCADE,
    is_visible BOOLEAN DEFAULT true,
    z_index INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(stream_id, overlay_id)
);

-- Tabela de notificações
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- stream_started, stream_ended, guest_joined, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_streams_user_id ON streams(user_id);
CREATE INDEX idx_streams_status ON streams(status);
CREATE INDEX idx_streams_scheduled_start ON streams(scheduled_start_at);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_schedules_scheduled_at ON schedules(scheduled_at);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_guests_stream_id ON guests(stream_id);
CREATE INDEX idx_guests_invite_token ON guests(invite_token);
CREATE INDEX idx_multistream_configs_user_id ON multistream_configs(user_id);
CREATE INDEX idx_youtube_restreams_user_id ON youtube_restreams(user_id);
CREATE INDEX idx_youtube_restreams_status ON youtube_restreams(status);
CREATE INDEX idx_chat_messages_stream_id ON chat_messages(stream_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_analytics_stream_id ON analytics(stream_id);
CREATE INDEX idx_analytics_video_id ON analytics(video_id);
CREATE INDEX idx_analytics_user_id ON analytics(user_id);
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX idx_overlays_user_id ON overlays(user_id);
CREATE INDEX idx_stream_overlays_stream_id ON stream_overlays(stream_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON streams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_multistream_configs_updated_at BEFORE UPDATE ON multistream_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_youtube_restreams_updated_at BEFORE UPDATE ON youtube_restreams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overlays_updated_at BEFORE UPDATE ON overlays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views úteis
CREATE VIEW active_streams AS
SELECT 
    s.*,
    u.username,
    u.full_name,
    COUNT(g.id) as guest_count
FROM streams s
JOIN users u ON s.user_id = u.id
LEFT JOIN guests g ON s.id = g.stream_id AND g.status = 'joined'
WHERE s.status IN ('live', 'scheduled')
GROUP BY s.id, u.username, u.full_name;

CREATE VIEW stream_analytics_summary AS
SELECT 
    s.id as stream_id,
    s.title,
    s.viewer_count,
    s.max_viewers,
    s.duration_seconds,
    COUNT(DISTINCT a.id) as total_events,
    COUNT(DISTINCT CASE WHEN a.event_type = 'view' THEN a.id END) as total_views,
    COUNT(DISTINCT cm.id) as total_chat_messages
FROM streams s
LEFT JOIN analytics a ON s.id = a.stream_id
LEFT JOIN chat_messages cm ON s.id = cm.stream_id
GROUP BY s.id, s.title, s.viewer_count, s.max_viewers, s.duration_seconds;

-- Dados iniciais (seeds)
INSERT INTO users (email, username, full_name, subscription_tier) VALUES
('admin@streaming.com', 'admin', 'Administrador', 'enterprise'),
('demo@streaming.com', 'demo', 'Usuário Demo', 'free');

-- Comentários para documentação
COMMENT ON TABLE users IS 'Tabela de usuários da plataforma';
COMMENT ON TABLE streams IS 'Tabela de transmissões ao vivo';
COMMENT ON TABLE videos IS 'Tabela de vídeos pré-gravados';
COMMENT ON TABLE schedules IS 'Tabela de agendamentos de transmissões';
COMMENT ON TABLE guests IS 'Tabela de convidados para transmissões';
COMMENT ON TABLE multistream_configs IS 'Configurações de multistream para diferentes plataformas';
COMMENT ON TABLE youtube_restreams IS 'Tabela de re-transmissões do YouTube';
COMMENT ON TABLE chat_messages IS 'Mensagens de chat unificado';
COMMENT ON TABLE analytics IS 'Dados de analytics e métricas';
COMMENT ON TABLE overlays IS 'Overlays e banners personalizados';
COMMENT ON TABLE stream_overlays IS 'Associação entre streams e overlays';
COMMENT ON TABLE notifications IS 'Notificações para usuários';



-- Tabelas para agendamento de vídeos pré-gravados

-- Tabela de vídeos agendados
CREATE TABLE scheduled_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL, -- em segundos
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'streaming', 'completed', 'failed', 'cancelled')),
    stream_key VARCHAR(255),
    multistream BOOLEAN DEFAULT false,
    overlays JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de canais de TV 24h
CREATE TABLE tv_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    stream_key VARCHAR(255) UNIQUE NOT NULL,
    current_video_index INTEGER DEFAULT 0,
    loop_playlist BOOLEAN DEFAULT true,
    multistream BOOLEAN DEFAULT false,
    overlays JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens da playlist dos canais
CREATE TABLE playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES tv_channels(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, order_index)
);

-- Tabela de logs de execução de agendamentos
CREATE TABLE schedule_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_video_id UUID REFERENCES scheduled_videos(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES tv_channels(id) ON DELETE CASCADE,
    execution_type VARCHAR(20) NOT NULL CHECK (execution_type IN ('scheduled_video', 'channel_video')),
    video_id UUID NOT NULL REFERENCES videos(id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'interrupted')),
    error_message TEXT,
    viewer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_scheduled_videos_user_id ON scheduled_videos(user_id);
CREATE INDEX idx_scheduled_videos_scheduled_at ON scheduled_videos(scheduled_at);
CREATE INDEX idx_scheduled_videos_status ON scheduled_videos(status);
CREATE INDEX idx_tv_channels_user_id ON tv_channels(user_id);
CREATE INDEX idx_tv_channels_is_active ON tv_channels(is_active);
CREATE INDEX idx_playlist_items_channel_id ON playlist_items(channel_id);
CREATE INDEX idx_playlist_items_order ON playlist_items(channel_id, order_index);
CREATE INDEX idx_schedule_logs_scheduled_video_id ON schedule_execution_logs(scheduled_video_id);
CREATE INDEX idx_schedule_logs_channel_id ON schedule_execution_logs(channel_id);
CREATE INDEX idx_schedule_logs_started_at ON schedule_execution_logs(started_at);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scheduled_videos_updated_at 
    BEFORE UPDATE ON scheduled_videos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tv_channels_updated_at 
    BEFORE UPDATE ON tv_channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views úteis para relatórios

-- View de estatísticas de agendamentos por usuário
CREATE VIEW user_scheduling_stats AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(sv.id) as total_scheduled,
    COUNT(sv.id) FILTER (WHERE sv.status = 'scheduled') as pending_scheduled,
    COUNT(sv.id) FILTER (WHERE sv.status = 'completed') as completed_scheduled,
    COUNT(sv.id) FILTER (WHERE sv.status = 'failed') as failed_scheduled,
    COUNT(tc.id) as total_channels,
    COUNT(tc.id) FILTER (WHERE tc.is_active = true) as active_channels,
    COALESCE(SUM(sv.duration) FILTER (WHERE sv.status = 'completed'), 0) as total_streamed_duration
FROM users u
LEFT JOIN scheduled_videos sv ON u.id = sv.user_id
LEFT JOIN tv_channels tc ON u.id = tc.user_id
GROUP BY u.id, u.email;

-- View de próximos agendamentos
CREATE VIEW upcoming_schedules AS
SELECT 
    sv.*,
    v.title as video_title,
    v.thumbnail_key,
    v.file_key,
    u.email as user_email
FROM scheduled_videos sv
JOIN videos v ON sv.video_id = v.id
JOIN users u ON sv.user_id = u.id
WHERE sv.status = 'scheduled' 
AND sv.scheduled_at > NOW()
ORDER BY sv.scheduled_at ASC;

-- View de canais ativos com detalhes
CREATE VIEW active_channels_details AS
SELECT 
    tc.*,
    u.email as user_email,
    COUNT(pi.id) as playlist_count,
    COALESCE(SUM(v.duration), 0) as total_playlist_duration,
    ARRAY_AGG(
        json_build_object(
            'video_id', v.id,
            'title', v.title,
            'duration', v.duration,
            'order_index', pi.order_index
        ) ORDER BY pi.order_index
    ) as playlist_videos
FROM tv_channels tc
JOIN users u ON tc.user_id = u.id
LEFT JOIN playlist_items pi ON tc.id = pi.channel_id
LEFT JOIN videos v ON pi.video_id = v.id
WHERE tc.is_active = true
GROUP BY tc.id, u.email;

-- Função para limpar agendamentos antigos
CREATE OR REPLACE FUNCTION cleanup_old_schedules(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM scheduled_videos 
    WHERE status IN ('completed', 'failed', 'cancelled') 
    AND updated_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM schedule_execution_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de uso por período
CREATE OR REPLACE FUNCTION get_usage_stats(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    total_schedules BIGINT,
    completed_schedules BIGINT,
    failed_schedules BIGINT,
    total_streaming_hours NUMERIC,
    active_channels BIGINT,
    total_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(sv.id) as total_schedules,
        COUNT(sv.id) FILTER (WHERE sv.status = 'completed') as completed_schedules,
        COUNT(sv.id) FILTER (WHERE sv.status = 'failed') as failed_schedules,
        COALESCE(SUM(sv.duration) FILTER (WHERE sv.status = 'completed'), 0)::NUMERIC / 3600 as total_streaming_hours,
        COUNT(DISTINCT tc.id) FILTER (WHERE tc.is_active = true) as active_channels,
        COUNT(DISTINCT sv.user_id) as total_users
    FROM scheduled_videos sv
    LEFT JOIN tv_channels tc ON sv.user_id = tc.user_id
    WHERE sv.created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

