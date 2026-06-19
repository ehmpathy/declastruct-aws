import type { Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';

import { getOneVpcSubnet } from './getOneVpcSubnet';

/**
 * .what = resolves a VPC subnet ref to its AWS subnet ID
 * .why = eliminates duplicate ref resolution logic across set operations
 */
export const getOneVpcSubnetId = async (
  input: { subnet: Ref<typeof DeclaredAwsVpcSubnet> },
  context: ContextAwsApi & VisualogicContext,
): Promise<string> => {
  // handle primary ref (id)
  if ('id' in input.subnet) return input.subnet.id;

  // handle unique ref (exid)
  if ('exid' in input.subnet) {
    const subnet = await getOneVpcSubnet(
      { by: { unique: input.subnet } },
      context,
    );
    if (!subnet)
      throw new UnexpectedCodePathError('subnet not found', {
        subnet: input.subnet,
      });
    return subnet.id;
  }

  // invalid ref
  throw new UnexpectedCodePathError('invalid subnet ref', {
    subnet: input.subnet,
  });
};
