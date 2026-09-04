import { createReceiptRule } from './createReceiptRule';
import { createReceiptRuleSet } from './createReceiptRuleSet';
import { delReceiptRule } from './delReceiptRule';
import { delReceiptRuleSet } from './delReceiptRuleSet';
import { getActiveReceiptRuleSet } from './getActiveReceiptRuleSet';
import { getReceiptRule } from './getReceiptRule';
import { getReceiptRuleSet } from './getReceiptRuleSet';
import { setActiveReceiptRuleSet } from './setActiveReceiptRuleSet';
import { updateReceiptRule } from './updateReceiptRule';

/**
 * .what = dao-style SDK wrapper for AWS SES v1
 * .why = provides raw i/o communicator operations for SES receipt rule sets + rules, which
 *   live ONLY in the v1 ses api (they are absent from SESv2)
 */
export const sdkSes = {
  getReceiptRuleSet,
  createReceiptRuleSet,
  getActiveReceiptRuleSet,
  setActiveReceiptRuleSet,
  delReceiptRuleSet,
  getReceiptRule,
  createReceiptRule,
  updateReceiptRule,
  delReceiptRule,
};
