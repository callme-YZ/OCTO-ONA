# Bot Management CLI Commands

## Overview

The `octo-ona bot` command provides tools to manage bot ownership manually.

## Commands

### `bot assign <user_id> <bot_id>`

Assign a bot to a user.

**Usage:**
```bash
npx ts-node src/cli/index.ts bot assign <user_id> <bot_id> [options]
```

**Options:**
- `--source-id <id>` - Data source ID (auto-detected if not provided)
- `-v, --verbose` - Verbose output

**Example:**
```bash
npx ts-node src/cli/index.ts bot assign dmwork-octo:user123 dmwork-octo:bot456
```

**Output:**
```
✅ Bot assigned successfully
   User: dmwork-octo:user123
   Bot:  dmwork-octo:bot456
   Total bots owned by user: 3
```

---

### `bot list <user_id>`

List all bots owned by a user.

**Usage:**
```bash
npx ts-node src/cli/index.ts bot list <user_id> [options]
```

**Options:**
- `-v, --verbose` - Show assignment timestamps

**Example:**
```bash
npx ts-node src/cli/index.ts bot list dmwork-octo:user123
```

**Output:**
```
📋 Bots owned by dmwork-octo:user123:

  • dmwork-octo:bot456
    Name: My Helper Bot

  • dmwork-octo:bot789
    Name: Analytics Bot

Total: 2 bot(s)
```

---

### `bot show <bot_id>`

Show the owner of a bot.

**Usage:**
```bash
npx ts-node src/cli/index.ts bot show <bot_id> [options]
```

**Options:**
- `-v, --verbose` - Show assignment timestamps

**Example:**
```bash
npx ts-node src/cli/index.ts bot show dmwork-octo:bot456 -v
```

**Output:**
```
🤖 Bot: dmwork-octo:bot456
   Name: My Helper Bot
   Is Bot: Yes
   Owner: dmwork-octo:user123
   Owner Name: John Doe
   Assigned: 2026-04-01 15:30:00
   Updated: 2026-04-01 15:30:00
```

---

### `bot remove <user_id> <bot_id>`

Remove bot ownership.

**Usage:**
```bash
npx ts-node src/cli/index.ts bot remove <user_id> <bot_id>
```

**Example:**
```bash
npx ts-node src/cli/index.ts bot remove dmwork-octo:user123 dmwork-octo:bot456
```

**Output:**
```
✅ Bot ownership removed
   User: dmwork-octo:user123
   Bot:  dmwork-octo:bot456
```

---

### `bot import <csv_path>`

Batch import bot ownership from a CSV file.

**CSV Format:**
```csv
user_id,bot_id,source_id
dmwork-octo:user123,dmwork-octo:bot456,dmwork-octo
dmwork-octo:user123,dmwork-octo:bot789,dmwork-octo
dmwork-octo:user456,dmwork-octo:bot101,dmwork-octo
```

**Notes:**
- First line can be a header (will be auto-detected and skipped)
- `source_id` column is optional (will use `--source-id` option or auto-detect)

**Usage:**
```bash
npx ts-node src/cli/index.ts bot import ownership.csv [options]
```

**Options:**
- `--source-id <id>` - Default source ID for entries without one
- `-v, --verbose` - Verbose output

**Example:**
```bash
npx ts-node src/cli/index.ts bot import bot-ownership.csv --source-id dmwork-octo
```

**Output:**
```
📥 Importing from bot-ownership.csv...

✅ dmwork-octo:user123 → dmwork-octo:bot456
✅ dmwork-octo:user123 → dmwork-octo:bot789
❌ dmwork-octo:user999 → dmwork-octo:bot000: User not found

📊 Summary:
   Imported: 2
   Failed: 1
   Total: 3
```

---

## Error Handling

### User not found
```
Error: User not found: dmwork-octo:user999
```

**Solution:** Verify the user ID exists in the `users` table.

### Bot not found
```
Error: Bot not found: dmwork-octo:bot999
```

**Solution:** Verify the bot ID exists and `is_bot = 1` in the `users` table.

### Cannot assign bot to another bot
```
Error: Cannot assign bot to another bot: dmwork-octo:bot123
```

**Solution:** The user_id must be a regular user (`is_bot = 0`), not a bot.

### User is not a bot
```
Error: User is not a bot: dmwork-octo:user123
```

**Solution:** The bot_id must be a bot (`is_bot = 1`), not a regular user.

---

## Database Connection

The CLI uses the following environment variables for database connection:

- `DB_HOST` (default: `localhost`)
- `DB_USER` (default: `root`)
- `DB_PASSWORD` (default: empty)
- `DB_NAME` (default: `octo_ona`)

**Example:**
```bash
DB_HOST=localhost DB_USER=root DB_NAME=octo_ona \
  npx ts-node src/cli/index.ts bot list dmwork-octo:user123
```

---

## Related

- Issue #36: CLI commands for bot management
- Table: `user_bot_ownership`
- Migration: `v3-001-user-bot-ownership.sql`

---

**Last Updated:** 2026-04-01  
**Author:** Mayo
