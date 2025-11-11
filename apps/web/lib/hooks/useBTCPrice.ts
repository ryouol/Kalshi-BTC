import { useState, useEffect, useCallback } from 'react';
import { BTCPrice } from 'shared';
import { CoinbaseWebSocket } from '../websocket/coinbase';
import { BinanceWebSocket } from '../websocket/binance';

export interface BTCPriceState {
  price: number | null;
  previousPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  source: 'coinbase' | 'binance';
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: number | null;
}

export function useBTCPrice(source: 'coinbase' | 'binance' = 'coinbase') {
  const [state, setState] = useState<BTCPriceState>({
    price: null,
    previousPrice: null,
    priceChange: null,
    priceChangePercent: null,
    source,
    status: 'disconnected',
    lastUpdate: null,
  });
  
  const handlePriceUpdate = useCallback((priceData: BTCPrice) => {
    setState(prev => {
      const priceChange = prev.price ? priceData.price - prev.price : null;
      const priceChangePercent = prev.price 
        ? ((priceData.price - prev.price) / prev.price) * 100 
        : null;
      
      return {
        ...prev,
        price: priceData.price,
        previousPrice: prev.price,
        priceChange,
        priceChangePercent,
        lastUpdate: priceData.timestamp,
      };
    });
  }, []);
  
  const handleStatusChange = useCallback((status: BTCPriceState['status']) => {
    setState(prev => ({ ...prev, status }));
  }, []);
  
  useEffect(() => {
    let ws: CoinbaseWebSocket | BinanceWebSocket;
    
    if (source === 'coinbase') {
      ws = new CoinbaseWebSocket(handlePriceUpdate, handleStatusChange);
    } else {
      ws = new BinanceWebSocket(handlePriceUpdate, handleStatusChange);
    }
    
    ws.connect();
    
    return () => {
      ws.disconnect();
    };
  }, [source, handlePriceUpdate, handleStatusChange]);
  
  return state;
}

// Hook for managing price history
export function useBTCPriceHistory(maxLength = 60) {
  const [history, setHistory] = useState<BTCPrice[]>([]);
  
  const addPrice = useCallback((price: BTCPrice) => {
    setHistory(prev => {
      const newHistory = [...prev, price];
      if (newHistory.length > maxLength) {
        return newHistory.slice(-maxLength);
      }
      return newHistory;
    });
  }, [maxLength]);
  
  const getReturns = useCallback(() => {
    if (history.length < 2) return [];
    
    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const logReturn = Math.log(history[i].price / history[i - 1].price);
      returns.push(logReturn);
    }
    
    return returns;
  }, [history]);
  
  const getCandles = useCallback((intervalMinutes = 1) => {
    if (history.length === 0) return [];
    
    const candles: Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }> = [];
    
    const intervalMs = intervalMinutes * 60 * 1000;
    let currentCandle = null;
    
    for (const price of history) {
      const candleTime = Math.floor(price.timestamp / intervalMs) * intervalMs;
      
      if (!currentCandle || currentCandle.time !== candleTime) {
        if (currentCandle) {
          candles.push(currentCandle);
        }
        
        currentCandle = {
          time: candleTime,
          open: price.price,
          high: price.price,
          low: price.price,
          close: price.price,
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, price.price);
        currentCandle.low = Math.min(currentCandle.low, price.price);
        currentCandle.close = price.price;
      }
    }
    
    if (currentCandle) {
      candles.push(currentCandle);
    }
    
    return candles;
  }, [history]);
  
  return {
    history,
    addPrice,
    getReturns,
    getCandles,
  };
}
