import { useState, useEffect, useMemo } from 'react';
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

function selectFeaturedMarkets(markets: MarketWithOrderbook[]): MarketWithOrderbook[] {
  if (!markets.length) {
    return [];
  }
  
  const buildPair = (list: MarketWithOrderbook[]) => {
    const strikeMarket = list.find(m => m.strike_price !== undefined && m.strike_price !== null);
    const rangeMarket = list.find(m => 
      m.range_low !== undefined && 
      m.range_high !== undefined && 
      m.ticker !== strikeMarket?.ticker
    );
    
    return [strikeMarket, rangeMarket].filter(Boolean) as MarketWithOrderbook[];
  };
  
  const earliestClose = new Date(markets[0].close_time).getTime();
  const windowMs = 2 * 60 * 60 * 1000; // 2-hour window to keep paired markets together
  
  const sameWindow = markets.filter(market => {
    const closeMs = new Date(market.close_time).getTime();
    return Math.abs(closeMs - earliestClose) <= windowMs;
  });
  
  const windowPair = buildPair(sameWindow);
  if (windowPair.length === 2) {
    return windowPair;
  }
  
  const fallbackPair = buildPair(markets);
  const combined = [...windowPair];
  
  for (const market of fallbackPair) {
    if (!combined.find(m => m.ticker === market.ticker)) {
      combined.push(market);
    }
    if (combined.length === 2) {
      break;
    }
  }
  
  return combined;
}

export function useKalshiMarkets(currentHourOnly = true) {
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  // Fetch markets
  const { data, error, isLoading, mutate } = useSWR<KalshiMarketsResponse>(
    `/api/kalshi/markets`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );
  
  const sortedMarkets = useMemo(() => {
    if (!data?.markets) {
      return [];
    }
    
    return [...data.markets].sort(
      (a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
    );
  }, [data]);

  const markets = useMemo(() => {
    if (!currentHourOnly) {
      return sortedMarkets;
    }
    
    const featured = selectFeaturedMarkets(sortedMarkets);
    return featured.length ? featured : sortedMarkets;
  }, [sortedMarkets, currentHourOnly]);
  
  // Auto-select first market when data loads
  useEffect(() => {
    if (markets.length && !selectedMarket) {
      setSelectedMarket(markets[0].ticker);
    }
    
    if (!markets.length && selectedMarket) {
      setSelectedMarket(null);
    }
  }, [markets, selectedMarket]);
  
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
