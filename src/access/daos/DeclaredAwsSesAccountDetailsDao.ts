import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSesAccountDetails } from '@src/domain.objects/DeclaredAwsSesAccountDetails';
import { getOneSesAccountDetails } from '@src/domain.operations/sesAccountDetails/getOneSesAccountDetails';
import { setSesAccountDetails } from '@src/domain.operations/sesAccountDetails/setSesAccountDetails';

/**
 * .what = declastruct DAO for the SES account production-access posture (the sandbox exit)
 * .why = get reads GetAccount (a request in flight or granted = KEEP; a bare sandbox =
 *   CREATE), and set.findsert submits the PutAccountDetails review request, so the sandbox
 *   exit is drivable through plan/apply like its peers
 * .note = no byPrimary (an account-scoped singleton, keyed by region, not id-addressable);
 *   delete is null — AWS exposes no api to REQUEST a return to the sandbox
 */
export const DeclaredAwsSesAccountDetailsDao = genDeclastructDao<
  typeof DeclaredAwsSesAccountDetails,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSesAccountDetails,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneSesAccountDetails({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSesAccountDetails({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSesAccountDetails({ upsert: input }, context);
    },
    delete: null,
  },
});
