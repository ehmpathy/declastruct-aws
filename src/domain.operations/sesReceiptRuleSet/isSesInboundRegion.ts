/**
 * .what = the aws regions where SES inbound email receipt is available
 * .why = SES receipt rules exist only in receive-capable regions; the mx target + s3 delivery
 *   must land in one of these. sourced from the aws "Regions and Amazon SES" docs (the 3
 *   original receive regions + the 2023 expansion)
 * .note = extend this list when aws adds a receive region (a maintenance touch, not a redesign)
 */
export const SES_INBOUND_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ca-central-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
] as const;

/**
 * .what = whether a region supports SES inbound email receipt
 * .why = lets the receive-path set ops fail loud EARLY on a wrong-region apply, with the
 *   supported regions named, instead of a cryptic SES error deep in a receipt-rule create
 *   (the vision's region edge case)
 */
export const isSesInboundRegion = (input: { region: string }): boolean =>
  (SES_INBOUND_REGIONS as readonly string[]).includes(input.region);
