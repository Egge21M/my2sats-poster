/**
 * Consolidated type definitions for the my2sats CLI.
 */

import { type finalizeEvent, type EventTemplate } from "nostr-tools/pure";

/**
 * Frontmatter parsed from a markdown file.
 */
export interface PostFrontmatter {
  slug?: string;
  title?: string;
  author?: string;
  excerpt?: string;
  featured_image?: string;
  tags?: string[];
}

/**
 * Payload for creating a new post.
 */
export interface PostPayload {
  slug: string;
  title: string;
  content: string;
  author: string;
  excerpt?: string;
  featured_image?: string;
  tags?: string[];
}

/**
 * Payload for updating an existing post.
 */
export interface UpdatePayload {
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  author?: string;
  tags?: string[];
}

/**
 * Reference to an image found in markdown content.
 */
export interface ImageReference {
  /** The full match (e.g., "![alt](./image.png)") */
  original: string;
  /** Just the path (e.g., "./image.png") */
  path: string;
}

/**
 * Response from the image upload API.
 */
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

/**
 * Function type for signing Nostr events (NIP-98).
 */
export type SignFunction = (
  event: EventTemplate,
) => Promise<ReturnType<typeof finalizeEvent>>;

/**
 * Common CLI options shared across commands.
 */
export interface CommonOptions {
  keyfile: string;
  api: string;
}

/**
 * Options for the create-post command.
 */
export interface CreatePostOptions extends CommonOptions {}

/**
 * Options for the update-post command.
 */
export interface UpdatePostOptions extends CommonOptions {
  file?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
  author?: string;
  tags?: string;
  newSlug?: string;
}

/**
 * Options for the delete-post command.
 */
export interface DeletePostOptions extends CommonOptions {
  force: boolean;
}
