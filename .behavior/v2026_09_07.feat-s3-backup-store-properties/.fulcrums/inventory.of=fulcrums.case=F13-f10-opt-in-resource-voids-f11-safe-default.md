# F13 — F10's opt-in resource voids the safe-default F11 was flipped to secure

**rework** — · **status** ⚫ **RETIRED 2026-09-09 — the premise is gone** · **confidence** —

⚫ **this fulcrum is not live.** it named a real collision between two verdicts issued at the same
council. the second council reversed one of those verdicts, and the collision went with it.

## .what it named

| verdict | what it bound |
|---|---|
| **F10**, as first ruled | `publicAccessBlock` is a **separate declared resource + DAO** |
| **F11** | `publicAccessBlock: null` means **the secure default** (all four booleans true) |

🔴 **a separate resource leaves F11 with no field to bind to.** the bucket dobj would carry no
`publicAccessBlock` key — exactly as it carries no `policy` key — so the least-effort path became
*declare no block at all*, which reaches the same insecure outcome F11 was flipped to prevent, with
**fewer** keystrokes:

| shape | the least-effort path | bucket blocked? |
|---|---|---|
| option (a) — F11's rejected best-guess | type `publicAccessBlock: null` | ⛔ no |
| option (b) — **F11's verdict** | type `publicAccessBlock: null` | 🟢 yes |
| 🔴 **separate resource + F11** | **declare no block resource at all** | ⛔ **no** |

## 🟢 .why it retires rather than resolves

the second council restored **nested fields** (`F10`). the field exists again, so `null` has a site
and F11's guarantee binds by the type. ⇒ **there is no collision left to rule on.**

⚠️ **and the four options this entry weighed all retire with it** — accept-the-opt-in, a partial
reversal, a hybrid two-site shape, and a plan-time warn. each existed only to recover a guarantee the
field now carries directly. the shapes are kept in `../archive/shapes-considered-and-rejected.md`.

## .what it is worth keeping for

1. 🔴 **a verdict's blast radius reaches forks it never mentions.** F10 and F11 were ruled in the same
   breath and nobody walked the interaction; it surfaced in a closure sweep, days later.
   ⇒ *when a verdict lands, grep the other entries for the premise it just moved.*
2. **it was the one fork on this route a rule genuinely did not settle** —
   `rule.require.symmetry-with-peer-resources` and `rule.require.safe-by-default` pulled opposite
   ways, and the council's own two verdicts were the two sides. that is the discriminator F9's entry
   names for real council work, and it held.
3. 🔴 **it was found because the seven rule-answered entries were closed first.** *a sweep that
   removes the noise is what makes the signal visible.*

## .see also

- `F10` — the verdict that removed the field, and the reversal that restored it
- `F11` — the guarantee that now binds again
- `F14` — the one fork that IS open
- `../appendix/how-the-shape-was-reached.md` — the road, and the detect-the-override design F13 forced
