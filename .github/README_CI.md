# Github CI/CD

> CI/CD overview for `bull-board-docker`. Workflows live under [`.github/workflows/`](./workflows).

## Workflows

| Workflow                                               | Triggers                                                    | Purpose                                                                                  |
|--------------------------------------------------------|-------------------------------------------------------------|------------------------------------------------------------------------------------------|
| [`pull-request.yml`](./workflows/pull-request.yml)     | `pull_request` on `master`, `workflow_call`                 | Matrix job running `lint` (oxlint), `format` (oxfmt) and `test:coverage` in parallel; the `test` leg also publishes a coverage report and artifact. |
| [`docker-publish.yml`](./workflows/docker-publish.yml) | `push` on tags `v*.*.*`, `pull_request` on `master`, manual | Build multi-arch Docker image (`linux/amd64,linux/arm64`) and push to Docker Hub on tag. |
| [`release.yml`](./workflows/release.yml)               | `push` on `master`, manual                                  | Run `semantic-release` to cut a new version and Github release.                          |
| [`renovate.yml`](./workflows/renovate.yml)             | Cron `00 1 * * 1` (Mondays 01:00 UTC), manual               | Self-hosted Renovate run to open dependency-update PRs.                                  |

## Dependencies

### Github

- [actions/checkout@v6](https://github.com/actions/checkout)
- [actions/setup-node@v6](https://github.com/actions/setup-node)
- [actions/upload-artifact@v7](https://github.com/actions/upload-artifact)

### Docker

- [docker/setup-qemu-action@v4](https://github.com/docker/setup-qemu-action)
- [docker/setup-buildx-action@v4](https://github.com/docker/setup-buildx-action)
- [docker/login-action@v4](https://github.com/docker/login-action)
- [docker/metadata-action@v6](https://github.com/docker/metadata-action)
- [docker/build-push-action@v7](https://github.com/docker/build-push-action)

### Others

- [davelosert/vitest-coverage-report-action@v2](https://github.com/davelosert/vitest-coverage-report-action)
- [renovatebot/github-action@v46.1.13](https://github.com/renovatebot/github-action)

## Secrets

| Name              | Used by              | Description                                                                   |
|-------------------|----------------------|-------------------------------------------------------------------------------|
| `DOCKERHUB_TOKEN` | `docker-publish.yml` | Docker Hub access token for `venatum` to push the `venatum/bull-board` image. |
| `SEMANTIC_TOKEN`  | `release.yml`        | GitHub token used by `semantic-release` to create tags and releases.          |
| `RENOVATE_TOKEN`  | `renovate.yml`       | GitHub token used by the self-hosted Renovate run to open PRs.                |

## Runners

- `ubuntu-latest` (public repository): 4 CPU - 16 GB RAM - 14 GB SSD

[Source: Github](https://docs.github.com/en/actions/using-github-hosted-runners/using-github-hosted-runners/about-github-hosted-runners#standard-github-hosted-runners-for-public-repositories)
