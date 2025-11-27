import { VisualogicContext } from 'visualogic';

import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranch } from '../../domain.objects/DeclaredGithubBranch';
import * as getBranchModule from './getBranch';
import { setBranch } from './setBranch';

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));
jest.mock('./getBranch');

const mockCreateRef = jest.fn();
const mockGet = jest.fn();

const { Octokit } = jest.requireMock('@octokit/rest');
Octokit.mockImplementation(() => ({
  git: {
    createRef: mockCreateRef,
  },
  repos: {
    get: mockGet,
  },
}));

const context: ContextGithubApi & VisualogicContext = {
  github: { token: 'test-token' },
  log: console,
};

const branchSample: DeclaredGithubBranch = {
  repo: {
    owner: 'test-owner',
    name: 'test-repo',
  },
  name: 'test-branch',
  commit: { sha: 'abc123' },
};

describe('setBranch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early for finsert if branch already exists (before)', async () => {
    const before = {
      ...branchSample,
      commit: { sha: 'abc123' },
      protected: false,
    };
    (getBranchModule.getBranch as jest.Mock).mockResolvedValue(before);

    const result = await setBranch({ finsert: branchSample }, context);

    expect(result).toBe(before);
    expect(getBranchModule.getBranch).toHaveBeenCalled();
    expect(mockCreateRef).not.toHaveBeenCalled();
  });

  it('returns existing for upsert if branch exists and no commit.sha change', async () => {
    const before = {
      ...branchSample,
      commit: { sha: 'abc123' },
      protected: false,
    };
    (getBranchModule.getBranch as jest.Mock).mockResolvedValue(before);

    const result = await setBranch({ upsert: branchSample }, context);

    expect(result).toBe(before);
    expect(getBranchModule.getBranch).toHaveBeenCalled();
    expect(mockCreateRef).not.toHaveBeenCalled();
  });

  it('creates branch with specified commit.sha', async () => {
    const branchWithCommit = {
      ...branchSample,
      commit: { sha: 'specifiedSha123' },
    };

    // first getBranch call returns null (branch doesn't exist)
    // second getBranch call returns created branch
    (getBranchModule.getBranch as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...branchSample,
        commit: { sha: 'specifiedSha123' },
        protected: false,
      });

    mockCreateRef.mockResolvedValue({ data: {} });

    const result = await setBranch({ finsert: branchWithCommit }, context);

    expect(mockCreateRef).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      ref: 'refs/heads/test-branch',
      sha: 'specifiedSha123',
    });
    expect(result.commit?.sha).toBe('specifiedSha123');
  });

  it('creates branch from default branch if commit.sha not specified', async () => {
    const branchWithoutCommit = {
      repo: {
        owner: 'test-owner',
        name: 'test-repo',
      },
      name: 'test-branch',
    };

    // first getBranch call returns null (branch doesn't exist)
    // second getBranch call returns default branch
    // third getBranch call returns created branch
    (getBranchModule.getBranch as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...branchSample,
        name: 'main',
        commit: { sha: 'defaultSha456' },
        protected: false,
      })
      .mockResolvedValueOnce({
        ...branchSample,
        commit: { sha: 'defaultSha456' },
        protected: false,
      });

    mockGet.mockResolvedValue({
      data: {
        default_branch: 'main',
      },
    });

    mockCreateRef.mockResolvedValue({ data: {} });

    const result = await setBranch({ finsert: branchWithoutCommit }, context);

    expect(mockGet).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
    });
    expect(mockCreateRef).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      ref: 'refs/heads/test-branch',
      sha: 'defaultSha456',
    });
    expect(result.commit?.sha).toBe('defaultSha456');
  });
});
