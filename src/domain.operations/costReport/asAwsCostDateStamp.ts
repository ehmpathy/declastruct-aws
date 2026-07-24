/**
 * .what = maps an IsoTimeStamp to the AWS Cost Explorer date-stamp ('YYYY-MM-DD')
 * .why = the Cost Explorer TimePeriod takes calendar dates, not full timestamps;
 *        shared by the spend reads so the truncation lives in one place
 */
export const asAwsCostDateStamp = (input: { stamp: string }): string =>
  input.stamp.slice(0, 10);
