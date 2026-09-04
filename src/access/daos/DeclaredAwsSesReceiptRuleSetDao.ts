import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSesReceiptRuleSet } from '@src/domain.objects/DeclaredAwsSesReceiptRuleSet';
import { delSesReceiptRuleSet } from '@src/domain.operations/sesReceiptRuleSet/delSesReceiptRuleSet';
import { getOneSesReceiptRuleSet } from '@src/domain.operations/sesReceiptRuleSet/getOneSesReceiptRuleSet';
import { setSesReceiptRuleSet } from '@src/domain.operations/sesReceiptRuleSet/setSesReceiptRuleSet';

/**
 * .what = declastruct DAO for AWS SES Receipt Rule Set resources
 * .why = wraps the receipt-rule-set operations to conform to the declastruct interface, so a
 *   rule set is drivable through plan/apply like its peers
 */
export const DeclaredAwsSesReceiptRuleSetDao = genDeclastructDao<
  typeof DeclaredAwsSesReceiptRuleSet,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSesReceiptRuleSet,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneSesReceiptRuleSet({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneSesReceiptRuleSet({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSesReceiptRuleSet({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSesReceiptRuleSet({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delSesReceiptRuleSet({ by: { ref: input } }, context);
    },
  },
});
