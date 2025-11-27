/**
 * .what = public SDK exports for declastruct-aws package
 * .why = enables consumers to use the declastruct provider interface and domain objects
 */

// provider
export { getDeclastructGithubProvider } from '../../domain.operations/provider/getDeclastructGithubProvider';
export type { DeclastructGithubProvider } from '../../domain.objects/DeclastructGithubProvider';

// domain objects
export { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
export { DeclaredGithubBranch } from '../../domain.objects/DeclaredGithubBranch';
export { DeclaredGithubRepoConfig } from '../../domain.objects/DeclaredGithubRepoConfig';
export { DeclaredGithubBranchProtection } from '../../domain.objects/DeclaredGithubBranchProtection';
