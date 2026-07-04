## context

dogfooding `use.ssh.tunnel` (declastruct-aws) failed with:

```
CredentialsProviderError: Token is expired. To refresh this SSO session run 'aws sso login'.
```

even though the wrapper (`aws.ssh.creds.sh`) already auto-unlocks keyrack. root cause was two gaps in how a keyrack-backed skill bootstraps creds.

## the gaps

1. **false-positive preflight** — the wrapper only re-unlocks when its own `aws sts get-caller-identity` preflight returns empty. the aws **CLI** accepted a cached SSO token that the AWS **SDK** later rejected, so the gate passed while the real work (`npx declastruct apply`, SDK-based) failed on the expired token.

2. **no in-process keyrack source** — `npx declastruct apply` (and any spawned tool) runs in a fresh process that does NOT inherit the shell's creds. every declastruct resources entry file is supposed to call `keyrack.source({ env, owner, mode })` at the top for this reason, but the ssh wish relied solely on the wrapper's exported `AWS_PROFILE`.

## the ask (enroller guidance / brief)

teach enrollers that any skill or wish that needs credentials from keyrack MUST:

- **auto-unlock the keyrack vault** as part of its cred bootstrap: `rhx keyrack unlock --owner <org> --env <env>` — never assume the vault is already unlocked.
- **not trust a CLI preflight as proof** the downstream SDK path will authenticate; if the real work spawns a fresh process, that process needs its own cred lookup.
- for **declastruct wishes** specifically: the entry `.ts` must call `keyrack.source({ env, owner, mode })` so the spawned plan/apply refreshes creds in-process.
- **fail loud** with the exact unlock command as a hint when creds still cannot be read.

net: "always auto-unlock keyracks" should be a first-class enroller rule, with the SDK-vs-CLI preflight pitfall and the spawned-process cred-inheritance pitfall called out.

---

origin: declastruct-aws behavior v2026_06_22.fix-ec2-hibernate, use.ssh.tunnel dogfood, 2026-07-03
