'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  Settings,
  Users,
  MessageSquare,
  Play,
  Square,
  Volume2,
  VolumeX,
  Maximize,
  Grid3X3,
  User,
  Plus
} from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Badge } from '@/components/ui'

interface Guest {
  id: string
  name: string
  status: 'joined' | 'invited' | 'left'
  hasVideo: boolean
  hasAudio: boolean
  isScreenSharing: boolean
}

interface ChatMessage {
  id: string
  username: string
  message: string
  timestamp: Date
  platform: 'youtube' | 'facebook' | 'twitch' | 'internal'
}

export default function StudioPage({ params }: { params: { id: string } }): JSX.Element {
  const [isLive, setIsLive] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [layout, setLayout] = useState<'single' | 'side-by-side' | 'grid'>('single')
  const [guests, setGuests] = useState<Guest[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simular dados iniciais
    setGuests([
      {
        id: '1',
        name: 'João Silva',
        status: 'joined',
        hasVideo: true,
        hasAudio: true,
        isScreenSharing: false
      },
      {
        id: '2',
        name: 'Maria Santos',
        status: 'joined',
        hasVideo: false,
        hasAudio: true,
        isScreenSharing: false
      }
    ])

    setChatMessages([
      {
        id: '1',
        username: 'viewer123',
        message: 'Olá! Ótima live!',
        timestamp: new Date(),
        platform: 'youtube'
      },
      {
        id: '2',
        username: 'dev_fan',
        message: 'Quando vai falar sobre React?',
        timestamp: new Date(),
        platform: 'twitch'
      }
    ])

    // Simular contador de visualizadores
    const interval = setInterval(() => {
      if (isLive) {
        setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isLive])

  const handleStartStop = () => {
    setIsLive(!isLive)
    if (!isLive) {
      setViewerCount(Math.floor(Math.random() * 50) + 10)
    } else {
      setViewerCount(0)
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        username: 'Você',
        message: newMessage,
        timestamp: new Date(),
        platform: 'internal'
      }
      setChatMessages(prev => [...prev, message])
      setNewMessage('')
      
      // Auto scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 100)
    }
  }

  const getPlatformColor = (platform: string) => {
    const colors = {
      youtube: 'text-red-500',
      facebook: 'text-blue-500',
      twitch: 'text-purple-500',
      internal: 'text-gray-500'
    }
    return colors[platform as keyof typeof colors] || 'text-gray-500'
  }

  const getLayoutIcon = () => {
    switch (layout) {
      case 'single': return <User className="w-4 h-4" />
      case 'side-by-side': return <Grid3X3 className="w-4 h-4" />
      case 'grid': return <Maximize className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">Estúdio - Live de Programação</h1>
            {isLive && (
              <Badge variant="danger" className="animate-pulse">
                AO VIVO
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isLive && (
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Users className="w-4 h-4" />
                <span>{viewerCount} espectadores</span>
              </div>
            )}
            
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 bg-black relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            
            {/* Overlay Controls */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  {/* Media Controls */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={micEnabled ? 'success' : 'danger'}
                      size="sm"
                      onClick={() => setMicEnabled(!micEnabled)}
                    >
                      {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      variant={cameraEnabled ? 'success' : 'danger'}
                      size="sm"
                      onClick={() => setCameraEnabled(!cameraEnabled)}
                    >
                      {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      variant={screenSharing ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setScreenSharing(!screenSharing)}
                    >
                      {screenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      variant={audioEnabled ? 'success' : 'danger'}
                      size="sm"
                      onClick={() => setAudioEnabled(!audioEnabled)}
                    >
                      {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Layout Controls */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={layout}
                      onChange={(e) => setLayout(e.target.value as any)}
                      className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
                    >
                      <option value="single">Tela Única</option>
                      <option value="side-by-side">Lado a Lado</option>
                      <option value="grid">Grade</option>
                    </select>
                    
                    {getLayoutIcon()}
                  </div>

                  {/* Stream Controls */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={isLive ? 'danger' : 'success'}
                      onClick={handleStartStop}
                    >
                      {isLive ? (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Parar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Guests Panel */}
          <div className="border-b border-gray-700">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Convidados ({guests.length})
                  </h3>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Convidar
                  </Button>
                </div>
              </CardHeader>
              
              <CardBody className="max-h-48 overflow-y-auto">
                <div className="space-y-3">
                  {guests.map((guest) => (
                    <div key={guest.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{guest.name}</p>
                          <div className="flex items-center space-x-1">
                            <Badge 
                              variant={guest.status === 'joined' ? 'success' : 'secondary'} 
                              size="sm"
                            >
                              {guest.status === 'joined' ? 'Conectado' : 'Convidado'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${guest.hasAudio ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className={`w-2 h-2 rounded-full ${guest.hasVideo ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Chat Panel */}
          <div className="flex-1 flex flex-col">
            <Card className="bg-gray-800 border-gray-700 h-full flex flex-col">
              <CardHeader className="border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Chat Unificado
                </h3>
              </CardHeader>
              
              <CardBody className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                >
                  {chatMessages.map((message) => (
                    <div key={message.id} className="text-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`font-medium ${getPlatformColor(message.platform)}`}>
                          {message.username}
                        </span>
                        <span className="text-xs text-gray-400">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-300">{message.message}</p>
                    </div>
                  ))}
                </div>
                
                {/* Message Input */}
                <div className="border-t border-gray-700 p-4">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button type="submit" size="sm">
                      Enviar
                    </Button>
                  </form>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

