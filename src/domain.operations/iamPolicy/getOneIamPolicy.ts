import {
  GetPolicyCommand,
  GetPolicyVersionCommand,
  IAMClient,
  ListPolicyTagsCommand,
} from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamPolicy } from '@src/domain.objects/DeclaredAwsIamPolicy';

import { castIntoDeclaredAwsIamPolicy } from './castIntoDeclaredAwsIamPolicy';

/**
 * .what = retrieves an iam managed policy from aws
 * .why = enables lookup by primary (arn) or unique (name, path)
 *
 * .note
 *   - supports both aws-managed and customer-managed policies
 *   - fetches both policy metadata and the default version's document
 */
export const getOneIamPolicy = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsIamPolicy>;
        unique: RefByUnique<typeof DeclaredAwsIamPolicy>;
        ref: Ref<typeof DeclaredAwsIamPolicy>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsIamPolicy> | null> => {
    // resolve ref to primary or unique
    const by = (() => {
      // passthrough if not ref
      if (!input.by.ref) return input.by;

      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamPolicy })(input.by.ref))
        return { unique: input.by.ref };

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsIamPolicy })(input.by.ref))
        return { primary: input.by.ref };

      // failfast if ref is neither unique nor primary
      return UnexpectedCodePathError.throw(
        'ref is neither unique nor primary',
        { input },
      );
    })();

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // resolve policy arn
    const policyArn = (() => {
      // if by primary, use arn directly
      if (by.primary) return by.primary.arn;

      // if by unique, construct arn from name and path
      if (by.unique) {
        const path = by.unique.path ?? '/';
        const account = context.aws.credentials.account;
        return `arn:aws:iam::${account}:policy${path}${by.unique.name}`;
      }

      // failfast if neither
      return UnexpectedCodePathError.throw('could not resolve policy arn', {
        by,
      });
    })();

    try {
      // fetch policy metadata
      const policyResponse = await iam.send(
        new GetPolicyCommand({ PolicyArn: policyArn }),
      );

      if (!policyResponse.Policy) return null;

      const defaultVersionId = policyResponse.Policy.DefaultVersionId;
      if (!defaultVersionId)
        return UnexpectedCodePathError.throw(
          'policy has no default version id',
          { policyResponse },
        );

      // fetch policy document for default version
      const versionResponse = await iam.send(
        new GetPolicyVersionCommand({
          PolicyArn: policyArn,
          VersionId: defaultVersionId,
        }),
      );

      // decode url-encoded policy document
      const policyDocument = versionResponse.PolicyVersion?.Document
        ? decodeURIComponent(versionResponse.PolicyVersion.Document)
        : undefined;

      // fetch tags (only for customer-managed policies, not aws-managed)
      let tags: { Key?: string; Value?: string }[] | undefined;
      if (!policyArn.includes(':aws:policy/')) {
        try {
          const tagsResponse = await iam.send(
            new ListPolicyTagsCommand({ PolicyArn: policyArn }),
          );
          tags = tagsResponse.Tags;
        } catch {
          // ignore tag fetch errors (aws-managed policies don't support tags)
        }
      }

      // cast to domain format
      return castIntoDeclaredAwsIamPolicy({
        policy: policyResponse.Policy,
        policyDocument,
        tags,
      });
    } catch (error) {
      // return null if policy not found
      if (error instanceof Error && error.name === 'NoSuchEntityException')
        return null;
      throw error;
    }
  },
);
