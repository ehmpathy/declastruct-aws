# rule.require.ssm-session-cleanup-both-ends

## .what

integration tests that open SSM sessions (port-forward tunnels, `AWS-StartSSHSession`,
`AWS-StartPortForwardingSession`) must terminate those sessions in BOTH beforeAll
AND afterAll — the same both-ends discipline required for EC2 instances.

## .why

terminating an EC2 instance does NOT clean up the SSM session it held:

- when the instance ends, the session-manager-plugin client dies ungracefully
- the SSM control plane never receives a clean disconnect
- the session stays `Active` in `describe-sessions` indefinitely (observed: 3+ days)
- there is no enforced idle timeout unless an `SSM-SessionManagerRunShell`
  preferences document is configured (this account has none)

so an instance-only cleanup (even a correct both-ends one) still leaks sessions:
each test run terminates its instance, orphaning every session that instance held.
they accumulate unbounded.

a real incident: the `ssmSshTunnel.journey` test cleaned up instances both ends,
yet 25 orphan sessions piled up across 4 days of runs — 3–5 per terminated test
instance — because no code ever called `TerminateSession`.

### cost of leniency

- `describe-sessions` clutters with dozens of dead sessions
- masks genuinely live sessions during triage
- (no dollar cost — Session Manager sessions are free — but it is real state rot)

## .pattern

```typescript
import {
  DescribeSessionsCommand,
  SSMClient,
  TerminateSessionCommand,
} from '@aws-sdk/client-ssm';

// terminate active sessions whose target instance matches a predicate
const terminateSsmSessions = async (input: {
  ssm: SSMClient;
  shouldTerminate: (target: string) => boolean;
}): Promise<void> => {
  const response = await input.ssm.send(
    new DescribeSessionsCommand({ State: 'Active' }),
  );
  const doomed = (response.Sessions ?? []).filter(
    (session) => session.Target && input.shouldTerminate(session.Target),
  );
  for (const session of doomed) {
    if (!session.SessionId) continue;
    await input.ssm.send(
      new TerminateSessionCommand({ SessionId: session.SessionId }),
    );
  }
};

describe('mySsmTunnelTest', () => {
  const instanceIds: string[] = [];

  // BEFORE: prune orphan sessions whose target instance no longer exists
  beforeAll(async () => {
    // ...after the orphan-instance sweep, compute the live instance id set...
    const liveIds = new Set(/* non-terminated instance ids */);
    await terminateSsmSessions({
      ssm,
      shouldTerminate: (target) => !liveIds.has(target),
    });
  });

  // AFTER: terminate OUR sessions BEFORE terminating OUR instances
  afterAll(async () => {
    const ourInstances = new Set(instanceIds);
    await terminateSsmSessions({
      ssm,
      shouldTerminate: (target) => ourInstances.has(target),
    });
    // ...then terminate the instances...
  });
});
```

## .requirements

1. **afterAll**: terminate sessions targeting this run's instances BEFORE the
   instances end (order matters — after the instance ends, its session cannot be
   cleanly closed)
2. **beforeAll**: prune orphan sessions — those whose target instance no longer
   exists — to sweep up leftovers from prior crashed runs
3. terminate by `Target` (instance id), so parallel runs never kill each other's
   live sessions

## .escape hatch

if a test genuinely cannot enumerate its sessions by target instance, that is a
gap to close in the test harness, not a license to skip cleanup. the orphans do
not self-heal.

## .enforcement

- SSM-session test with only instance cleanup (no session cleanup) = blocker
- session cleanup that runs AFTER instance termination = blocker (too late)

## .see also

- `rule.require.ec2-test-cleanup-both-ends` — the instance-level analogue
- `aws.ssm.sessions` skill — list + prune orphan sessions on demand
- `rule.require.declarative-test-infra` — declare infra the same way a user would
