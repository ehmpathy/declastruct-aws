import { delParameter } from './delParameter';
import { delParameterTags } from './delParameterTags';
import { describeOneParameter } from './describeOneParameter';
import { execCommand } from './execCommand';
import { getOneParameter } from './getOneParameter';
import { listOneParameterTags } from './listOneParameterTags';
import { setParameter } from './setParameter';
import { setParameterTags } from './setParameterTags';

/**
 * .what = dao-style SDK wrapper for AWS SSM
 * .why = provides raw i/o communicator operations for SSM
 */
export const sdkSsm = {
  getOneParameter,
  describeOneParameter,
  listOneParameterTags,
  setParameter,
  setParameterTags,
  delParameter,
  delParameterTags,
  execCommand,
};
