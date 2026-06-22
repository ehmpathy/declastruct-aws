import type { InstanceStateName } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asEc2InstanceSessionStatus } from './asEc2InstanceSessionStatus';

describe('asEc2InstanceSessionStatus', () => {
  given('AWS state is "running"', () => {
    when('mapped to session status', () => {
      then('it should return "active"', () => {
        const status = asEc2InstanceSessionStatus({
          awsStatus: 'running',
          stateReasonCode: undefined,
        });
        expect(status).toBe('active');
      });
    });
  });

  given('AWS state is "pending"', () => {
    when('mapped to session status', () => {
      then('it should return "active"', () => {
        const status = asEc2InstanceSessionStatus({
          awsStatus: 'pending',
          stateReasonCode: undefined,
        });
        expect(status).toBe('active');
      });
    });
  });

  given('AWS state is "stopped" with hibernate reason', () => {
    when('mapped to session status', () => {
      then('it should return "hibernated"', () => {
        const status = asEc2InstanceSessionStatus({
          awsStatus: 'stopped',
          stateReasonCode: 'Client.UserInitiatedHibernate',
        });
        expect(status).toBe('hibernated');
      });
    });
  });

  given('AWS state is "stopped" without hibernate reason', () => {
    when('mapped to session status', () => {
      then('it should return "stopped"', () => {
        const status = asEc2InstanceSessionStatus({
          awsStatus: 'stopped',
          stateReasonCode: 'Client.UserInitiatedShutdown',
        });
        expect(status).toBe('stopped');
      });
    });
  });

  given('AWS state is "stopped" with no reason code', () => {
    when('mapped to session status', () => {
      then('it should return "stopped"', () => {
        const status = asEc2InstanceSessionStatus({
          awsStatus: 'stopped',
          stateReasonCode: undefined,
        });
        expect(status).toBe('stopped');
      });
    });
  });

  given('AWS state is "stopping"', () => {
    when('mapped to session status', () => {
      then('it should return "stopped"', () => {
        const status = asEc2InstanceSessionStatus({
          awsStatus: 'stopping',
          stateReasonCode: undefined,
        });
        expect(status).toBe('stopped');
      });
    });
  });

  given('AWS state is "shutting-down"', () => {
    when('mapped to session status', () => {
      then('it should return "stopped"', () => {
        const status = asEc2InstanceSessionStatus({
          awsStatus: 'shutting-down',
          stateReasonCode: undefined,
        });
        expect(status).toBe('stopped');
      });
    });
  });

  given('AWS state is "terminated"', () => {
    when('mapped to session status', () => {
      then('it should return "stopped"', () => {
        const status = asEc2InstanceSessionStatus({
          awsStatus: 'terminated',
          stateReasonCode: undefined,
        });
        expect(status).toBe('stopped');
      });
    });
  });

  given('AWS state is undefined', () => {
    when('mapped to session status', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const error = await getError(() =>
          asEc2InstanceSessionStatus({
            awsStatus: undefined,
            stateReasonCode: undefined,
          }),
        );
        expect(error.message).toContain('unrecognized AWS instance state');
      });
    });
  });

  given('AWS state is unrecognized', () => {
    when('mapped to session status', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const error = await getError(() =>
          asEc2InstanceSessionStatus({
            awsStatus: 'some-future-state' as InstanceStateName,
            stateReasonCode: undefined,
          }),
        );
        expect(error.message).toContain('unrecognized AWS instance state');
      });
    });
  });
});
