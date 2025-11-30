import { DeclaredAwsIamPolicyDocument } from '../../domain.objects/DeclaredAwsIamPolicyDocument';
import { castFromDeclaredAwsIamPolicyStatement } from './castFromDeclaredAwsIamPolicyStatement';

/**
 * .what = converts domain policy document to aws sdk json string format
 * .why = builds complete policy document for iam api calls
 */
export const castFromDeclaredAwsIamPolicyDocument = (
  input: DeclaredAwsIamPolicyDocument,
): string =>
  JSON.stringify({
    Version: '2012-10-17',
    Statement: input.statements.map(castFromDeclaredAwsIamPolicyStatement),
  });
