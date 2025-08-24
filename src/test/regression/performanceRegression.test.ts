/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';

// Minimal, self-contained regression check to ensure we have a dedicated "regression" test suite.
// This mirrors the logic used in automation/cicdIntegration.test.ts but keeps it focused and isolated
// so it can be run via `npm run test:regression` in CI or locally.

interface PerfBaseline {
  responseTime: number; // ms
  throughput: number;   // ops/sec
  memoryUsage: number;  // MB
}

// PerfCurrent has same shape as PerfBaseline; use a type alias to avoid empty interface lint error
type PerfCurrent = PerfBaseline;

function checkPerformanceRegression(baseline: PerfBaseline, current: PerfCurrent) {
  const regressions: string[] = [];

  if (current.responseTime > baseline.responseTime * 1.2) {
    regressions.push('Response time regression');
  }
  if (current.throughput < baseline.throughput * 0.8) {
    regressions.push('Throughput regression');
  }

  return {
    hasRegression: regressions.length > 0,
    regressions,
  };
}

describe('Regression | Performance Regression Detection', () => {
  it('flags regressions when metrics degrade beyond thresholds', async () => {
    const baseline: PerfBaseline = {
      responseTime: 200,
      throughput: 1000,
      memoryUsage: 50,
    };

    // Simulate degradations to assert detection remains wired up
    const current: PerfCurrent = {
      responseTime: 350, // > 20% slower
      throughput: 750,   // < 80% of baseline
      memoryUsage: 50,
    };

    const result = checkPerformanceRegression(baseline, current);

    expect(result.hasRegression).toBe(true);
    expect(result.regressions).toContain('Response time regression');
    expect(result.regressions).toContain('Throughput regression');
  });
});

