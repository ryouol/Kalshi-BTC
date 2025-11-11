import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { KalshiMarket, KalshiOrderBook } from 'shared';

interface MarketWithOrderbook extends KalshiMarket {
  orderbook?: KalshiOrderBook;
}

interface KalshiMarketsResponse {
  markets: MarketWithOrderbook[];
  count: number;
  timestamp: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch markets');
  }
  const data = await response.json();
  console.log('useKalshiMarkets - fetched data:', data);
  console.log('First market:', data.markets?.[0]);
  return data;
};

export function useKalshiMarkets(currentHourOnly = true) {
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  
  // Fetch markets (ignore currentHourOnly param, get all BTC markets)
  const { data, error, isLoading, mutate } = useSWR<KalshiMarketsResponse>(
    `/api/kalshi/markets`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );
  
  // Auto-select first market when data loads
  useEffect(() => {
    if (data?.markets?.length && !selectedMarket) {
      setSelectedMarket(data.markets[0].ticker);
    }
  }, [data, selectedMarket]);
  
  const markets = data?.markets || [];
  const activeMarket = markets.find(m => m.ticker === selectedMarket) || null;
  
  return {
    markets,
    activeMarket,
    selectedMarket,
    setSelectedMarket,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Hook for fetching individual market with orderbook
export function useKalshiMarket(ticker: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    ticker ? `/api/kalshi/market/${ticker}` : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds for active market
      revalidateOnFocus: true,
    }
  );
  
  return {
    market: data?.market || null,
    orderbook: data?.orderbook || null,
    isLoading,
    error,
    refresh: mutate,
  };
}
