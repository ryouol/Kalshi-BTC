'use client';

import { SimulationDistribution } from 'shared';

interface SimulationChartsProps {
  distribution: SimulationDistribution;
}

const HISTOGRAM_HEIGHT = 100;
const BAR_WIDTH = 6;
const BAR_GAP = 2;
const PATH_CHART_HEIGHT = 140;
const PATH_CHART_WIDTH = 260;

export function SimulationCharts({ distribution }: SimulationChartsProps) {
  const histogramWidth =
    distribution.histogram.length * (BAR_WIDTH + BAR_GAP) + BAR_GAP;
  const maxProbability = Math.max(
    ...distribution.histogram.map((bin) => bin.probability),
    0.0001
  );
  
  const samplePaths = distribution.samples.slice(0, 15);
  const maxTime = Math.max(
    ...samplePaths.flatMap((path) =>
      path.points.map((point) => point.t)
    ),
    1
  );
  
  const priceRange = distribution.max - distribution.min || 1;
  
  const toY = (price: number) =>
    PATH_CHART_HEIGHT - ((price - distribution.min) / priceRange) * PATH_CHART_HEIGHT;
  const toX = (t: number) => (t / maxTime) * PATH_CHART_WIDTH;
  
  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 text-sm text-neutral-400">
          <span>Terminal Price Distribution</span>
          <span>
            μ {distribution.mean.toLocaleString(undefined, { maximumFractionDigits: 0 })} • σ{' '}
            {distribution.stddev.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <svg
          className="w-full"
          viewBox={`0 0 ${histogramWidth} ${HISTOGRAM_HEIGHT}`}
          preserveAspectRatio="none"
        >
          {distribution.histogram.map((bin, index) => {
            const barHeight = (bin.probability / maxProbability) * HISTOGRAM_HEIGHT;
            const x = index * (BAR_WIDTH + BAR_GAP) + BAR_GAP;
            return (
              <rect
                key={`${bin.price}-${index}`}
                x={x}
                y={HISTOGRAM_HEIGHT - barHeight}
                width={BAR_WIDTH}
                height={barHeight}
                className="fill-primary-500/70"
              />
            );
          })}
        </svg>
        <div className="flex justify-between text-xs text-neutral-500 mt-2">
          <span>${Math.round(distribution.min).toLocaleString()}</span>
          <span>${Math.round(distribution.max).toLocaleString()}</span>
        </div>
      </div>
      
      {samplePaths.length > 0 && (
        <div className="bg-neutral-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 text-sm text-neutral-400">
            <span>Sample Monte Carlo Paths</span>
            <span>{samplePaths.length} paths</span>
          </div>
          <svg className="w-full" viewBox={`0 0 ${PATH_CHART_WIDTH} ${PATH_CHART_HEIGHT}`} preserveAspectRatio="none">
            {samplePaths.map((path) => {
              const d = path.points
                .map((point, idx) => {
                  const x = toX(point.t);
                  const y = toY(point.price);
                  return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
                })
                .join(' ');
              
              return (
                <path
                  key={path.id}
                  d={d}
                  className="stroke-primary-500/40 fill-none"
                  strokeWidth={0.8}
                />
              );
            })}
          </svg>
          <div className="flex justify-between text-xs text-neutral-500 mt-2">
            <span>Now</span>
            <span>Settlement</span>
          </div>
        </div>
      )}
    </div>
  );
}
