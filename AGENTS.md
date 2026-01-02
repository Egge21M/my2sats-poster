# AGENTS.md - Coding Agent Instructions

This document provides instructions for AI coding agents working in this repository.

## Project Overview

**my2sats-poster** is a CLI tool for posting to my2sats using Nostr authentication.
Built with Bun and TypeScript, it uses Commander.js for CLI parsing and nostr-tools
for NIP-19, NIP-49, and NIP-98 protocol support.

## Build, Run, and Test Commands

### Runtime

Use Bun exclusively. Do NOT use Node.js, npm, yarn, or pnpm.

```bash
bun install              # Install dependencies
bun run start            # Run the CLI
bun run store-key        # Store encrypted Nostr key
bun run post             # Create a post
```

### Testing

```bash
bun test                          # Run all tests
bun test path/to/file.test.ts     # Run a single test file
bun test --grep "pattern"         # Run tests matching a pattern
bun test --watch                  # Watch mode
```

Test files use `.test.ts` suffix and import from `bun:test`:

```ts
import { test, expect, describe, beforeEach } from "bun:test";

describe("feature", () => {
  test("should work", () => {
    expect(true).toBe(true);
  });
});
```

### Linting and Formatting

No linter or formatter is configured. Follow the existing code style.

## Code Style Guidelines

### Imports

- Use named imports: `import { Command } from "commander"`
- Use `type` keyword for type-only imports: `import { type EventTemplate } from "nostr-tools/pure"`
- Import from subpaths when available: `nostr-tools/nip98`, `nostr-tools/nip49`
- Do NOT include `.ts` extensions in imports
- Group imports: external packages first, then local modules

### Formatting

- 2-space indentation
- Double quotes for strings
- Semicolons required
- Trailing commas in multiline structures
- Max line length: ~100 characters (soft limit)

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `create-post.ts`, `store-key.ts` |
| Functions | camelCase | `parseFrontmatter`, `getSecretKey` |
| Interfaces | PascalCase | `PostFrontmatter`, `PostPayload` |
| Constants | SCREAMING_SNAKE_CASE | `API_URL`, `KEYFILE_PATH` |
| Command exports | camelCase + "Command" | `createPostCommand`, `storeKeyCommand` |

### Types

- Define explicit interfaces for data structures
- Use `Uint8Array` for binary data (crypto keys)
- Mark optional properties with `?`
- Use non-null assertion `!` only after validation

### TypeScript Configuration

Strict mode is enabled with: `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitOverride`

### Error Handling

```ts
try {
  await doSomething();
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
```

### Bun-Specific APIs

Prefer Bun's built-in APIs over Node.js equivalents:

```ts
const file = Bun.file(path);
if (await file.exists()) {
  const content = await file.text();
}
await Bun.write(file, content);
```

Do NOT use: `fs.readFile/writeFile`, `dotenv`, `express`, `better-sqlite3`, `ws`

## Project Structure

```
my2sats-poster/
├── src/cli/
│   ├── index.ts              # CLI entry point
│   └── commands/
│       ├── create-post.ts    # Post creation command
│       └── store-key.ts      # Key storage command
├── package.json
├── tsconfig.json
└── AGENTS.md
```

## Configuration

Configuration is loaded with the following priority (highest to lowest):
1. Environment variables
2. Config file (`~/.my2sats/config.json`)
3. Default values

| Setting | Env Var | Default | Description |
|---------|---------|---------|-------------|
| `apiUrl` | `API_URL` | `http://localhost:3000` | my2sats API endpoint |
| `keyfilePath` | `KEYFILE_PATH` | `~/.my2sats/nostr.key` | Path to encrypted Nostr key |
| `maxImageSize` | - | `5242880` (5MB) | Maximum image upload size |
| `allowedImageTypes` | - | `["image/jpeg", "image/png", "image/webp", "image/gif"]` | Allowed image MIME types |

Environment variables are loaded automatically from `.env` by Bun.

## Dependencies

- `commander` - CLI framework
- `nostr-tools` - Nostr protocol (NIP-19, NIP-49, NIP-98)
- `prompts` - Interactive CLI prompts

## Common Patterns

### CLI Command Structure

```ts
import { Command } from "commander";

const DEFAULT_VALUE = process.env.MY_VAR ?? "default";

export const myCommand = new Command("command-name")
  .description("What this command does")
  .argument("<required>", "Required argument description")
  .option("-f, --flag <value>", "Option description", DEFAULT_VALUE)
  .action(async (required: string, options: { flag: string }) => {
    try {
      await doWork(required, options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
```

### Validation Pattern

```ts
const missingFields: string[] = [];
if (!data.field1) missingFields.push("field1");
if (!data.field2) missingFields.push("field2");

if (missingFields.length > 0) {
  throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
}
```

## Files to Never Commit

- `.env*` files (contain secrets)
- `.nostr-key` (encrypted private key)
- `node_modules/`, `dist/`, `out/`, `coverage/`
