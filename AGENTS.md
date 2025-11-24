# Agent Guidelines

Welcome! Please follow these instructions when contributing to this repository.

## Scope
This file applies to the entire repository unless a more specific `AGENTS.md` is added in a subdirectory.

## Development Practices
- Favor clear, concise documentation and comments that explain *why* decisions were made.
- Keep changes minimal and purposeful; avoid unrelated formatting edits.
- Prefer TypeScript typings that avoid `any` where practical.
- Assume I’m building production-quality code.
- Prefer explicit, readable code over clever one-liners.
- Avoid using any library that I didn’t explicitly mention.
- When something is ambiguous, state the assumption you’re making.
- Keep functions small and single-purpose.

## Testing
- Run relevant tests before opening a pull request. For Next.js code, prioritize `npm test` and `npm run lint` when applicable.
- Document any skipped tests in your summary.

## Pull Requests
- Summarize changes in bullet points.
- Note any user-facing impacts or visual changes.
