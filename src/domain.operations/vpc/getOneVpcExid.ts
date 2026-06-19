import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getOneVpc } from './getOneVpc';

/**
 * .what = gets the exid tag value for a VPC by its AWS id
 * .why = enables cast functions to return refs by exid instead of id
 */
export const getOneVpcExid = asProcedure(
  async (
    input: { vpcId: string },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<string> => {
    // lookup vpc by primary key
    const vpc = await getOneVpc({ by: { primary: { id: input.vpcId } } }, context);

    // failfast if vpc not found
    if (!vpc)
      throw UnexpectedCodePathError.throw(
        'vpc not found; cannot get exid from id',
        { input },
      );

    return vpc.exid;
  },
);
