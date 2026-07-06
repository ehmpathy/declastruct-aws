import { getOneSessionHealth } from './getOneSessionHealth';
import { setSession } from './setSession';

/**
 * .what = dao-style SDK wrapper for AWS SSM Session Manager
 * .why = provides raw i/o communicator operations for SSM sessions
 */
export const sdkSsmSession = {
  getOneSessionHealth,
  setSession,
};
