import { KalshiOrderBook, WSMessage } from 'shared';

export interface KalshiWSMessage {
  type: 'ticker' | 'orderbook_delta' | 'trade' | 'error' | 'subscribed';
  market_ticker?: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  yes_price?: number;
  no_price?: number;
  count?: number;
  seq?: number;
  msg?: string;
}

export class KalshiWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private subscribedTickers: Set<string> = new Set();
  private onOrderBookUpdate: (ticker: string, update: Partial<KalshiOrderBook>) => void;
  private onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  private authToken: string;
  
  constructor(
    authToken: string,
    onOrderBookUpdate: (ticker: string, update: Partial<KalshiOrderBook>) => void,
    onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void
  ) {
    this.authToken = authToken;
    this.onOrderBookUpdate = onOrderBookUpdate;
    this.onStatusChange = onStatusChange;
  }
  
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    this.onStatusChange('connecting');
    
    try {
      this.ws = new WebSocket('wss://api.elections.kalshi.com/trade-api/ws/v2');
      
      this.ws.onopen = () => {
        console.log('Kalshi WebSocket connected');
        this.onStatusChange('connected');
        
        // Authenticate
        this.send({
          type: 'auth',
          token: this.authToken,
        });
        
        // Resubscribe to previously subscribed tickers
        this.subscribedTickers.forEach(ticker => {
          this.subscribe(ticker);
        });
        
        // Start heartbeat
        this.startHeartbeat();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as KalshiWSMessage;
          
          if (data.type === 'error') {
            console.error('Kalshi WebSocket error:', data.msg);
            return;
          }
          
          if (data.type === 'ticker' && data.market_ticker) {
            // Update orderbook with ticker data
            this.onOrderBookUpdate(data.market_ticker, {
              ticker: data.market_ticker,
              timestamp: Date.now(),
              // Note: Kalshi ticker messages include best bid/ask
              yes: {
                bids: data.yes_bid ? [{ price: data.yes_bid, size: 0 }] : [],
                asks: data.yes_ask ? [{ price: data.yes_ask, size: 0 }] : [],
              },
              no: {
                bids: data.no_bid ? [{ price: data.no_bid, size: 0 }] : [],
                asks: data.no_ask ? [{ price: data.no_ask, size: 0 }] : [],
              },
            });
          }
        } catch (error) {
          console.error('Error parsing Kalshi message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Kalshi WebSocket error:', error);
        this.onStatusChange('error');
      };
      
      this.ws.onclose = () => {
        console.log('Kalshi WebSocket closed');
        this.onStatusChange('disconnected');
        this.stopHeartbeat();
        this.reconnect();
      };
    } catch (error) {
      console.error('Failed to create Kalshi WebSocket:', error);
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
  
  subscribe(ticker: string) {
    this.subscribedTickers.add(ticker);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        market_ticker: ticker,
        channels: ['ticker', 'orderbook_delta'],
      });
    }
  }
  
  unsubscribe(ticker: string) {
    this.subscribedTickers.delete(ticker);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe',
        market_ticker: ticker,
      });
    }
  }
  
  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
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
    // Kalshi expects a ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }
  
  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
