import { createChildLogger } from '@terraform-aws-github-runner/aws-powertools-util';
import parser from 'cron-parser';
import { DateTime } from 'luxon';

export type ScalingDownConfigList = ScalingDownConfig[];
export type EvictionStrategy = 'newest_first' | 'oldest_first';
export interface ScalingDownConfig {
  cron: string;
  idleCount: number;
  timeZone: string;
  evictionStrategy?: EvictionStrategy;
}

const logger = createChildLogger('scale-down-config.ts');

function inPeriod(period: ScalingDownConfig): boolean {
  const now = DateTime.now();
  const expr = parser.parseExpression(period.cron, {
    tz: period.timeZone,
  });
  const next = DateTime.fromJSDate(expr.next().toDate());
  return Math.abs(next.diff(now, 'seconds').as("seconds")) < 5; // we keep a range of 5 seconds
}

export function getIdleRunnerCount(scalingDownConfigs: ScalingDownConfigList): number {
  for (const scalingDownConfig of scalingDownConfigs) {
    if (inPeriod(scalingDownConfig)) {
      return scalingDownConfig.idleCount;
    }
  }
  return 0;
}

export function getEvictionStrategy(scalingDownConfigs: ScalingDownConfigList): EvictionStrategy {
  for (const scalingDownConfig of scalingDownConfigs) {
    if (inPeriod(scalingDownConfig)) {
      const evictionStrategy = scalingDownConfig.evictionStrategy ?? 'oldest_first';
      logger.debug(`Using evictionStrategy '${evictionStrategy}' for period ${scalingDownConfig.cron}`);
      return evictionStrategy;
    }
  }
  return 'oldest_first';
}
