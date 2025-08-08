'use client'

import { useState, useEffect } from 'react'
import { 
  Play, 
  Users, 
  Eye, 
  Calendar, 
  Plus, 
  Settings, 
  BarChart3,
  Video,
  Radio,
  Upload
} from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Badge } from '@/components/ui'
import Link from 'next/link'

interface Stream {
  id: string
  title: string
  status: 'live' | 'scheduled' | 'ended' | 'draft'
  viewers: number
  scheduledAt?: string
  thumbnail?: string
}

interface Stats {
  totalStreams: number
  totalViews: number
  totalHours: number
  activeStreams: number
}

export default function DashboardPage() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [stats, setStats] = useState<Stats>({
    totalStreams: 0,
    totalViews: 0,
    totalHours: 0,
    activeStreams: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setStreams([
        {
          id: '1',
          title: 'Live de Programação - Construindo uma API REST',
          status: 'live',
          viewers: 142,
          thumbnail: '/api/placeholder/320/180'
        },
        {
          id: '2',
          title: 'Tutorial React - Hooks Avançados',
          status: 'scheduled',
          viewers: 0,
          scheduledAt: '2024-01-15T20:00:00Z',
          thumbnail: '/api/placeholder/320/180'
        },
        {
          id: '3',
          title: 'Revisão de Código - Projeto Open Source',
          status: 'ended',
          viewers: 89,
          thumbnail: '/api/placeholder/320/180'
        }
      ])

      setStats({
        totalStreams: 12,
        totalViews: 2847,
        totalHours: 45.5,
        activeStreams: 1
      })

      setLoading(false)
    }, 1000)
  }, [])

  const getStatusBadge = (status: Stream['status']) => {
    const variants = {
      live: 'danger' as const,
      scheduled: 'warning' as const,
      ended: 'secondary' as const,
      draft: 'primary' as const
    }

    const labels = {
      live: 'AO VIVO',
      scheduled: 'AGENDADO',
      ended: 'FINALIZADO',
      draft: 'RASCUNHO'
    }

    return (
      <Badge variant={variants[status]} size="sm">
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
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">StreamPlatform</span>
              </Link>
              
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 font-medium">
                  Dashboard
                </Link>
                <Link href="/dashboard/streams" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Streams
                </Link>
                <Link href="/dashboard/videos" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Vídeos
                </Link>
                <Link href="/dashboard/analytics" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Analytics
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
              
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bem-vindo de volta!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie suas transmissões e acompanhe suas estatísticas.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardBody className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4">
                <Video className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total de Streams</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalStreams}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-4">
                <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total de Visualizações</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalViews.toLocaleString()}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-4">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Horas Transmitidas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalHours}h</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-4">
                <Radio className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Streams Ativas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeStreams}</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/studio/new">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardBody className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Iniciar Transmissão
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Comece uma nova live agora mesmo
                </p>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/schedule">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardBody className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Agendar Stream
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Programe uma transmissão futura
                </p>
              </CardBody>
            </Card>
          </Link>

          <Link href="/dashboard/videos/upload">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardBody className="text-center py-8">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Upload de Vídeo
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Envie um vídeo pré-gravado
                </p>
              </CardBody>
            </Card>
          </Link>
        </div>

        {/* Recent Streams */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Streams Recentes
              </h2>
              <Link href="/dashboard/streams">
                <Button variant="outline" size="sm">
                  Ver Todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          
          <CardBody>
            <div className="space-y-4">
              {streams.map((stream) => (
                <div key={stream.id} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div className="w-20 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg flex-shrink-0"></div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {stream.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(stream.status)}
                      {stream.status === 'live' && (
                        <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {stream.viewers} espectadores
                        </span>
                      )}
                      {stream.status === 'scheduled' && stream.scheduledAt && (
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {formatDate(stream.scheduledAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {stream.status === 'live' && (
                      <Link href={`/studio/${stream.id}`}>
                        <Button size="sm">
                          Gerenciar
                        </Button>
                      </Link>
                    )}
                    {stream.status === 'scheduled' && (
                      <Link href={`/dashboard/streams/${stream.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </Link>
                    )}
                    {stream.status === 'ended' && (
                      <Link href={`/watch/${stream.id}`}>
                        <Button variant="outline" size="sm">
                          Assistir
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </main>
    </div>
  )
}

