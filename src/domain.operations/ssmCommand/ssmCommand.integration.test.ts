import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';

import { execSsmCommand } from './execSsmCommand';

/**
 * .what = integration tests for SSM command execution
 * .why = verifies SSM command orchestrator works
 * .note
 *   - requires ssm:SendCommand and ssm:GetCommandInvocation permissions
 *   - demo-agent currently lacks these permissions
 *   - tests document expected errors when permissions absent
 */
describe('ssmCommand', () => {
  // scene setup
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    return { context };
  });

  given('[case1] instance reference resolution', () => {
    when('[t0] instance ref by nonexistent exid', () => {
      then('throws BadRequestError about instance not found', async () => {
        const { context } = scene;

        await expect(
          execSsmCommand(
            {
              instance: { exid: 'nonexistent-instance-for-command' },
              commands: ['echo hello'],
            },
            context,
          ),
        ).rejects.toThrow(/instance not found/);
      });
    });

    when('[t1] instance ref with invalid format', () => {
      then('throws BadRequestError about invalid ref', async () => {
        const { context } = scene;

        await expect(
          execSsmCommand(
            {
              instance: {} as { id: string },
              commands: ['echo hello'],
            },
            context,
          ),
        ).rejects.toThrow(/must have id or exid/);
      });
    });
  });

  given('[case2] SSM command execution', () => {
    when('[t0] attempt command on nonexistent instance id', () => {
      then('throws AWS error', async () => {
        const { context } = scene;

        // SSM will reject the command for nonexistent instance
        await expect(
          execSsmCommand(
            {
              instance: { id: 'i-nonexistent12345678' },
              commands: ['echo hello'],
            },
            context,
          ),
        ).rejects.toThrow();
      });
    });
  });

  /**
   * .note = actual command execution tests require:
   *   - valid EC2 instance with SSM agent
   *   - ssm:SendCommand permission
   *   - ssm:GetCommandInvocation permission
   *
   * demo-agent currently lacks these permissions.
   * add [case3] with real execution when permissions available.
   */
});
