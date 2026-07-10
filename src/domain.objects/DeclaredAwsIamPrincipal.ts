import { DomainLiteral } from 'domain-objects';
import { z } from 'zod';

/**
 * .what = principal specification for trust policies
 * .why = defines who can assume a role or access a resource
 * .note = only one principal type can be specified per statement
 */
export interface DeclaredAwsIamPrincipal {
  /**
   * .what = aws account, user, or role arns
   * .example = 'arn:aws:iam::123456789012:root'
   */
  aws?: string | string[];

  /**
   * .what = aws service principals
   * .example = 'lambda.amazonaws.com'
   */
  service?: string | string[];

  /**
   * .what = federated identity provider arns
   * .example = 'arn:aws:iam::123456789012:saml-provider/MyProvider'
   */
  federated?: string | string[];
}

export class DeclaredAwsIamPrincipal
  extends DomainLiteral<DeclaredAwsIamPrincipal>
  implements DeclaredAwsIamPrincipal
{
  /**
   * .what = a strict schema for a principal (each key optional, no unknown keys)
   * .why = a strict (closed) schema lets domain-objects structurally disambiguate this
   *   from a `DeclaredAwsIamPrincipalScope` when both are nested options on a statement's
   *   `principal` field — the two shapes share no keys, so try-each-option settles them
   *   with no `_dobj` discriminator (see the nested-union brief)
   */
  public static schema = z
    .object({
      aws: z.union([z.string(), z.array(z.string())]).optional(),
      service: z.union([z.string(), z.array(z.string())]).optional(),
      federated: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .strict();
}
