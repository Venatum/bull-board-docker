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

### Dependency update commits

When the change is a dependency bump, name the packages and their target
versions in the subject so the message reflects the actual releases.

- Use `chore(deps)` when bumping packages
- List packages as `<name> to <version>`, comma-separated; join the last with
  `and`. If there are many, end with `and related packages`.
- Read the new versions from `package.json` / `package-lock.json` rather than
  guessing.

Examples:

- `chore(deps): update @bull-board/api and @bull-board/express to 7.2.1`
- `chore(deps): update dependencies bullmq to 5.78.0, ioredis to 5.11.1, morgan to 1.11.0 and related packages`

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
