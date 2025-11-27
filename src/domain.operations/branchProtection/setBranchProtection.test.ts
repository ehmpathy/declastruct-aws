import { VisualogicContext } from 'visualogic';

import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranchProtection } from '../../domain.objects/DeclaredGithubBranchProtection';
import * as castModule from './castToDeclaredGithubBranchProtection';
import * as getBranchProtectionModule from './getBranchProtection';

// create mock functions first
const mockUpdateBranchProtection = jest.fn();

jest.mock('../../access/sdks/getGithubClient', () => ({
  getGithubClient: jest.fn(() => ({
    repos: {
      updateBranchProtection: mockUpdateBranchProtection,
    },
  })),
}));

jest.mock('./castToDeclaredGithubBranchProtection');
jest.mock('./getBranchProtection');

const { setBranchProtection } = require('./setBranchProtection');

const context: ContextGithubApi & VisualogicContext = {
  github: { token: 'test-token' },
  log: console,
};

const protectionSample: DeclaredGithubBranchProtection = {
  branch: {
    repo: { owner: 'test-owner', name: 'test-repo' },
    name: 'main',
  },
  enforceAdmins: true,
  allowsDeletions: false,
  allowsForcePushes: false,
  requireLinearHistory: true,
  requiredStatusChecks: {
    strict: true,
    contexts: ['ci/test'],
  },
  requiredPullRequestReviews: {
    requiredApprovingReviewCount: 1,
    dismissStaleReviews: true,
  },
  restrictions: null,
};

describe('setBranchProtection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early for finsert if protection already exists (before)', async () => {
    const before = { ...protectionSample };
    (
      getBranchProtectionModule.getBranchProtection as jest.Mock
    ).mockResolvedValue(before);

    const result = await setBranchProtection(
      { finsert: protectionSample },
      context,
    );

    expect(result).toBe(before);
    expect(getBranchProtectionModule.getBranchProtection).toHaveBeenCalled();
    expect(mockUpdateBranchProtection).not.toHaveBeenCalled();
  });

  it('updates protection if upsert and protection exists (before)', async () => {
    const before = { ...protectionSample };
    (
      getBranchProtectionModule.getBranchProtection as jest.Mock
    ).mockResolvedValue(before);

    const updatedProtectionResponse = {
      enforce_admins: { enabled: true },
      allow_deletions: { enabled: false },
      allow_force_pushes: { enabled: false },
      required_linear_history: { enabled: true },
      required_status_checks: {
        strict: true,
        contexts: ['ci/test'],
      },
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
      },
    };

    mockUpdateBranchProtection.mockResolvedValue({
      data: updatedProtectionResponse,
    });
    (
      castModule.castToDeclaredGithubBranchProtection as jest.Mock
    ).mockReturnValue(protectionSample);

    const result = await setBranchProtection(
      { upsert: protectionSample },
      context,
    );

    expect(getBranchProtectionModule.getBranchProtection).toHaveBeenCalled();
    expect(mockUpdateBranchProtection).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
      enforce_admins: true,
      allow_deletions: false,
      allow_force_pushes: false,
      required_linear_history: true,
      block_creations: undefined,
      lock_branch: undefined,
      allow_fork_syncing: undefined,
      required_status_checks: {
        strict: true,
        contexts: ['ci/test'],
      },
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 1,
        dismissal_restrictions: undefined,
      },
      restrictions: null,
      required_conversation_resolution: undefined,
    });
    expect(result.branch.name).toEqual('main');
  });

  it('creates (updates) protection if protection does not exist (before = null)', async () => {
    (
      getBranchProtectionModule.getBranchProtection as jest.Mock
    ).mockResolvedValue(null);

    const updatedProtectionResponse = {
      enforce_admins: { enabled: true },
      allow_deletions: { enabled: false },
      allow_force_pushes: { enabled: false },
      required_linear_history: { enabled: true },
      required_status_checks: {
        strict: true,
        contexts: ['ci/test'],
      },
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
      },
    };

    mockUpdateBranchProtection.mockResolvedValue({
      data: updatedProtectionResponse,
    });
    (
      castModule.castToDeclaredGithubBranchProtection as jest.Mock
    ).mockReturnValue(protectionSample);

    const result = await setBranchProtection(
      { finsert: protectionSample },
      context,
    );

    expect(getBranchProtectionModule.getBranchProtection).toHaveBeenCalled();
    expect(mockUpdateBranchProtection).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
      enforce_admins: true,
      allow_deletions: false,
      allow_force_pushes: false,
      required_linear_history: true,
      block_creations: undefined,
      lock_branch: undefined,
      allow_fork_syncing: undefined,
      required_status_checks: {
        strict: true,
        contexts: ['ci/test'],
      },
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 1,
        dismissal_restrictions: undefined,
      },
      restrictions: null,
      required_conversation_resolution: undefined,
    });
    expect(result.branch.name).toEqual('main');
  });
});
