import { DeclaredAwsIamPolicyDocument } from '../../domain.objects/DeclaredAwsIamPolicyDocument';
import {
  SdkAwsPolicyStatementRaw,
  castIntoDeclaredAwsIamPolicyStatement,
} from './castIntoDeclaredAwsIamPolicyStatement';

/**
 * .what = aws sdk policy document shape (raw from api)
 * .why = defines the shape received from iam api responses
 */
export interface SdkAwsPolicyDocumentRaw {
  Statement: SdkAwsPolicyStatementRaw[];
}

/**
 * .what = converts aws sdk policy document to domain format
 * .why = transforms PascalCase sdk fields to camelCase domain fields
 */
export const castIntoDeclaredAwsIamPolicyDocument = (
  doc: SdkAwsPolicyDocumentRaw,
): DeclaredAwsIamPolicyDocument =>
  DeclaredAwsIamPolicyDocument.as({
    statements: doc.Statement.map(castIntoDeclaredAwsIamPolicyStatement),
  });
