# F10 — the rhachet upgrade bundle stays out of this pr

## .the fork
- A: fix the upgrade bundle's blemishes here (husky hook messages, the `.agent/.actors` file names) and ship them in this pr
- B: leave the bundle unstaged and out of the pr; its files are owned upstream (declapract, rhachet) and land via their own upgrade

## .taken
B. the worktree carries an unrelated rhachet upgrade: `package.json`, `pnpm-lock.yaml`, `.husky/*`, `.claude`, `.agent/.actors/*`, `.depcheckrc.yml`. the pr stages named paths only, so none of these ride. the husky hooks are declapract-managed (F4); `AGENTS.md` / `CLAUDE.md` under `.agent/.actors/` are the host tool's fixed names, written by rhachet, never by hand. a fix here would drift on the next upgrade.

## .rework
clean: the upgrade lands in its own pr; any hook fix goes upstream (`dreams/v2026_11_15.reseed.declapract-yalc-hook-failhide.md`).

## .confidence — 90%
why not higher: the director may prefer the upgrade ride along to save a pr.

## .verdict
open — for the director at the done gate.
