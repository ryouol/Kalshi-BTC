import { BTCPrice, WSMessage } from 'shared';

export interface CoinbaseTickerMessage {
  type: 'ticker';
  product_id: string;
  price: string;
  time: string;
  best_bid: string;
  best_ask: string;
  volume_24h: string;
}

export interface CoinbaseSubscribeMessage {
  type: 'subscribe';
  product_ids: string[];
  channels: string[];
}

export class CoinbaseWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
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
      this.ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      
      this.ws.onopen = () => {
        console.log('Coinbase WebSocket connected');
        this.onStatusChange('connected');
        
        // Subscribe to BTC-USD ticker
        const subscribeMessage: CoinbaseSubscribeMessage = {
          type: 'subscribe',
          product_ids: ['BTC-USD'],
          channels: ['ticker']
        };
        
        this.ws?.send(JSON.stringify(subscribeMessage));
        
        // Start heartbeat
        this.startHeartbeat();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ticker' && data.product_id === 'BTC-USD') {
            const message = data as CoinbaseTickerMessage;
            const price: BTCPrice = {
              price: parseFloat(message.price),
              timestamp: new Date(message.time).getTime(),
              source: 'coinbase'
            };
            
            this.onPriceUpdate(price);
          }
        } catch (error) {
          console.error('Error parsing Coinbase message:', error);
        }
      };
      
      this.ws.onerror = (event) => {
        console.error('Coinbase WebSocket error event');
        this.onStatusChange('error');
      };
      
      this.ws.onclose = () => {
        console.log('Coinbase WebSocket closed');
        this.onStatusChange('disconnected');
        this.stopHeartbeat();
        this.reconnect();
      };
    } catch (error) {
      console.error('Failed to create Coinbase WebSocket:', error);
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
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);
  }
  
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
