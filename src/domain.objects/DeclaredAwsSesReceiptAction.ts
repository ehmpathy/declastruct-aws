import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsSesReceiptActionAddHeader } from './DeclaredAwsSesReceiptActionAddHeader';
import { DeclaredAwsSesReceiptActionBounce } from './DeclaredAwsSesReceiptActionBounce';
import { DeclaredAwsSesReceiptActionConnect } from './DeclaredAwsSesReceiptActionConnect';
import { DeclaredAwsSesReceiptActionLambda } from './DeclaredAwsSesReceiptActionLambda';
import { DeclaredAwsSesReceiptActionS3 } from './DeclaredAwsSesReceiptActionS3';
import { DeclaredAwsSesReceiptActionSns } from './DeclaredAwsSesReceiptActionSns';
import { DeclaredAwsSesReceiptActionStop } from './DeclaredAwsSesReceiptActionStop';
import { DeclaredAwsSesReceiptActionWorkmail } from './DeclaredAwsSesReceiptActionWorkmail';

/**
 * .what = one action in a receipt rule's ordered action list — the full native SES union
 * .why = SES models a receipt action as exactly ONE of 8 kinds (s3 | sns | lambda | bounce |
 *   stop | addHeader | workmail | connect); the whole union is modeled for a faithful AWS
 *   mirror. forward-to-address + Slack are NOT native — both ride on a `lambda` action.
 *
 * .note = exactly ONE of the 8 option fields is non-null (the action kind); a value object
 *   with eight nullable options, disambiguated by which is set
 */
export interface DeclaredAwsSesReceiptAction {
  /**
   * .what = save the message to s3 (null unless this is an s3 action)
   */
  s3: DeclaredAwsSesReceiptActionS3 | null;

  /**
   * .what = publish the message to sns (null unless this is an sns action)
   */
  sns: DeclaredAwsSesReceiptActionSns | null;

  /**
   * .what = invoke a lambda (null unless this is a lambda action)
   */
  lambda: DeclaredAwsSesReceiptActionLambda | null;

  /**
   * .what = bounce the message (null unless this is a bounce action)
   */
  bounce: DeclaredAwsSesReceiptActionBounce | null;

  /**
   * .what = stop rule-set evaluation (null unless this is a stop action)
   */
  stop: DeclaredAwsSesReceiptActionStop | null;

  /**
   * .what = add a header (null unless this is an add-header action)
   */
  addHeader: DeclaredAwsSesReceiptActionAddHeader | null;

  /**
   * .what = hand off to WorkMail (null unless this is a workmail action)
   */
  workmail: DeclaredAwsSesReceiptActionWorkmail | null;

  /**
   * .what = start an Amazon Connect email contact (null unless this is a connect action)
   */
  connect: DeclaredAwsSesReceiptActionConnect | null;
}

export class DeclaredAwsSesReceiptAction
  extends DomainLiteral<DeclaredAwsSesReceiptAction>
  implements DeclaredAwsSesReceiptAction
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    s3: DeclaredAwsSesReceiptActionS3,
    sns: DeclaredAwsSesReceiptActionSns,
    lambda: DeclaredAwsSesReceiptActionLambda,
    bounce: DeclaredAwsSesReceiptActionBounce,
    stop: DeclaredAwsSesReceiptActionStop,
    addHeader: DeclaredAwsSesReceiptActionAddHeader,
    workmail: DeclaredAwsSesReceiptActionWorkmail,
    connect: DeclaredAwsSesReceiptActionConnect,
  };
}
