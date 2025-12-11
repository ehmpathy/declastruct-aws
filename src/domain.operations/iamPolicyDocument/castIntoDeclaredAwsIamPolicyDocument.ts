import { DeclaredAwsIamPolicyDocument } from '../../domain.objects/DeclaredAwsIamPolicyDocument';

/**
 * .what = parses AWS inline policy JSON to domain format
 */
export const castIntoDeclaredAwsIamPolicyDocument = (
  inlinePolicy: string | undefined,
): DeclaredAwsIamPolicyDocument => {
  if (!inlinePolicy)
    return new DeclaredAwsIamPolicyDocument({ statements: [] });

  const awsPolicy = JSON.parse(inlinePolicy) as {
    Statement?: Array<{
      Sid?: string;
      Effect: 'Allow' | 'Deny';
      Principal?: unknown;
      Action: string | string[];
      Resource?: string | string[];
      Condition?: Record<string, Record<string, string | string[]>>;
    }>;
  };

  return new DeclaredAwsIamPolicyDocument({
    statements: (awsPolicy.Statement ?? []).map((stmt) => ({
      effect: stmt.Effect,
      action: stmt.Action,
      ...(stmt.Sid !== undefined && { sid: stmt.Sid }),
      ...(stmt.Principal !== undefined && {
        principal: stmt.Principal as
          | '*'
          | { service?: string; aws?: string; federated?: string },
      }),
      ...(stmt.Resource !== undefined && { resource: stmt.Resource }),
      ...(stmt.Condition !== undefined && { condition: stmt.Condition }),
    })),
  });
};
