import { DomainLiteral } from 'domain-objects';

/**
 * .what = aws resource tags as key-value pairs
 * .why = enables consistent tagging across all aws resources
 */
export interface DeclaredAwsTags {
  [key: string]: string;
}
export class DeclaredAwsTags
  extends DomainLiteral<DeclaredAwsTags>
  implements DeclaredAwsTags {}
