import type { Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';

import { getOneVpc } from './getOneVpc';

/**
 * .what = resolves a VPC ref to its AWS VPC ID
 * .why = eliminates duplicate ref resolution logic across set operations
 */
export const getOneVpcId = async (
  input: { vpc: Ref<typeof DeclaredAwsVpc> },
  context: ContextAwsApi & VisualogicContext,
): Promise<string> => {
  // handle primary ref (id)
  if ('id' in input.vpc) return input.vpc.id;

  // handle unique ref (exid)
  if ('exid' in input.vpc) {
    const vpc = await getOneVpc({ by: { unique: input.vpc } }, context);
    if (!vpc)
      throw new UnexpectedCodePathError('vpc not found', { vpc: input.vpc });
    return vpc.id;
  }

  // invalid ref
  throw new UnexpectedCodePathError('invalid vpc ref', { vpc: input.vpc });
};
