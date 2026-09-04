import { BadRequestError } from 'helpful-errors';

import { isSesInboundRegion, SES_INBOUND_REGIONS } from './isSesInboundRegion';

/**
 * .what = fails loud with a caller-actionable BadRequestError when a region cannot receive
 *   SES inbound mail; a no-op when the region is receive-capable
 * .why = the user-faced region friction guard, extracted pure so its message is decided one
 *   way in one place and can be unit-tested + snapped (rule.forbid.friction-hazards) without
 *   a live SES call. setSesReceiptRuleSet calls this early so a wrong-region apply names the
 *   supported regions instead of a cryptic SES error deep in receipt-rule create
 */
export const assertSesInboundRegion = (input: { region: string }): void => {
  if (isSesInboundRegion({ region: input.region })) return;
  BadRequestError.throw(
    `region "${input.region}" does not support SES inbound email receipt, so a receipt rule set cannot be created there. pick a receive-capable region: ${SES_INBOUND_REGIONS.join(', ')}`,
    { region: input.region, supported: SES_INBOUND_REGIONS },
  );
};
