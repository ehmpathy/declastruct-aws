import { DeclaredAwsIamPrincipal } from '../../domain.objects/DeclaredAwsIamPrincipal';

/**
 * .what = aws sdk principal format
 * .why = defines the shape expected by iam api for principals
 */
export type SdkAwsPolicyPrincipal =
  | '*'
  | {
      Service?: string | string[];
      AWS?: string | string[];
      Federated?: string | string[];
    };

/**
 * .what = converts domain principal format to aws sdk format
 * .why = aws sdk expects uppercase keys (Service, AWS, Federated)
 */
export const castFromDeclaredAwsIamPrincipal = (
  principal: '*' | DeclaredAwsIamPrincipal | undefined,
): SdkAwsPolicyPrincipal | undefined => {
  // passthrough for undefined or wildcard
  if (!principal || principal === '*') return principal;

  // map lowercase domain keys to uppercase sdk keys
  if ('service' in principal) return { Service: principal.service };
  if ('aws' in principal) return { AWS: principal.aws };
  if ('federated' in principal) return { Federated: principal.federated };

  return undefined;
};
