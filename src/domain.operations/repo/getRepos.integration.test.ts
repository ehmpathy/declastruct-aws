import { given, then } from 'test-fns';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getRepos } from './getRepos';

const log = console;

describe('getRepos', () => {
  const context = { log, ...getSampleGithubContext() };

  given('an authenticated user with repos', () => {
    then('we should be able to get a list', async () => {
      const repos = await getRepos({ page: { limit: 10 } }, context);
      console.log(repos);
      expect(repos.length).toBeGreaterThan(0);
    });
  });

  given('a specific owner', () => {
    then('we should be able to list their repos', async () => {
      const repos = await getRepos(
        {
          where: { owner: 'ehmpathy' },
          page: { limit: 5 },
        },
        context,
      );
      console.log(repos);
      expect(repos.length).toBeGreaterThan(0);
      expect(repos.every((repo) => repo.owner === 'ehmpathy')).toBe(true);
    });
  });
});
