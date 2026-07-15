import type {
  AnomalyMonitor,
  ResourceTag,
} from '@aws-sdk/client-cost-explorer';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = maps an AWS AnomalyMonitor (+ its tags) into a DeclaredAwsCostAnomalyMonitor
 * .why = the AWS shape (MonitorArn, MonitorName, MonitorType, MonitorDimension)
 *        differs from our declared shape; this cast is the single decode point
 * .note = GetAnomalyMonitors returns no tags, so tags arrive separately via a
 *         ListTagsForResource call keyed by the monitor arn
 */
export const castIntoDeclaredAwsCostAnomalyMonitor = (input: {
  monitor: AnomalyMonitor;
  tags: ResourceTag[] | undefined;
}): HasReadonly<typeof DeclaredAwsCostAnomalyMonitor> => {
  const { monitor, tags } = input;

  // tags map, or null when absent
  const tagsMap = (() => {
    if (!tags || tags.length === 0) return null;
    const obj: Record<string, string> = {};
    for (const tag of tags) if (tag.Key) obj[tag.Key] = tag.Value ?? '';
    return new DeclaredAwsTags(obj);
  })();

  // the monitor type — we model DIMENSIONAL and CUSTOM
  const type = monitor.MonitorType;
  if (type !== 'DIMENSIONAL' && type !== 'CUSTOM')
    UnexpectedCodePathError.throw('monitor has an unsupported MonitorType', {
      monitor,
    });

  // the cost dimension — SERVICE for DIMENSIONAL, null for CUSTOM
  const dimension = (() => {
    if (!monitor.MonitorDimension) return null;
    if (monitor.MonitorDimension !== 'SERVICE')
      UnexpectedCodePathError.throw(
        'monitor has an unsupported MonitorDimension (only SERVICE is modeled)',
        { monitor },
      );
    return monitor.MonitorDimension;
  })();

  return assure(
    new DeclaredAwsCostAnomalyMonitor({
      arn:
        monitor.MonitorArn ??
        UnexpectedCodePathError.throw('monitor lacks a MonitorArn', {
          monitor,
        }),
      name:
        monitor.MonitorName ??
        UnexpectedCodePathError.throw('monitor lacks a MonitorName', {
          monitor,
        }),
      kind: type,
      dimension,
      tags: tagsMap,
    }),
    hasReadonly({ of: DeclaredAwsCostAnomalyMonitor }),
  );
};
