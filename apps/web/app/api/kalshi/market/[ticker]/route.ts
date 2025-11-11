import { NextRequest, NextResponse } from 'next/server';
import { KalshiClient } from '@/lib/kalshi/client';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const client = getKalshiClient();
    const { ticker } = await params;
    
    // Get market details
    const marketResponse = await client.getMarket(ticker);
    
    if (marketResponse.error) {
      return NextResponse.json(
        { error: marketResponse.error },
        { status: 500 }
      );
    }
    
    // Get order book
    const orderbookResponse = await client.getOrderBook(ticker);
    
    return NextResponse.json({
      market: marketResponse.data,
      orderbook: orderbookResponse.data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching Kalshi market:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market' },
      { status: 500 }
    );
  }
}
