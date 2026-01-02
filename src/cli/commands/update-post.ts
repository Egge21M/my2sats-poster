import { Command } from "commander";
import { getPublicKey } from "nostr-tools/pure";
import { config } from "../config";
import { getSecretKey, createSignFunction } from "../crypto";
import { updatePost as apiUpdatePost } from "../api-client";
import { FileNotFoundError, handleError } from "../errors";
import { type UpdatePayload, type UpdatePostOptions } from "../types";
import { parseFrontmatter, processImages, getBasePath } from "../utils";

async function updatePost(
  slug: string,
  options: UpdatePostOptions,
): Promise<void> {
  const payload: UpdatePayload = {};
  let basePath = ".";
  let contentFromFile: string | undefined;
  let featuredImageFromFile: string | undefined;

  // If a file is provided, read from it
  if (options.file) {
    const file = Bun.file(options.file);
    if (!(await file.exists())) {
      throw new FileNotFoundError(options.file);
    }

    const markdown = await file.text();
    const { frontmatter, content } = parseFrontmatter(markdown);

    if (frontmatter.slug) payload.slug = frontmatter.slug;
    if (frontmatter.title) payload.title = frontmatter.title;
    if (frontmatter.author) payload.author = frontmatter.author;
    if (frontmatter.excerpt) payload.excerpt = frontmatter.excerpt;
    if (frontmatter.featured_image) {
      featuredImageFromFile = frontmatter.featured_image;
    }
    if (frontmatter.tags) payload.tags = frontmatter.tags;
    if (content) {
      contentFromFile = content;
    }

    basePath = getBasePath(options.file);
  }

  // CLI options override file content
  if (options.newSlug) payload.slug = options.newSlug;
  if (options.title) payload.title = options.title;
  if (options.content) payload.content = options.content;
  if (options.excerpt) payload.excerpt = options.excerpt;
  if (options.featuredImage) featuredImageFromFile = options.featuredImage;
  if (options.author) payload.author = options.author;
  if (options.tags) {
    payload.tags = options.tags.split(",").map((t) => t.trim());
  }

  // Check if there's anything to update
  const hasContentOrImages = contentFromFile || featuredImageFromFile;
  if (Object.keys(payload).length === 0 && !hasContentOrImages) {
    throw new Error(
      "No updates provided. Use --file or field options (--title, --content, etc.)",
    );
  }

  // Get secret key and derive public key
  const secretKey = await getSecretKey(options.keyfile);
  const pubkey = getPublicKey(secretKey);

  console.log(`Using pubkey: ${pubkey}`);

  // Create sign function for NIP-98
  const sign = createSignFunction(secretKey);

  // Process and upload any local images
  if (contentFromFile || featuredImageFromFile) {
    const { content: processedContent, featuredImageUrl } = await processImages(
      contentFromFile ?? "",
      featuredImageFromFile,
      basePath,
      options.api,
      sign,
    );

    if (contentFromFile) {
      payload.content = processedContent;
    }
    if (featuredImageFromFile) {
      payload.featured_image = featuredImageUrl;
    }
  }

  // Make API request
  const result = await apiUpdatePost(slug, payload, sign, options.api);
  console.log("Post updated successfully:");
  console.log(JSON.stringify(result, null, 2));
}

export const updatePostCommand = new Command("update")
  .description("Update an existing post")
  .argument("<slug>", "Slug of the post to update")
  .option(
    "-k, --keyfile <path>",
    "Path to the encrypted key file",
    config.keyfilePath,
  )
  .option("-a, --api <url>", "API base URL", config.apiUrl)
  .option("-f, --file <path>", "Path to markdown file with updated content")
  .option("-t, --title <title>", "New title")
  .option("-c, --content <content>", "New content (markdown)")
  .option("-e, --excerpt <excerpt>", "New excerpt")
  .option("-i, --featured-image <path>", "New featured image (local path or URL)")
  .option("--author <author>", "New author")
  .option("--tags <tags>", "New tags (comma-separated)")
  .option("-s, --new-slug <slug>", "New slug (rename the post)")
  .action(async (slug: string, options: UpdatePostOptions) => {
    try {
      await updatePost(slug, options);
    } catch (error) {
      handleError(error);
    }
  });
