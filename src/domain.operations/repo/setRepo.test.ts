import { VisualogicContext } from 'visualogic';

import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import * as castModule from './castToDeclaredGithubRepo';
import * as getRepoModule from './getRepo';

// create mock functions first
const mockUpdate = jest.fn();
const mockCreateForAuthenticatedUser = jest.fn();
const mockCreateInOrg = jest.fn();

jest.mock('../../access/sdks/getGithubClient', () => ({
  getGithubClient: jest.fn(() => ({
    repos: {
      update: mockUpdate,
      createForAuthenticatedUser: mockCreateForAuthenticatedUser,
      createInOrg: mockCreateInOrg,
    },
  })),
}));

jest.mock('./castToDeclaredGithubRepo');
jest.mock('./getRepo');

const { setRepo } = require('./setRepo');

const context: ContextGithubApi & VisualogicContext = {
  github: { token: 'test-token' },
  log: console,
};

const repoSample: DeclaredGithubRepo = {
  owner: 'test-owner',
  name: 'test-repo',
  description: 'Test repository',
  homepage: null,
  private: false,
  visibility: 'public',
  archived: false,
};

describe('setRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early for finsert if repo already exists (before)', async () => {
    const before = { ...repoSample, id: 123 };
    (getRepoModule.getRepo as jest.Mock).mockResolvedValue(before);

    const result = await setRepo({ finsert: repoSample }, context);

    expect(result).toBe(before);
    expect(getRepoModule.getRepo).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreateForAuthenticatedUser).not.toHaveBeenCalled();
    expect(mockCreateInOrg).not.toHaveBeenCalled();
  });

  it('updates repo if upsert and repo exists (before)', async () => {
    const before = { ...repoSample, id: 123 };
    (getRepoModule.getRepo as jest.Mock).mockResolvedValue(before);

    const updatedRepoResponse = {
      id: 123,
      owner: { login: 'test-owner' },
      name: 'test-repo',
      description: 'Updated description',
      private: false,
    };

    mockUpdate.mockResolvedValue({ data: updatedRepoResponse });
    (castModule.castToDeclaredGithubRepo as jest.Mock).mockReturnValue({
      ...repoSample,
      id: 123,
      description: 'Updated description',
    });

    const result = await setRepo({ upsert: repoSample }, context);

    expect(getRepoModule.getRepo).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      description: 'Test repository',
      homepage: undefined,
      private: false,
      visibility: 'public',
      archived: false,
    });
    expect(result.name).toEqual('test-repo');
  });

  it('creates repo if it does not exist (before = null)', async () => {
    (getRepoModule.getRepo as jest.Mock).mockResolvedValue(null);

    const createdRepoResponse = {
      id: 456,
      owner: { login: 'test-owner' },
      name: 'test-repo',
      description: 'Test repository',
      private: false,
    };

    mockCreateInOrg.mockResolvedValue({ data: createdRepoResponse });
    (castModule.castToDeclaredGithubRepo as jest.Mock).mockReturnValue({
      ...repoSample,
      id: 456,
    });

    const result = await setRepo({ finsert: repoSample }, context);

    expect(getRepoModule.getRepo).toHaveBeenCalled();
    expect(mockCreateInOrg).toHaveBeenCalledWith({
      org: 'test-owner',
      name: 'test-repo',
      description: 'Test repository',
      homepage: undefined,
      private: false,
      visibility: 'public',
    });
    expect(result.id).toEqual(456);
  });

  it('filters out internal visibility when creating repo', async () => {
    (getRepoModule.getRepo as jest.Mock).mockResolvedValue(null);

    const repoWithInternalVisibility = {
      ...repoSample,
      visibility: 'internal' as const,
    };

    mockCreateInOrg.mockResolvedValue({
      data: { id: 789, owner: { login: 'test-owner' }, name: 'test-repo' },
    });
    (castModule.castToDeclaredGithubRepo as jest.Mock).mockReturnValue({
      ...repoSample,
      id: 789,
    });

    await setRepo({ finsert: repoWithInternalVisibility }, context);

    expect(mockCreateInOrg).toHaveBeenCalledWith({
      org: 'test-owner',
      name: 'test-repo',
      description: 'Test repository',
      homepage: undefined,
      private: false,
      visibility: undefined, // internal filtered out
    });
  });
});
