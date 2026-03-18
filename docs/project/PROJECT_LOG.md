# Project Log

## 2026-03-18

- Built `myvoice` CLI tool from scratch, extracted from mdv8's `scripts/humanize-posts.ts`. Global install via `npm link`. Repo at github.com/mattdowney/myvoice
- Created `/myvoice` skillshare skill that dispatches a dedicated subagent for rewrites (uses Claude Code plan, no API calls)
- Default output writes `.voice.md` sibling file for review; `--in-place` to overwrite, `-o` for custom path, stdin goes to stdout
- Default model is Opus (not Sonnet). API key loaded from `~/.config/anthropic/.env` as fallback for CLI
- Word count validation tightened to 75-120% (was 50-150%) to prevent over-cutting
- **Decision:** Skill uses subagent (Agent tool) instead of direct rewrite or CLI invocation. Subagent gets focused context for the rewrite task only, producing higher quality (4.5/5) vs direct skill rewrite (3.5/5). CLI still exists for terminal use via Anthropic API.
- **Decision:** `.voice.md` sibling file as default output. Gives a review step before overwriting. Apply by moving the file over the original. `.voice.md` added to mdv8's `.gitignore`.
- **Learned:** Claude Code's Bash tool doesn't source `~/.zshrc`, and the Anthropic API key was in `.env.local` not zshrc. Created `~/.config/anthropic/.env` as a central, project-agnostic key store that the CLI checks as fallback.
- **Learned:** When Claude Code rewrites inline (skill v1), it splits attention between conversation management and rewriting, producing weaker output. Dispatching a subagent with the sole task of rewriting matches CLI quality.
- **Watch:** CLI's "The good news?" pattern — Opus has a habit of using rhetorical fragment questions (`Statement. Question? Answer.`) even though the prompt explicitly forbids them. Worth monitoring across runs.
- **Watch:** Subagent rewrites still lean more "you" voice than first-person "I" compared to CLI. The prompt says "Write as Matt, not as a teacher addressing you" but it doesn't fully stick. May need stronger examples in the prompt.
- **Next:** Test `/myvoice` end-to-end in a fresh Claude Code session to confirm the subagent dispatch, `.voice.md` creation, review, and apply workflow all work as expected. Consider adding a `--apply` flag to CLI that replaces original from existing `.voice.md`.
