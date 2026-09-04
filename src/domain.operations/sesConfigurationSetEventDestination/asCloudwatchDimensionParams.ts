import type { DeclaredAwsSesCloudwatchDimension } from '@src/domain.objects/DeclaredAwsSesCloudwatchDimension';

/**
 * .what = casts the declared cloudwatch dimensions into the event-destination param shape
 * .why = strips each domain dimension down to the plain `{ name, source, defaultValue }` the
 *   sesv2 communicator wants, so the setSesConfigurationSetEventDestination orchestrator reads
 *   as one named operation instead of an inline map (rule.forbid.inline-decode-friction)
 */
export const asCloudwatchDimensionParams = (input: {
  dimensions: DeclaredAwsSesCloudwatchDimension[];
}): { name: string; source: string; defaultValue: string }[] =>
  input.dimensions.map((dimension) => ({
    name: dimension.name,
    source: dimension.source,
    defaultValue: dimension.defaultValue,
  }));
