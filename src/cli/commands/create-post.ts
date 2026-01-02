import { Command } from "commander";
import { getPublicKey } from "nostr-tools/pure";
import { config } from "../config";
import { getSecretKey, createSignFunction } from "../crypto";
import { createPost as apiCreatePost } from "../api-client";
import { FileNotFoundError, ValidationError, handleError } from "../errors";
import { type PostPayload, type CreatePostOptions } from "../types";
import { parseFrontmatter, processImages, getBasePath } from "../utils";

async function createPost(
  filePath: string,
  options: CreatePostOptions,
): Promise<void> {
  // Read markdown file
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new FileNotFoundError(filePath);
  }

  const markdown = await file.text();
  const { frontmatter, content } = parseFrontmatter(markdown);

  // Validate required fields
  const missingFields: string[] = [];
  if (!frontmatter.slug) missingFields.push("slug");
  if (!frontmatter.title) missingFields.push("title");
  if (!frontmatter.author) missingFields.push("author");

  if (missingFields.length > 0) {
    throw new ValidationError(missingFields);
  }

  const payload: PostPayload = {
    slug: frontmatter.slug!,
    title: frontmatter.title!,
    content,
    author: frontmatter.author!,
    excerpt: frontmatter.excerpt,
    featured_image: frontmatter.featured_image,
    tags: frontmatter.tags,
  };

  // Get secret key and derive public key
  const secretKey = await getSecretKey(options.keyfile);
  const pubkey = getPublicKey(secretKey);

  console.log(`Using pubkey: ${pubkey}`);

  // Create sign function for NIP-98
  const sign = createSignFunction(secretKey);

  // Determine base path for resolving relative image paths
  const basePath = getBasePath(filePath);

  // Process and upload any local images
  const { content: processedContent, featuredImageUrl } = await processImages(
    content,
    frontmatter.featured_image,
    basePath,
    options.api,
    sign,
  );

  // Update payload with processed content and uploaded image URLs
  payload.content = processedContent;
  payload.featured_image = featuredImageUrl;

  // Make API request
  const result = await apiCreatePost(payload, sign, options.api);
  console.log("Post created successfully:");
  console.log(JSON.stringify(result, null, 2));
}

export const createPostCommand = new Command("post")
  .description("Create a new post from a markdown file")
  .argument("<file>", "Path to markdown file with frontmatter")
  .option(
    "-k, --keyfile <path>",
    "Path to the encrypted key file",
    config.keyfilePath,
  )
  .option("-a, --api <url>", "API base URL", config.apiUrl)
  .action(async (file: string, options: CreatePostOptions) => {
    try {
      await createPost(file, options);
    } catch (error) {
      handleError(error);
    }
  });
