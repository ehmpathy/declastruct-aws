import { given, then } from 'test-fns';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getSampleRepo } from '../../.test/assets/getSampleRepo';
import { getRepo } from './getRepo';

const log = console;

describe('getRepo', () => {
  const context = { log, ...getSampleGithubContext() };

  given('a live example repo exists', () => {
    then('we should be able to get its state', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws',
      });

      const repo = await getRepo(
        {
          by: {
            unique: {
              owner: sampleRepo.owner,
              name: sampleRepo.name,
            },
          },
        },
        context,
      );

      console.log(repo);
      expect(repo).toBeDefined();
      expect(repo?.name).toBe(sampleRepo.name);
      expect(repo?.owner).toBe(sampleRepo.owner);
      expect(repo?.id).toBeDefined();
    });
  });

  given('a repo that does not exist', () => {
    then('it should return null', async () => {
      const repo = await getRepo(
        {
          by: {
            unique: {
              owner: 'ehmpathy',
              name: 'repo-that-does-not-exist-99999',
            },
          },
        },
        context,
      );

      expect(repo).toBeNull();
    });
  });
});
