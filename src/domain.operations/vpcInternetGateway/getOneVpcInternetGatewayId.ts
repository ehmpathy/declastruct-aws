import type { Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcInternetGateway } from '@src/domain.objects/DeclaredAwsVpcInternetGateway';

import { getOneVpcInternetGateway } from './getOneVpcInternetGateway';

/**
 * .what = resolves an internet gateway ref to its AWS IGW ID
 * .why = eliminates duplicate ref resolution logic across set operations
 */
export const getOneVpcInternetGatewayId = async (
  input: { gateway: Ref<typeof DeclaredAwsVpcInternetGateway> },
  context: ContextAwsApi & VisualogicContext,
): Promise<string> => {
  // handle primary ref (id)
  if ('id' in input.gateway) return input.gateway.id;

  // handle unique ref (exid)
  if ('exid' in input.gateway) {
    const igw = await getOneVpcInternetGateway(
      { by: { unique: input.gateway } },
      context,
    );
    if (!igw)
      throw new UnexpectedCodePathError('internet gateway not found', {
        gateway: input.gateway,
      });
    return igw.id;
  }

  // invalid ref
  throw new UnexpectedCodePathError('invalid internet gateway ref', {
    gateway: input.gateway,
  });
};
