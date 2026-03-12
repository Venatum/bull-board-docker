# Contributing

## Commit format

This project uses [Conventional Commits](https://www.conventionalcommits.org/). This is required because [semantic-release](https://github.com/semantic-release/semantic-release) parses commit messages to determine version bumps and generate changelogs automatically.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Allowed types

| Type       | Description                                                          |
|------------|----------------------------------------------------------------------|
| `feat`     | A new feature (triggers a **minor** release)                         |
| `fix`      | A bug fix (triggers a **patch** release)                             |
| `chore`    | Maintenance tasks (no release)                                       |
| `ci`       | CI/CD changes (no release)                                           |
| `docs`     | Documentation only (no release)                                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature (no release) |
| `test`     | Adding or updating tests (no release)                                |
| `perf`     | Performance improvement (triggers a **patch** release)               |

Add `!` after the type/scope for breaking changes (triggers a **major** release):

```
feat!: remove support for Bull v3
```

### Examples

```
feat(auth): add optional OIDC login
fix: handle missing Redis password in sentinel mode
chore(deps): update bull-board to 6.21.0
ci(actions): switch to Node.js 24 runner
docs: add TLS configuration examples to README
refactor: extract Redis config builder into separate module
test: add coverage for sentinel failover
perf: cache Redis key scan results
```

## Workflow

1. Fork the repository
2. Create a feature branch from `master` (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run `npm test` to ensure tests pass
5. Commit using the conventional commit format above
6. Push to your fork and open a Pull Request against `master`
