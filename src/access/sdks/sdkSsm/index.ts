import { execCommand } from './execCommand';
import { getOneParameter } from './getOneParameter';
import { setParameter } from './setParameter';

/**
 * .what = dao-style SDK wrapper for AWS SSM
 * .why = provides raw i/o communicator operations for SSM
 */
export const sdkSsm = {
  getOneParameter,
  setParameter,
  execCommand,
};
