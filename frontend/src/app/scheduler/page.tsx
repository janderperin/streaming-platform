'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  Play, 
  Square, 
  Plus,
  Video,
  Tv,
  Settings,
  Eye,
  Edit,
  Trash2,
  Copy,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Input, Badge, Modal } from '@/components/ui'
import toast from 'react-hot-toast'

interface ScheduledVideo {
  id: string
  videoId: string
  title: string
  videoTitle: string
  scheduledAt: string
  duration: number
  status: 'scheduled' | 'streaming' | 'completed' | 'failed' | 'cancelled'
  multistream: boolean
  thumbnailKey?: string
}

interface TVChannel {
  id: string
  name: string
  description: string
  isActive: boolean
  streamKey: string
  videoCount: number
  totalDuration: number
  loopPlaylist: boolean
  multistream: boolean
  createdAt: string
}

interface Video {
  id: string
  title: string
  duration: number
  thumbnailKey?: string
  fileKey: string
}

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState<'videos' | 'channels'>('videos')
  const [scheduledVideos, setScheduledVideos] = useState<ScheduledVideo[]>([])
  const [tvChannels, setTVChannels] = useState<TVChannel[]>([])
  const [userVideos, setUserVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  
  // Form states
  const [selectedVideo, setSelectedVideo] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [enableMultistream, setEnableMultistream] = useState(false)
  
  // Channel form states
  const [channelName, setChannelName] = useState('')
  const [channelDescription, setChannelDescription] = useState('')
  const [channelPlaylist, setChannelPlaylist] = useState<string[]>([])
  const [loopPlaylist, setLoopPlaylist] = useState(true)
  const [channelMultistream, setChannelMultistream] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Simular carregamento de dados
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Dados simulados
      setScheduledVideos([
        {
          id: '1',
          videoId: 'v1',
          title: 'Tutorial React - Parte 1',
          videoTitle: 'Tutorial React - Parte 1',
          scheduledAt: '2024-01-20T14:30:00Z',
          duration: 1800,
          status: 'scheduled',
          multistream: true,
          thumbnailKey: '/api/placeholder/320/180'
        },
        {
          id: '2',
          videoId: 'v2',
          title: 'Live de JavaScript',
          videoTitle: 'Live de JavaScript',
          scheduledAt: '2024-01-19T20:00:00Z',
          duration: 3600,
          status: 'completed',
          multistream: false
        }
      ])

      setTVChannels([
        {
          id: '1',
          name: 'Canal Educativo 24h',
          description: 'Programação educativa contínua',
          isActive: true,
          streamKey: 'tv_channel_1',
          videoCount: 12,
          totalDuration: 43200,
          loopPlaylist: true,
          multistream: true,
          createdAt: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'Canal de Entretenimento',
          description: 'Vídeos de entretenimento e humor',
          isActive: false,
          streamKey: 'tv_channel_2',
          videoCount: 8,
          totalDuration: 28800,
          loopPlaylist: true,
          multistream: false,
          createdAt: '2024-01-10T15:30:00Z'
        }
      ])

      setUserVideos([
        {
          id: 'v1',
          title: 'Tutorial React - Parte 1',
          duration: 1800,
          thumbnailKey: '/api/placeholder/320/180',
          fileKey: 'videos/user1/react_tutorial_1.mp4'
        },
        {
          id: 'v2',
          title: 'Live de JavaScript',
          duration: 3600,
          thumbnailKey: '/api/placeholder/320/180',
          fileKey: 'videos/user1/javascript_live.mp4'
        },
        {
          id: 'v3',
          title: 'Curso de Node.js',
          duration: 2700,
          thumbnailKey: '/api/placeholder/320/180',
          fileKey: 'videos/user1/nodejs_course.mp4'
        }
      ])
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleVideo = async () => {
    if (!selectedVideo || !scheduledDate || !scheduledTime) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
      
      if (scheduledAt <= new Date()) {
        toast.error('A data deve ser futura')
        return
      }

      // Simular agendamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const selectedVideoData = userVideos.find(v => v.id === selectedVideo)
      
      const newSchedule: ScheduledVideo = {
        id: Date.now().toString(),
        videoId: selectedVideo,
        title: customTitle || selectedVideoData?.title || '',
        videoTitle: selectedVideoData?.title || '',
        scheduledAt: scheduledAt.toISOString(),
        duration: selectedVideoData?.duration || 0,
        status: 'scheduled',
        multistream: enableMultistream,
        thumbnailKey: selectedVideoData?.thumbnailKey
      }

      setScheduledVideos(prev => [newSchedule, ...prev])
      setShowScheduleModal(false)
      resetScheduleForm()
      
      toast.success('Vídeo agendado com sucesso!')
    } catch (error) {
      toast.error('Erro ao agendar vídeo')
    }
  }

  const handleCreateChannel = async () => {
    if (!channelName || channelPlaylist.length === 0) {
      toast.error('Nome do canal e playlist são obrigatórios')
      return
    }

    try {
      // Simular criação do canal
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newChannel: TVChannel = {
        id: Date.now().toString(),
        name: channelName,
        description: channelDescription,
        isActive: false,
        streamKey: `tv_${Date.now()}`,
        videoCount: channelPlaylist.length,
        totalDuration: channelPlaylist.reduce((total, videoId) => {
          const video = userVideos.find(v => v.id === videoId)
          return total + (video?.duration || 0)
        }, 0),
        loopPlaylist,
        multistream: channelMultistream,
        createdAt: new Date().toISOString()
      }

      setTVChannels(prev => [newChannel, ...prev])
      setShowChannelModal(false)
      resetChannelForm()
      
      toast.success('Canal de TV criado com sucesso!')
    } catch (error) {
      toast.error('Erro ao criar canal')
    }
  }

  const handleToggleChannel = async (channelId: string, isActive: boolean) => {
    try {
      // Simular toggle do canal
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setTVChannels(prev => 
        prev.map(channel => 
          channel.id === channelId 
            ? { ...channel, isActive: !isActive }
            : channel
        )
      )
      
      toast.success(isActive ? 'Canal parado' : 'Canal iniciado')
    } catch (error) {
      toast.error('Erro ao alterar status do canal')
    }
  }

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      // Simular cancelamento
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setScheduledVideos(prev => 
        prev.map(schedule => 
          schedule.id === scheduleId 
            ? { ...schedule, status: 'cancelled' as const }
            : schedule
        )
      )
      
      toast.success('Agendamento cancelado')
    } catch (error) {
      toast.error('Erro ao cancelar agendamento')
    }
  }

  const resetScheduleForm = () => {
    setSelectedVideo('')
    setScheduledDate('')
    setScheduledTime('')
    setCustomTitle('')
    setEnableMultistream(false)
  }

  const resetChannelForm = () => {
    setChannelName('')
    setChannelDescription('')
    setChannelPlaylist([])
    setLoopPlaylist(true)
    setChannelMultistream(false)
  }

  const getStatusBadge = (status: ScheduledVideo['status']) => {
    const variants = {
      scheduled: 'warning' as const,
      streaming: 'danger' as const,
      completed: 'success' as const,
      failed: 'danger' as const,
      cancelled: 'secondary' as const
    }

    const labels = {
      scheduled: 'AGENDADO',
      streaming: 'AO VIVO',
      completed: 'CONCLUÍDO',
      failed: 'FALHOU',
      cancelled: 'CANCELADO'
    }

    const icons = {
      scheduled: <Clock className="w-3 h-3 mr-1" />,
      streaming: <Play className="w-3 h-3 mr-1" />,
      completed: <CheckCircle className="w-3 h-3 mr-1" />,
      failed: <XCircle className="w-3 h-3 mr-1" />,
      cancelled: <XCircle className="w-3 h-3 mr-1" />
    }

    return (
      <Badge variant={variants[status]} size="sm" className="flex items-center">
        {icons[status]}
        {labels[status]}
      </Badge>
    )
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Calendar className="w-8 h-8 mr-3 text-blue-600" />
                Agendamento de Transmissões
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Programe vídeos para transmissão automática e crie canais de TV 24h
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => setShowScheduleModal(true)}
              >
                <Video className="w-4 h-4 mr-2" />
                Agendar Vídeo
              </Button>
              <Button onClick={() => setShowChannelModal(true)}>
                <Tv className="w-4 h-4 mr-2" />
                Criar Canal TV
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('videos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'videos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Video className="w-4 h-4 inline mr-2" />
              Vídeos Agendados
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'channels'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Tv className="w-4 h-4 inline mr-2" />
              Canais de TV 24h
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'videos' && (
            <div>
              {scheduledVideos.length === 0 ? (
                <Card>
                  <CardBody className="text-center py-12">
                    <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum vídeo agendado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Comece agendando seu primeiro vídeo para transmissão automática.
                    </p>
                    <Button onClick={() => setShowScheduleModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agendar Vídeo
                    </Button>
                  </CardBody>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scheduledVideos.map((schedule) => (
                    <Card key={schedule.id}>
                      <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                        <div className="w-full h-full bg-gray-300 dark:bg-gray-600"></div>
                        
                        {/* Status Badge */}
                        <div className="absolute top-3 left-3">
                          {getStatusBadge(schedule.status)}
                        </div>
                        
                        {/* Multistream Indicator */}
                        {schedule.multistream && (
                          <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                            Multistream
                          </div>
                        )}
                      </div>
                      
                      <CardBody>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {schedule.title}
                        </h3>
                        
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDateTime(schedule.scheduledAt)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {formatDuration(schedule.duration)}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {schedule.status === 'scheduled' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {/* Editar */}}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="danger"
                                onClick={() => handleCancelSchedule(schedule.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          )}
                          
                          {schedule.status === 'completed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {/* Duplicar */}}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Duplicar
                            </Button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'channels' && (
            <div>
              {tvChannels.length === 0 ? (
                <Card>
                  <CardBody className="text-center py-12">
                    <Tv className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum canal de TV criado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Crie seu primeiro canal de TV 24h com programação automática.
                    </p>
                    <Button onClick={() => setShowChannelModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Canal TV
                    </Button>
                  </CardBody>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tvChannels.map((channel) => (
                    <Card key={channel.id}>
                      <CardBody>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {channel.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {channel.description}
                            </p>
                          </div>
                          
                          <Badge 
                            variant={channel.isActive ? 'success' : 'secondary'}
                            size="sm"
                          >
                            {channel.isActive ? 'ATIVO' : 'INATIVO'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                          <div className="flex items-center justify-between">
                            <span>Vídeos na playlist:</span>
                            <span className="font-medium">{channel.videoCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Duração total:</span>
                            <span className="font-medium">{formatDuration(channel.totalDuration)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Loop playlist:</span>
                            <span className="font-medium">{channel.loopPlaylist ? 'Sim' : 'Não'}</span>
                          </div>
                          {channel.multistream && (
                            <div className="flex items-center text-blue-600">
                              <span className="text-xs">Multistream ativo</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant={channel.isActive ? 'danger' : 'primary'}
                            onClick={() => handleToggleChannel(channel.id, channel.isActive)}
                          >
                            {channel.isActive ? (
                              <>
                                <Square className="w-3 h-3 mr-1" />
                                Parar
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Iniciar
                              </>
                            )}
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {/* Configurar */}}
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Config
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {/* Ver detalhes */}}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Video Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Agendar Vídeo"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selecionar Vídeo *
            </label>
            <select
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Escolha um vídeo...</option>
              {userVideos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title} ({formatDuration(video.duration)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data *"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              fullWidth
            />
            <Input
              label="Horário *"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              fullWidth
            />
          </div>

          <Input
            label="Título Personalizado"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Deixe vazio para usar o título original"
            fullWidth
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="multistream"
              checked={enableMultistream}
              onChange={(e) => setEnableMultistream(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="multistream" className="text-sm text-gray-700 dark:text-gray-300">
              Ativar multistream para múltiplas plataformas
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setShowScheduleModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleScheduleVideo}>
              Agendar Vídeo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Channel Modal */}
      <Modal
        isOpen={showChannelModal}
        onClose={() => setShowChannelModal(false)}
        title="Criar Canal de TV 24h"
        size="lg"
      >
        <div className="space-y-6">
          <Input
            label="Nome do Canal *"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Ex: Canal Educativo 24h"
            fullWidth
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              value={channelDescription}
              onChange={(e) => setChannelDescription(e.target.value)}
              placeholder="Descreva a programação do seu canal..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Playlist de Vídeos *
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {userVideos.map((video) => (
                <div key={video.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`video-${video.id}`}
                    checked={channelPlaylist.includes(video.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setChannelPlaylist(prev => [...prev, video.id])
                      } else {
                        setChannelPlaylist(prev => prev.filter(id => id !== video.id))
                      }
                    }}
                    className="mr-3"
                  />
                  <label htmlFor={`video-${video.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                    {video.title} ({formatDuration(video.duration)})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="loop"
                checked={loopPlaylist}
                onChange={(e) => setLoopPlaylist(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="loop" className="text-sm text-gray-700 dark:text-gray-300">
                Repetir playlist continuamente (24h)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="channel-multistream"
                checked={channelMultistream}
                onChange={(e) => setChannelMultistream(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="channel-multistream" className="text-sm text-gray-700 dark:text-gray-300">
                Ativar multistream para múltiplas plataformas
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setShowChannelModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateChannel}>
              Criar Canal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

