import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getSampleRepo } from '../../.test/assets/getSampleRepo';
import { getRepoConfig } from './getRepoConfig';
import { setRepoConfig } from './setRepoConfig';

const log = console;

describe('setRepoConfig', () => {
  const context = { log, ...getSampleGithubContext() };

  describe('live tests', () => {
    it('should update repo config settings', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      // Get current config
      const currentConfig = await getRepoConfig(
        {
          by: {
            unique: {
              repo: {
                owner: sampleRepo.owner,
                name: sampleRepo.name,
              },
            },
          },
        },
        context,
      );

      expect(currentConfig).toBeDefined();

      // Update config with upsert
      const result = await setRepoConfig(
        {
          upsert: {
            repo: sampleRepo,
            hasIssues: true,
            hasProjects: false,
            hasWiki: false,
            hasDownloads: false,
            allowSquashMerge: true,
            allowMergeCommit: false,
            allowRebaseMerge: false,
            allowAutoMerge: true,
            deleteBranchOnMerge: true, // ensure this is set to true
          },
        },
        context,
      );

      expect(result).toBeDefined();
      expect(result.repo.owner).toBe(sampleRepo.owner);
      expect(result.repo.name).toBe(sampleRepo.name);
      expect(result.deleteBranchOnMerge).toBe(true);
    });

    it('should return existing config for finsert', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      // Get current config
      const currentConfig = await getRepoConfig(
        {
          by: {
            unique: {
              repo: {
                owner: sampleRepo.owner,
                name: sampleRepo.name,
              },
            },
          },
        },
        context,
      );

      expect(currentConfig).toBeDefined();

      // Finsert should return existing config without making changes
      const result = await setRepoConfig(
        {
          finsert: {
            repo: { owner: sampleRepo.owner, name: sampleRepo.name },
            hasIssues: true,
            hasProjects: true,
            hasWiki: true,
            hasDownloads: true,
            isTemplate: false,
            defaultBranch: 'main',
            allowSquashMerge: true,
            allowMergeCommit: true,
            allowRebaseMerge: true,
          },
        },
        context,
      );

      expect(result).toBeDefined();
      expect(result.repo.name).toBe(sampleRepo.name);
      // Should match current config, not the finsert values
      expect(result).toEqual(currentConfig);
    });
  });
});
