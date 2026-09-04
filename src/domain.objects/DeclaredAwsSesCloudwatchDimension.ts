import { DomainLiteral } from 'domain-objects';
import { withAssure } from 'type-fns';

/**
 * .what = where SES reads a CloudWatch dimension value from
 * .why = a runtime const so the type AND the read-time guard derive from ONE source of truth
 */
export const SES_CLOUDWATCH_DIMENSION_SOURCES = [
  'MESSAGE_TAG',
  'EMAIL_HEADER',
  'LINK_TAG',
] as const;

export type SesCloudwatchDimensionSource =
  (typeof SES_CLOUDWATCH_DIMENSION_SOURCES)[number];

/**
 * .what = asserts a raw aws string is one of our modeled dimension sources
 * .why = a read-side cast of an aws value must fail loud on an UNMODELED source, not silently
 *   mistype it and skew a plan diff (rule.require.assure-via-type-checks, rule.forbid.as-cast)
 */
export const isSesCloudwatchDimensionSource = withAssure(
  (value: string): value is SesCloudwatchDimensionSource =>
    (SES_CLOUDWATCH_DIMENSION_SOURCES as readonly string[]).includes(value),
  { name: 'isSesCloudwatchDimensionSource' },
);

/**
 * .what = one CloudWatch dimension a sent-mail event is published under
 * .why = a CloudWatch event sink groups metrics by dimension; each dimension names where SES
 *   reads its value (a message tag, an email header, or a link tag) and a default
 */
export interface DeclaredAwsSesCloudwatchDimension {
  /**
   * .what = the CloudWatch dimension name
   */
  name: string;

  /**
   * .what = where SES reads the dimension value from
   */
  source: SesCloudwatchDimensionSource;

  /**
   * .what = the value published when the send does not supply the dimension
   */
  defaultValue: string;
}

export class DeclaredAwsSesCloudwatchDimension
  extends DomainLiteral<DeclaredAwsSesCloudwatchDimension>
  implements DeclaredAwsSesCloudwatchDimension {}
