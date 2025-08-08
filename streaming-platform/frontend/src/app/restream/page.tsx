'use client'

import { useState, useEffect } from 'react'
import { 
  Play, 
  Square, 
  Youtube, 
  Eye, 
  Clock, 
  Settings,
  Plus,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Input, Badge, Modal } from '@/components/ui'
import toast from 'react-hot-toast'

interface YouTubeVideoInfo {
  videoId: string
  title: string
  description: string
  thumbnail: string
  isLive: boolean
  channelName: string
  viewCount?: number
}

interface Restream {
  id: string
  title: string
  status: 'pending' | 'capturing' | 'streaming' | 'ended' | 'error'
  youtubeUrl: string
  thumbnail: string
  startedAt?: string
  viewerCount?: number
  errorMessage?: string
}

export default function RestreamPage() {
  const [restreams, setRestreams] = useState<Restream[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null)
  const [loadingVideoInfo, setLoadingVideoInfo] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadRestreams()
  }, [])

  const loadRestreams = async () => {
    try {
      // Simular carregamento de dados
      setTimeout(() => {
        setRestreams([
          {
            id: '1',
            title: 'Live de Programação - React Hooks',
            status: 'streaming',
            youtubeUrl: 'https://youtube.com/watch?v=example1',
            thumbnail: '/api/placeholder/320/180',
            startedAt: '2024-01-15T14:30:00Z',
            viewerCount: 45
          },
          {
            id: '2',
            title: 'Tutorial JavaScript Avançado',
            status: 'ended',
            youtubeUrl: 'https://youtube.com/watch?v=example2',
            thumbnail: '/api/placeholder/320/180',
            startedAt: '2024-01-14T20:00:00Z'
          },
          {
            id: '3',
            title: 'Erro na Captura - Vídeo Privado',
            status: 'error',
            youtubeUrl: 'https://youtube.com/watch?v=example3',
            thumbnail: '/api/placeholder/320/180',
            errorMessage: 'Video is private or unavailable'
          }
        ])
        setLoading(false)
      }, 1000)
    } catch (error) {
      toast.error('Erro ao carregar re-streams')
      setLoading(false)
    }
  }

  const handleGetVideoInfo = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Digite uma URL do YouTube')
      return
    }

    setLoadingVideoInfo(true)
    try {
      // Simular chamada de API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Simular resposta da API
      setVideoInfo({
        videoId: 'example123',
        title: 'Live de Programação - Construindo uma API REST',
        description: 'Nesta live vamos construir uma API REST completa usando Node.js e Express...',
        thumbnail: '/api/placeholder/480/270',
        isLive: true,
        channelName: 'Canal de Programação',
        viewCount: 1250
      })
    } catch (error) {
      toast.error('Erro ao obter informações do vídeo')
    } finally {
      setLoadingVideoInfo(false)
    }
  }

  const handleCreateRestream = async () => {
    if (!videoInfo) {
      toast.error('Obtenha as informações do vídeo primeiro')
      return
    }

    if (!videoInfo.isLive) {
      toast.error('O vídeo não é uma transmissão ao vivo')
      return
    }

    setCreating(true)
    try {
      // Simular criação do re-stream
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newRestream: Restream = {
        id: Date.now().toString(),
        title: videoInfo.title,
        status: 'capturing',
        youtubeUrl,
        thumbnail: videoInfo.thumbnail,
        startedAt: new Date().toISOString()
      }

      setRestreams(prev => [newRestream, ...prev])
      setShowCreateModal(false)
      setYoutubeUrl('')
      setVideoInfo(null)
      
      toast.success('Re-stream iniciado com sucesso!')
    } catch (error) {
      toast.error('Erro ao criar re-stream')
    } finally {
      setCreating(false)
    }
  }

  const handleStopRestream = async (id: string) => {
    try {
      // Simular parada do re-stream
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setRestreams(prev => 
        prev.map(restream => 
          restream.id === id 
            ? { ...restream, status: 'ended' as const }
            : restream
        )
      )
      
      toast.success('Re-stream parado com sucesso!')
    } catch (error) {
      toast.error('Erro ao parar re-stream')
    }
  }

  const getStatusBadge = (status: Restream['status']) => {
    const variants = {
      pending: 'warning' as const,
      capturing: 'primary' as const,
      streaming: 'danger' as const,
      ended: 'secondary' as const,
      error: 'danger' as const
    }

    const labels = {
      pending: 'PENDENTE',
      capturing: 'CAPTURANDO',
      streaming: 'AO VIVO',
      ended: 'FINALIZADO',
      error: 'ERRO'
    }

    const icons = {
      pending: <Clock className="w-3 h-3 mr-1" />,
      capturing: <Play className="w-3 h-3 mr-1" />,
      streaming: <Play className="w-3 h-3 mr-1" />,
      ended: <CheckCircle className="w-3 h-3 mr-1" />,
      error: <XCircle className="w-3 h-3 mr-1" />
    }

    return (
      <Badge variant={variants[status]} size="sm" className="flex items-center">
        {icons[status]}
        {labels[status]}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
                <Youtube className="w-8 h-8 mr-3 text-red-600" />
                Re-streaming do YouTube
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Capture e retransmita lives públicas do YouTube com overlays personalizados
              </p>
            </div>
            
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Re-stream
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardBody>
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Como funciona o Re-streaming
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Cole a URL de uma live pública do YouTube e nossa plataforma irá capturar o stream, 
                  permitindo adicionar overlays personalizados e retransmitir para múltiplas plataformas.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Re-streams List */}
        {restreams.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Youtube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum re-stream encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Comece criando seu primeiro re-stream de uma live do YouTube.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Re-stream
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restreams.map((restream) => (
              <Card key={restream.id} className="overflow-hidden">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                  <div className="w-full h-full bg-gray-300 dark:bg-gray-600"></div>
                  
                  {/* Status Overlay */}
                  <div className="absolute top-3 left-3">
                    {getStatusBadge(restream.status)}
                  </div>
                  
                  {/* Viewer Count */}
                  {restream.status === 'streaming' && restream.viewerCount && (
                    <div className="absolute top-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm flex items-center">
                      <Eye className="w-3 h-3 mr-1" />
                      {restream.viewerCount}
                    </div>
                  )}
                </div>
                
                <CardBody>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {restream.title}
                  </h3>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-3">
                    <Youtube className="w-4 h-4 mr-1" />
                    <span className="truncate">YouTube</span>
                  </div>
                  
                  {restream.startedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Iniciado em {formatDate(restream.startedAt)}
                    </p>
                  )}
                  
                  {restream.errorMessage && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                      Erro: {restream.errorMessage}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    {restream.status === 'streaming' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="danger"
                          onClick={() => handleStopRestream(restream.id)}
                        >
                          <Square className="w-3 h-3 mr-1" />
                          Parar
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="w-3 h-3 mr-1" />
                          Config
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(restream.youtubeUrl, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Original
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Restream Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Criar Re-stream do YouTube"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <Input
              label="URL da Live do YouTube"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              fullWidth
              helperText="Cole a URL de uma transmissão ao vivo pública do YouTube"
            />
            
            <div className="mt-3">
              <Button 
                onClick={handleGetVideoInfo}
                loading={loadingVideoInfo}
                disabled={!youtubeUrl.trim()}
                variant="outline"
                fullWidth
              >
                Obter Informações do Vídeo
              </Button>
            </div>
          </div>

          {videoInfo && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <CardBody>
                <div className="flex space-x-4">
                  <div className="w-24 h-16 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {videoInfo.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      Canal: {videoInfo.channelName}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        {videoInfo.isLive ? (
                          <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 mr-1" />
                        )}
                        <span className={videoInfo.isLive ? 'text-green-600' : 'text-red-600'}>
                          {videoInfo.isLive ? 'Ao vivo' : 'Não é uma live'}
                        </span>
                      </div>
                      
                      {videoInfo.viewCount && (
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <Eye className="w-4 h-4 mr-1" />
                          {videoInfo.viewCount.toLocaleString()} visualizações
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateRestream}
              loading={creating}
              disabled={!videoInfo || !videoInfo.isLive}
            >
              Iniciar Re-stream
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

