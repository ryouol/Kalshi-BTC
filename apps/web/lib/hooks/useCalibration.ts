import useSWR from 'swr';
import { CalibrationData, CALIBRATION_INTERVAL } from 'shared';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch calibration');
  }
  return response.json();
};

export function useCalibration() {
  const { data, error, isLoading, mutate } = useSWR<CalibrationData>(
    '/api/calibrate',
    fetcher,
    {
      refreshInterval: CALIBRATION_INTERVAL,
      revalidateOnFocus: false, // Don't refetch on focus, calibration is expensive
    }
  );
  
  return {
    calibration: data || null,
    isLoading,
    error,
    refresh: mutate,
  };
}
