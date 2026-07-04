# howto.provision-keyrack-source

## .what

every declastruct resources entry file (the one passed to `--wish`) must source
its own AWS credentials from keyrack at the top of the file:

```ts
import { keyrack } from 'rhachet/keyrack';

// source aws credentials from keyrack
keyrack.source({ env: '<env>', owner: 'ehmpath', mode: 'lenient' });
```

## .why

`npx declastruct plan/apply` spawns a fresh process that does NOT inherit shell
credentials. without `keyrack.source(...)` in the resources file, plan fails with:

```
CredentialsProviderError: Could not load credentials from any providers
```

## .which env per file

| resources file | env |
|----------------|-----|
| `src/contract/sdks/.test/assets/resources.acceptance.ts` | `test` |
| `provision/aws.infra/account=demo/resources.ts` | `prep` (infra is prep, NOT test) |

## .unlock the right creds first

```bash
rhx keyrack unlock --owner ehmpath --env <env>
```

valid `--env` values: `sudo`, `prod`, `prep`, `test`, `all` — there is no `demo` env.

## .exception

the root SSO provision (`provision/aws.auth/account=.root/`) does NOT use
`keyrack.source`. it needs interactive root admin creds + a sourced `.env`
(see `howto.add-test-permissions.md`).
