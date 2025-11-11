import { NextRequest, NextResponse } from 'next/server';
import { KalshiClient } from '@/lib/kalshi/client';
import { isCurrentHourMarket, parseKalshiMarket } from 'shared';

// Create singleton client
let kalshiClient: KalshiClient | null = null;

function getKalshiClient() {
  if (!kalshiClient) {
    const apiKey = process.env.KALSHI_API_KEY;
    const apiSecret = process.env.KALSHI_API_SECRET;
    const baseUrl = process.env.KALSHI_BASE_URL || 'https://api.elections.kalshi.com/trade-api/v2';
    
    if (!apiKey || !apiSecret) {
      throw new Error('Kalshi API credentials not configured');
    }
    
    kalshiClient = new KalshiClient({
      apiKey,
      apiSecret,
      baseUrl,
    });
  }
  
  return kalshiClient;
}

export async function GET(request: NextRequest) {
  try {
    const client = getKalshiClient();
    
    // Fetch Bitcoin markets from specific series
    // KXBTCD = Bitcoin price Above/below (hourly)
    // BTC = Bitcoin range (hourly)
    // KXBTC = Bitcoin range (general)
    const seriesTickers = ['KXBTCD', 'BTC', 'KXBTC'];
    let btcMarkets: any[] = [];
    
    for (const seriesTicker of seriesTickers) {
      const response = await client.getMarkets({
        series_ticker: seriesTicker,
        status: 'open',
        limit: 100,
      });
      
      if (response.data) {
        btcMarkets = btcMarkets.concat(response.data);
      }
    }
    
    // Parse market types and parameters
    btcMarkets = btcMarkets.map(market => {
      const parsed = parseKalshiMarket(market);
      return {
        ...market,
        strike_price: parsed.strike,
        range_low: parsed.rangeLow,
        range_high: parsed.rangeHigh,
      };
    });
    
    // Sort by closing time
    btcMarkets.sort((a, b) => 
      new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
    );
    
    return NextResponse.json({
      markets: btcMarkets,
      count: btcMarkets.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching Kalshi markets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
