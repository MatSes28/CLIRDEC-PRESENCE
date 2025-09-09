import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: 'system' | 'alert' | 'attendance' | 'notification';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { toast } = useToast();

  const connectWebSocket = () => {
    // Determine WebSocket URL with proper port handling
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port;
    
    // Build WebSocket URL based on environment
    let wsUrl: string;
    
    // Handle Replit environment
    if (host.includes('replit.dev') || host.includes('replit.app')) {
      // Replit uses the same host and port, but with WebSocket protocol
      wsUrl = `${protocol}//${host}/ws`;
    }
    // Handle development environment
    else if (host === 'localhost' || host.includes('127.0.0.1')) {
      wsUrl = `${protocol}//${host}:5000/ws`;
    }
    // Handle production with explicit port
    else if (port && port !== '80' && port !== '443') {
      wsUrl = `${protocol}//${host}:${port}/ws`;
    }
    // Handle production with default ports
    else {
      const defaultPort = protocol === 'wss:' ? '443' : '80';
      wsUrl = `${protocol}//${host}:${defaultPort}/ws`;
    }

    console.log('Connecting to WebSocket:', wsUrl);

    // Create WebSocket connection with error handling
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      return null;
    }

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setSocket(ws);
      setReconnectAttempts(0);
    };

    ws.onmessage = (event) => {
      try {
        console.log('📨 Raw WebSocket message received:', event.data);
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 Parsed WebSocket message:', message);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        console.error('❌ Raw message data:', event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
      setIsConnected(false);
      setSocket(null);
      
      // Attempt to reconnect after 3 seconds if not on auth page and not too many attempts
      if (window.location.pathname !== '/' && reconnectAttempts < 10) {
        setTimeout(() => {
          console.log(`Attempting to reconnect WebSocket... (attempt ${reconnectAttempts + 1}/10)`);
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, 3000 + (reconnectAttempts * 1000)); // Exponential backoff
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return ws;
  };

  useEffect(() => {
    const ws = connectWebSocket();
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'system':
        if (message.title !== 'Connected') { // Don't show connection toast
          toast({
            title: message.title,
            description: message.message,
            duration: 3000
          });
        }
        break;
      
      case 'alert':
        toast({
          title: message.title,
          description: message.message,
          variant: 'destructive',
          duration: 5000
        });
        break;
      
      case 'attendance':
        toast({
          title: message.title,
          description: message.message,
          duration: 4000
        });
        break;
      
      case 'notification':
        toast({
          title: message.title,
          description: message.message,
          duration: 3000
        });
        break;
      
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}