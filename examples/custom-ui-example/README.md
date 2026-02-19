# Custom UI example

Example that customizes the bull-board UI with environment variables.

What it does:
- Starts Redis (standalone)
- Starts bull-board with custom UI settings

Customizations used:
- `BULL_BOARD_TITLE`
- `BULL_BOARD_LOGO_PATH`
- `BULL_BOARD_FAVICON`
- `BULL_BOARD_LOCALE`

Run:
```
  docker compose up
```

Open:
- http://localhost:3000

Notes:
- The logo and favicon are pulled from a public URL.
- Replace the values to match your branding.
