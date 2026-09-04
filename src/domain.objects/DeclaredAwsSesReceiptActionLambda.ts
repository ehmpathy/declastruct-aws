import { DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsSnsTopic } from './DeclaredAwsSnsTopic';

/**
 * .what = an SES receipt-rule lambda action — invokes a lambda function on the message
 * .why = the extension point for forward-to-address + Slack (a lambda reads the s3 message +
 *   SendRawEmail to forward, or posts a webhook) — not native SES actions
 *   (`AWS::SES::ReceiptRule` LambdaAction)
 */
export interface DeclaredAwsSesReceiptActionLambda {
  /**
   * .what = the arn of the lambda function to invoke
   */
  functionArn: string;

  /**
   * .what = an optional topic notified when the lambda is invoked (null = no notify)
   */
  topic: RefByUnique<typeof DeclaredAwsSnsTopic> | null;

  /**
   * .what = the invocation type (null = Event default; RequestResponse for a mail-flow decision)
   */
  invocationType: 'Event' | 'RequestResponse' | null;
}

export class DeclaredAwsSesReceiptActionLambda
  extends DomainLiteral<DeclaredAwsSesReceiptActionLambda>
  implements DeclaredAwsSesReceiptActionLambda
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    topic: RefByUnique<typeof DeclaredAwsSnsTopic>,
  };
}
