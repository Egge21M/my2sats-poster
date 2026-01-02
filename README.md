# my2sats-poster

A CLI tool for posting to my2sats using Nostr authentication. Built with Bun and TypeScript, featuring NIP-19, NIP-49, and NIP-98 protocol support.

## Requirements

- [Bun](https://bun.sh) v1.0+

## Installation

```bash
bun install
```

## Quick Start

1. Store your Nostr secret key (encrypted with NIP-49):

```bash
bun run store-key
```

2. Create a post from a markdown file:

```bash
bun run post path/to/post.md
```

## Commands

### `store-key` - Store Nostr Secret Key

Encrypts and stores your Nostr secret key using NIP-49.

```bash
bun run store-key [nsec]
```

**Arguments:**
- `[nsec]` - Your nsec or hex secret key (will prompt if not provided)

**Options:**
- `-k, --keyfile <path>` - Path to store the encrypted key (default: `~/.my2sats/nostr.key`)

### `post` - Create a Post

Creates a new post from a markdown file with frontmatter.

```bash
bun run post <file>
```

**Arguments:**
- `<file>` - Path to markdown file with frontmatter

**Options:**
- `-k, --keyfile <path>` - Path to the encrypted key file
- `-a, --api <url>` - API base URL

**Markdown Format:**

```markdown
---
slug: my-post-slug
title: My Post Title
author: Author Name
excerpt: Optional excerpt
featured_image: ./image.jpg
tags:
  - tag1
  - tag2
---

Your markdown content here...
```

Required frontmatter fields: `slug`, `title`, `author`

### `update` - Update a Post

Updates an existing post by slug.

```bash
bun run update <slug> [options]
```

**Arguments:**
- `<slug>` - Slug of the post to update

**Options:**
- `-k, --keyfile <path>` - Path to the encrypted key file
- `-a, --api <url>` - API base URL
- `-f, --file <path>` - Path to markdown file with updated content
- `-t, --title <title>` - New title
- `-c, --content <content>` - New content (markdown)
- `-e, --excerpt <excerpt>` - New excerpt
- `-i, --featured-image <path>` - New featured image (local path or URL)
- `--author <author>` - New author
- `--tags <tags>` - New tags (comma-separated)
- `-s, --new-slug <slug>` - New slug (rename the post)

### `delete` - Delete a Post

Deletes an existing post by slug.

```bash
bun run delete <slug>
```

**Arguments:**
- `<slug>` - Slug of the post to delete

**Options:**
- `-k, --keyfile <path>` - Path to the encrypted key file
- `-a, --api <url>` - API base URL
- `-f, --force` - Skip confirmation prompt

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

### Example Config File

```json
{
  "apiUrl": "https://api.my2sats.com",
  "keyfilePath": "~/.my2sats/nostr.key"
}
```

## Development

```bash
bun run start            # Run the CLI
bun test                 # Run all tests
bun test --watch         # Run tests in watch mode
```

## Dependencies

- [commander](https://github.com/tj/commander.js) - CLI framework
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) - Nostr protocol (NIP-19, NIP-49, NIP-98)
- [prompts](https://github.com/terkelg/prompts) - Interactive CLI prompts
