/**
 * .what = builds AWS SSM start-session command arguments for port-forwarding
 * .why = extracts decode-friction from orchestrator into named transformer
 */
export const asSsmStartSessionArgs = (input: {
  bastion: { id: string };
  cluster: { host: { writer: string }; port: number };
  localPort: number;
  region: string | null;
}): string[] => {
  const baseArgs = [
    'ssm',
    'start-session',
    '--target',
    input.bastion.id,
    '--document-name',
    'AWS-StartPortForwardingSessionToRemoteHost',
    '--parameters',
    JSON.stringify({
      host: [input.cluster.host.writer],
      portNumber: [String(input.cluster.port)],
      localPortNumber: [String(input.localPort)],
    }),
  ];

  // append region if provided
  if (input.region) {
    return [...baseArgs, '--region', input.region];
  }

  return baseArgs;
};
