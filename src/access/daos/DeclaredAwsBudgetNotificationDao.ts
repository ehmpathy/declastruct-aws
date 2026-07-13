import { genDeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsBudgetNotification } from '@src/domain.objects/DeclaredAwsBudgetNotification';
import { delBudgetNotification } from '@src/domain.operations/budgetNotification/delBudgetNotification';
import { getOneBudgetNotification } from '@src/domain.operations/budgetNotification/getOneBudgetNotification';
import { setBudgetNotification } from '@src/domain.operations/budgetNotification/setBudgetNotification';

/**
 * .what = declastruct DAO for AWS Budget Notification resources
 * .why = wraps budget notification operations to conform to the declastruct interface
 * .note
 *   - identified by composite key (budget + basis + comparison + threshold),
 *     no primary key — AWS assigns no artificial id
 *   - findsert = create if absent, return extant (idempotent)
 *   - upsert = ensure the notification exists AND reconcile its subscriber set
 *   - delete = remove the notification (also removes its subscribers)
 *   - the budget must exist before a notification for it can be created
 */
export const DeclaredAwsBudgetNotificationDao = genDeclastructDao<
  typeof DeclaredAwsBudgetNotification,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsBudgetNotification,
  get: {
    one: {
      byPrimary: null, // composite key, no primary
      byUnique: async (input, context) => {
        return getOneBudgetNotification({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setBudgetNotification({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setBudgetNotification({ upsert: input }, context);
    },
    delete: async (input, context) => {
      // narrow the declastruct Ref to a unique ref via a guard (no primary exists,
      // so a well-formed ref is always unique); failfast if it is not
      if (!isRefByUnique({ of: DeclaredAwsBudgetNotification })(input))
        UnexpectedCodePathError.throw(
          'budget notification has no primary; delete ref must be unique',
          { input },
        );
      await delBudgetNotification({ by: { unique: input } }, context);
    },
  },
});
