import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSesReceiptRule } from '@src/domain.objects/DeclaredAwsSesReceiptRule';
import { delSesReceiptRule } from '@src/domain.operations/sesReceiptRule/delSesReceiptRule';
import { getOneSesReceiptRule } from '@src/domain.operations/sesReceiptRule/getOneSesReceiptRule';
import { setSesReceiptRule } from '@src/domain.operations/sesReceiptRule/setSesReceiptRule';

/**
 * .what = declastruct DAO for AWS SES Receipt Rule resources
 * .why = wraps the receipt-rule operations to conform to the declastruct interface, so a rule
 *   is drivable through plan/apply like its peers
 * .note = a receipt rule has no primary key (no arn), only the unique key (ruleSet + name)
 */
export const DeclaredAwsSesReceiptRuleDao = genDeclastructDao<
  typeof DeclaredAwsSesReceiptRule,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSesReceiptRule,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneSesReceiptRule({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSesReceiptRule({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSesReceiptRule({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delSesReceiptRule({ by: { ref: input } }, context);
    },
  },
});
