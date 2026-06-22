import type { InstanceStateName } from '@aws-sdk/client-ec2';
import { UnexpectedCodePathError } from 'helpful-errors';

import type { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';

/**
 * .what = maps AWS instance state to session status
 * .why = encapsulates state machine logic for testability
 */
export const asEc2InstanceSessionStatus = (input: {
  awsStatus: InstanceStateName | undefined;
  stateReasonCode: string | undefined;
}): DeclaredAwsEc2InstanceSession['status'] => {
  const { awsStatus, stateReasonCode } = input;

  // active when AWS reports 'running' (AWS API value)
  if (awsStatus === 'running') return 'active';

  // pending maps to active — intent to be active is in progress
  if (awsStatus === 'pending') return 'active';

  // hibernated when stopped due to hibernate
  if (
    awsStatus === 'stopped' &&
    stateReasonCode === 'Client.UserInitiatedHibernate'
  ) {
    return 'hibernated';
  }

  // stopped for stopped state
  if (awsStatus === 'stopped') return 'stopped';

  // stopping and shutting-down map to stopped — intent to be stopped is in progress
  if (awsStatus === 'stopping' || awsStatus === 'shutting-down')
    return 'stopped';

  // terminated instances have no session
  if (awsStatus === 'terminated') return 'stopped';

  // failfast on unknown AWS states
  return UnexpectedCodePathError.throw(
    'unrecognized AWS instance state; cannot determine session status',
    { awsStatus, stateReasonCode },
  );
};
