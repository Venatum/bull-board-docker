# /commit

Review changes and create a conventional commit.

## Steps

### Step 1: Code review

Run `git diff HEAD` and review the staged/unstaged changes.
Check for:

- Any obvious issues or mistakes
- Project conventions (ES modules, npm, no TypeScript)
- Sensitive data (secrets, tokens, credentials)

If critical issues are found, stop and report them. Do not commit broken code.

### Step 2: Create the commit

1. Run `git status` to see what files are changed
2. Stage relevant files with `git add <files>` (never `git add .` blindly)
3. Write a Conventional Commits message:
   - Format: `type(scope): short description`
   - Types: `feat`, `fix`, `chore`, `ci`, `docs`, `test`, `refactor`, `perf`, `build`
   - Keep the subject line under 72 characters
   - Add a body if the change needs context
4. Commit: `git commit -m "..."`

### Conventional Commits types

- `feat`: new feature
- `fix`: bug fix
- `chore`: dependency updates, config, maintenance
- `ci`: CI/CD changes
- `docs`: documentation only
- `test`: adding or updating tests
- `refactor`: code change that neither fixes a bug nor adds a feature
- `perf`: performance improvement
- `build`: build system or Docker changes

## Allowed tools

- Bash(git:\*)
