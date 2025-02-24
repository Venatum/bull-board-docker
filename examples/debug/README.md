# Debug

## Fail to clean jobScheduler

### Problem

When you try to clean the jobScheduler, you may encounter the following error:

> PUT http://localhost:3000/api/queues/test-queue/clean/failed

```json
{
	"error": "Internal server error",
	"message": "ERR Lua redis lib command arguments must be strings or integers script: 90f9bc7f0a071af56f13afe3aaac908d529fa5b3, on @user_script:54."
}
```

## Tests

1. docker compose down -v
2. docker compose up bulboard
3. Setup type and number of jobs
4. npm run start
5. Open http://localhost:3000
6. Going to "failed" tab then click on `Clean All`

| BullBoard version        | BullBoard | BullMQ  | 1 job | 100 jobs | 1 jobScheduler | 100 jobScheduler |
|--------------------------|:----------|:--------|:-----:|:--------:|:--------------:|:----------------:|
| venatum/bull-board:2.2.2 | v6.7.9    | v5.41.5 |   ✅   |    ✅     |       ❌        |        ❌         |
| venatum/bull-board:2.2.1 | v6.7.8    | v5.41.3 |   ✅   |    ✅     |       ❌        |        ❌         |
| venatum/bull-board:2.2.0 | v6.7.7    | v5.40.2 |   ✅   |    ✅     |       ✅        |        ✅         |
| venatum/bull-board:2.1.8 | v6.7.7    | v5.40.2 |   ✅   |    ✅     |       ✅        |        ✅         |


