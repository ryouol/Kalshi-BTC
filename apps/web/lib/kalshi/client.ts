import { KalshiMarket, KalshiOrderBook, ApiResponse } from 'shared';

export interface KalshiConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

export interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  status: 'open' | 'closed' | 'settled';
  markets?: KalshiMarket[];
}

export interface KalshiMarketResponse {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  open_time: string;
  close_time: string;
  expiration_time: string;
  status: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  volume?: number;
  floor_strike?: number;
  cap_strike?: number;
  strike_type?: string;
}

export interface KalshiLoginResponse {
  token: string;
  member_id: string;
}

export class KalshiClient {
  private config: KalshiConfig;
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  
  constructor(config: KalshiConfig) {
    this.config = config;
  }
  
  private async authenticate(): Promise<void> {
    // For API Key authentication, we don't need to authenticate
    // Just use the key directly in headers
    if (this.config.apiKey.includes('-')) {
      // It's an API key (UUID format)
      this.token = this.config.apiKey;
      return;
    }
    
    // Check if we have a valid token for email/password auth
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return;
    }
    
    // Email/password authentication
    const response = await fetch(`${this.config.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.config.apiKey,
        password: this.config.apiSecret,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Kalshi authentication failed: ${response.statusText}`);
    }
    
    const data: KalshiLoginResponse = await response.json();
    this.token = data.token;
    this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  }
  
  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, any>,
    body?: any
  ): Promise<T> {
    await this.authenticate();
    
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Check if using API Key authentication
    const isApiKey = this.config.apiKey.includes('-');
    
    if (isApiKey) {
      // API Key authentication - just add the key header
      headers['KALSHI-ACCESS-KEY'] = this.config.apiKey;
    } else {
      // Bearer token authentication
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kalshi API error: ${response.status} ${error}`);
    }
    
    return response.json();
  }
  
  async getEvents(params?: {
    status?: 'open' | 'closed' | 'settled';
    category?: string;
    series_ticker?: string;
    with_nested_markets?: boolean;
  }): Promise<ApiResponse<KalshiEvent[]>> {
    try {
      const data = await this.request<{ events: KalshiEvent[] }>(
        'GET',
        '/events',
        params
      );
      
      return {
        data: data.events,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }
  
  async getMarkets(params?: {
    status?: 'open' | 'closed' | 'settled';
    event_ticker?: string;
    series_ticker?: string;
    min_close_ts?: number;
    max_close_ts?: number;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<KalshiMarket[]>> {
    try {
      const data = await this.request<{ markets: KalshiMarketResponse[] }>(
        'GET',
        '/markets',
        params
      );
      
      // Transform the response to our internal format
      const markets: KalshiMarket[] = data.markets.map(m => ({
        ticker: m.ticker,
        event_ticker: m.event_ticker,
        title: m.title,
        subtitle: m.subtitle,
        open_time: m.open_time,
        close_time: m.close_time,
        expiration_time: m.expiration_time,
        status: m.status as 'open' | 'closed' | 'settled',
        yes_bid: m.yes_bid,
        yes_ask: m.yes_ask,
        no_bid: m.no_bid,
        no_ask: m.no_ask,
        volume: m.volume,
        floor_strike: m.floor_strike,
        cap_strike: m.cap_strike,
        strike_type: m.strike_type,
      }));
      
      return {
        data: markets,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }
  
  async getMarket(ticker: string): Promise<ApiResponse<KalshiMarket>> {
    try {
      const data = await this.request<{ market: KalshiMarketResponse }>(
        'GET',
        `/markets/${ticker}`
      );
      
      const market: KalshiMarket = {
        ticker: data.market.ticker,
        event_ticker: data.market.event_ticker,
        title: data.market.title,
        subtitle: data.market.subtitle,
        open_time: data.market.open_time,
        close_time: data.market.close_time,
        expiration_time: data.market.expiration_time,
        status: data.market.status as 'open' | 'closed' | 'settled',
        yes_bid: data.market.yes_bid,
        yes_ask: data.market.yes_ask,
        no_bid: data.market.no_bid,
        no_ask: data.market.no_ask,
        volume: data.market.volume,
        floor_strike: data.market.floor_strike,
        cap_strike: data.market.cap_strike,
        strike_type: data.market.strike_type,
      };
      
      return {
        data: market,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }
  
  async getOrderBook(ticker: string): Promise<ApiResponse<KalshiOrderBook>> {
    try {
      const data = await this.request<{
        market_ticker: string;
        yes: Array<[number, number]>; // [price, size]
        no: Array<[number, number]>;
      }>(
        'GET',
        `/markets/${ticker}/orderbook`
      );
      
      const orderbook: KalshiOrderBook = {
        ticker: data.market_ticker,
        yes: {
          bids: data.yes
            .filter(([price]) => price < 50) // Bids are below mid
            .map(([price, size]) => ({ price, size }))
            .sort((a, b) => b.price - a.price), // Best bid first
          asks: data.yes
            .filter(([price]) => price >= 50) // Asks are above mid
            .map(([price, size]) => ({ price, size }))
            .sort((a, b) => a.price - b.price), // Best ask first
        },
        no: {
          bids: data.no
            .filter(([price]) => price < 50)
            .map(([price, size]) => ({ price, size }))
            .sort((a, b) => b.price - a.price),
          asks: data.no
            .filter(([price]) => price >= 50)
            .map(([price, size]) => ({ price, size }))
            .sort((a, b) => a.price - b.price),
        },
        timestamp: Date.now(),
      };
      
      return {
        data: orderbook,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }
  
  async getExchangeStatus(): Promise<ApiResponse<{
    trading_active: boolean;
    exchange_active: boolean;
  }>> {
    try {
      const data = await this.request<{
        trading_active: boolean;
        exchange_active: boolean;
      }>('GET', '/exchange/status');
      
      return {
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }
}
