import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';
import { genLogMethods } from 'sdk-logs';

import { getDeclastructAwsProvider } from '../../../src/contract/sdks';
import { getResourcesOfOidc } from './resources.oidc';
import {
  getOneCampReachIdentityFromEnv,
  getResourcesOfReach,
} from './resources.reach';

const log = genLogMethods();

/**
 * .what = demo account resources — oidc for github actions, plus collaborator reach targets
 * .why = enables github actions cicd access to demo account, and lets a named
 *        collaborator's own badge reach demo without a hand-carried credential
 *
 * @see readme.md for prereqs and apply instructions
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // ⚠️ the reach's caller identity is read HERE, at the composition root, and
  //   fails loud if absent. it is deliberately absent from source: this repo is
  //   PUBLIC and the collaborator's is PRIVATE, so a constant would publish
  //   another org's identity. `source .env` before an apply — see .env.example
  return [
    ...(await getResourcesOfOidc()),
    ...(await getResourcesOfReach(getOneCampReachIdentityFromEnv())),
  ];
};
