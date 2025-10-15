import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: 'connected' | 'system' | 'alert' | 'attendance' | 'notification';
  title?: string;
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
      // Replit uses the same host, but with WebSocket protocol
      wsUrl = `${protocol}//${host}/ws`;
    }
    // Handle Railway and other production environments
    else if (host.includes('railway.app') || host.includes('up.railway.app')) {
      // Railway uses standard ports (no explicit port in URL)
      wsUrl = `${protocol}//${host}/ws`;
    }
    // Handle development environment
    else if (host === 'localhost' || host.includes('127.0.0.1')) {
      wsUrl = `${protocol}//${host}:5000/ws`;
    }
    // Handle production with explicit port (non-standard ports)
    else if (port && port !== '80' && port !== '443') {
      wsUrl = `${protocol}//${host}:${port}/ws`;
    }
    // Handle production with standard ports (80/443) - DO NOT include port in URL
    else {
      wsUrl = `${protocol}//${host}/ws`;
    }

    if (import.meta.env.DEV) {
      console.log('Connecting to WebSocket:', wsUrl);
    }

    // Create WebSocket connection with error handling
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      return null;
    }

    ws.onopen = () => {
      if (import.meta.env.DEV) {
        console.log('WebSocket connected');
      }
      setIsConnected(true);
      setSocket(ws);
      setReconnectAttempts(0);
      
      // Send hello message with small delay to ensure connection is fully established
      // This prevents race conditions and code 1006 errors
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: 'hello',
            timestamp: new Date().toISOString()
          }));
        }
      }, 100); // 100ms delay to ensure connection is stable
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (import.meta.env.DEV) {
          console.log('📨 WebSocket message:', message);
        }
        handleWebSocketMessage(message);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('❌ Raw message data:', event.data);
        }
      }
    };

    ws.onclose = (event) => {
      if (import.meta.env.DEV) {
        console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
      }
      setIsConnected(false);
      setSocket(null);
      
      // Code 1006 is abnormal closure - often happens on Replit, try reconnecting
      // Only attempt reconnect if not on login page and haven't exceeded attempts
      if (window.location.pathname !== '/' && reconnectAttempts < 5) {
        const delay = 5000 + (reconnectAttempts * 3000); // 5s, 8s, 11s, 14s, 17s
        setTimeout(() => {
          if (import.meta.env.DEV) {
            console.log(`🔄 Attempting to reconnect WebSocket... (attempt ${reconnectAttempts + 1}/5)`);
          }
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, delay);
      } else if (reconnectAttempts >= 5 && import.meta.env.DEV) {
        console.log('🔌 WebSocket reconnection limit reached. Connection will retry on page refresh.');
      }
    };

    ws.onerror = (error) => {
      if (import.meta.env.DEV) {
        console.error('WebSocket error:', error);
      }
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
      case 'connected':
        // Silent connection confirmation - don't show toast
        if (import.meta.env.DEV) {
          console.log('WebSocket connection confirmed by server');
        }
        break;
        
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
        if (import.meta.env.DEV) {
          console.log('Unknown WebSocket message type:', message.type);
        }
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