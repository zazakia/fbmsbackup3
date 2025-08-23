import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../LoadingSpinner';

// Lazy load chart components to reduce initial bundle size
const LazyBarChart = lazy(() => 
  import('recharts').then(module => ({ default: module.BarChart }))
);

const LazyLineChart = lazy(() => 
  import('recharts').then(module => ({ default: module.LineChart }))
);

const LazyPieChart = lazy(() => 
  import('recharts').then(module => ({ default: module.PieChart }))
);

const LazyBar = lazy(() => 
  import('recharts').then(module => ({ default: module.Bar }))
);

const LazyLine = lazy(() => 
  import('recharts').then(module => ({ default: module.Line }))
);

const LazyPie = lazy(() => 
  import('recharts').then(module => ({ default: module.Pie }))
);

const LazyXAxis = lazy(() => 
  import('recharts').then(module => ({ default: module.XAxis }))
);

const LazyYAxis = lazy(() => 
  import('recharts').then(module => ({ default: module.YAxis }))
);

const LazyCartesianGrid = lazy(() => 
  import('recharts').then(module => ({ default: module.CartesianGrid }))
);

const LazyTooltip = lazy(() => 
  import('recharts').then(module => ({ default: module.Tooltip }))
);

const LazyLegend = lazy(() => 
  import('recharts').then(module => ({ default: module.Legend }))
);

const LazyResponsiveContainer = lazy(() => 
  import('recharts').then(module => ({ default: module.ResponsiveContainer }))
);

const LazyCell = lazy(() => 
  import('recharts').then(module => ({ default: module.Cell }))
);

// Chart loading fallback
const ChartFallback = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
    <LoadingSpinner />
  </div>
);

// Wrapper components with Suspense
export const BarChart = (props: any) => (
  <Suspense fallback={<ChartFallback />}>
    <LazyBarChart {...props} />
  </Suspense>
);

export const LineChart = (props: any) => (
  <Suspense fallback={<ChartFallback />}>
    <LazyLineChart {...props} />
  </Suspense>
);

export const PieChart = (props: any) => (
  <Suspense fallback={<ChartFallback />}>
    <LazyPieChart {...props} />
  </Suspense>
);

export const Bar = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyBar {...props} />
  </Suspense>
);

export const Line = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyLine {...props} />
  </Suspense>
);

export const Pie = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyPie {...props} />
  </Suspense>
);

export const XAxis = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyXAxis {...props} />
  </Suspense>
);

export const YAxis = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyYAxis {...props} />
  </Suspense>
);

export const CartesianGrid = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyCartesianGrid {...props} />
  </Suspense>
);

export const Tooltip = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyTooltip {...props} />
  </Suspense>
);

export const Legend = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyLegend {...props} />
  </Suspense>
);

export const ResponsiveContainer = (props: any) => (
  <Suspense fallback={<ChartFallback />}>
    <LazyResponsiveContainer {...props} />
  </Suspense>
);

export const Cell = (props: any) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyCell {...props} />
  </Suspense>
);

// Convenience export for all chart components
export * from 'recharts';
