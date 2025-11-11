import { BTCPrice, WSMessage } from 'shared';

export interface BinanceTradeMessage {
  e: string;  // Event type (trade)
  E: number;  // Event time
  s: string;  // Symbol
  p: string;  // Price
  q: string;  // Quantity
  T: number;  // Trade time
  m: boolean; // Is the buyer the market maker?
}

export interface BinanceStreamMessage {
  stream: string;
  data: BinanceTradeMessage;
}

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private onPriceUpdate: (price: BTCPrice) => void;
  private onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  
  constructor(
    onPriceUpdate: (price: BTCPrice) => void,
    onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void
  ) {
    this.onPriceUpdate = onPriceUpdate;
    this.onStatusChange = onStatusChange;
  }
  
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    this.onStatusChange('connecting');
    
    try {
      // Subscribe to BTCUSDT trades
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
      
      this.ws.onopen = () => {
        console.log('Binance WebSocket connected');
        this.onStatusChange('connected');
        
        // Start ping/pong heartbeat
        this.startHeartbeat();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Reset pong timeout on any message
          this.resetPongTimeout();
          
          if (data.e === 'trade' && data.s === 'BTCUSDT') {
            const message = data as BinanceTradeMessage;
            const price: BTCPrice = {
              price: parseFloat(message.p),
              timestamp: message.T,
              source: 'binance'
            };
            
            this.onPriceUpdate(price);
          }
        } catch (error) {
          console.error('Error parsing Binance message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Binance WebSocket error:', error);
        this.onStatusChange('error');
      };
      
      this.ws.onclose = () => {
        console.log('Binance WebSocket closed');
        this.onStatusChange('disconnected');
        this.stopHeartbeat();
        this.reconnect();
      };
    } catch (error) {
      console.error('Failed to create Binance WebSocket:', error);
      this.onStatusChange('error');
      this.reconnect();
    }
  }
  
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  private reconnect() {
    if (this.reconnectTimeout) {
      return;
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }
  
  private startHeartbeat() {
    // Binance expects a ping frame every 10 minutes
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping frame
        this.ws.send(JSON.stringify({ ping: Date.now() }));
        
        // Expect pong within 10 seconds
        this.pongTimeout = setTimeout(() => {
          console.warn('Binance pong timeout, reconnecting...');
          this.ws?.close();
        }, 10000);
      }
    }, 540000); // 9 minutes
  }
  
  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }
  
  private resetPongTimeout() {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }
}
