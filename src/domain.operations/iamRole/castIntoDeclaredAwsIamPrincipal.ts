import { DeclaredAwsIamPrincipal } from '@src/domain.objects/DeclaredAwsIamPrincipal';

import type { SdkAwsPolicyPrincipal } from './castFromDeclaredAwsIamPrincipal';

/**
 * .what = converts aws sdk principal format to domain format
 * .why = aws sdk uses uppercase keys (Service, AWS, Federated), we use lowercase
 */
export const castIntoDeclaredAwsIamPrincipal = (
  principal: SdkAwsPolicyPrincipal | undefined,
): '*' | DeclaredAwsIamPrincipal | undefined => {
  // passthrough for undefined or wildcard
  if (!principal) return undefined;
  if (principal === '*') return '*';

  // map uppercase sdk keys to lowercase domain keys and instantiate
  if ('Service' in principal && principal.Service)
    return DeclaredAwsIamPrincipal.as({ service: principal.Service });
  if ('AWS' in principal && principal.AWS)
    return DeclaredAwsIamPrincipal.as({ aws: principal.AWS });
  if ('Federated' in principal && principal.Federated)
    return DeclaredAwsIamPrincipal.as({ federated: principal.Federated });

  return undefined;
};
