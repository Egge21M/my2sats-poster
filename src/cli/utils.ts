/**
 * General utilities for the my2sats CLI.
 */

import { type PostFrontmatter, type ImageReference, type SignFunction } from "./types";
import { validateImageFile, uploadImage } from "./api-client";

/**
 * Parses YAML-like frontmatter from a markdown string.
 */
export function parseFrontmatter(markdown: string): {
  frontmatter: PostFrontmatter;
  content: string;
} {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { frontmatter: {}, content: markdown };
  }

  const frontmatterStr = frontmatterMatch[1];
  const content = frontmatterMatch[2];

  if (!frontmatterStr || content === undefined) {
    return { frontmatter: {}, content: markdown };
  }

  const frontmatter: PostFrontmatter = {};

  for (const line of frontmatterStr.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Handle arrays (tags)
    if (value.startsWith("[") && value.endsWith("]")) {
      const arrayContent = value.slice(1, -1);
      const items = arrayContent
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      setFrontmatterField(frontmatter, key, items);
    } else {
      // Remove surrounding quotes if present
      value = value.replace(/^["']|["']$/g, "");
      setFrontmatterField(frontmatter, key, value);
    }
  }

  return { frontmatter, content: content.trim() };
}

/**
 * Safely sets a frontmatter field.
 */
function setFrontmatterField(
  frontmatter: PostFrontmatter,
  key: string,
  value: string | string[],
): void {
  const validKeys: (keyof PostFrontmatter)[] = [
    "slug",
    "title",
    "author",
    "excerpt",
    "featured_image",
    "tags",
  ];

  if (validKeys.includes(key as keyof PostFrontmatter)) {
    (frontmatter as Record<string, unknown>)[key] = value;
  }
}

/**
 * Checks if a path is a local file path (not a URL).
 */
export function isLocalPath(value: string): boolean {
  return !value.startsWith("http://") && !value.startsWith("https://");
}

/**
 * Extracts image references from markdown content.
 */
export function parseImageReferences(content: string): ImageReference[] {
  const images: ImageReference[] = [];

  // Match markdown images: ![alt](path) or ![alt](path "title")
  const markdownImageRegex = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = markdownImageRegex.exec(content)) !== null) {
    const path = match[1];
    if (path && isLocalPath(path)) {
      images.push({ original: match[0], path });
    }
  }

  // Match HTML img tags: <img src="path" /> or <img src='path' />
  const htmlImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi;
  while ((match = htmlImageRegex.exec(content)) !== null) {
    const path = match[1];
    if (path && isLocalPath(path)) {
      images.push({ original: match[0], path });
    }
  }

  return images;
}

/**
 * Extracts the directory path from a file path.
 */
export function getBasePath(filePath: string): string {
  return filePath.includes("/")
    ? filePath.slice(0, filePath.lastIndexOf("/"))
    : ".";
}

/**
 * Processes and uploads local images in content.
 * Returns the processed content with local paths replaced by uploaded URLs.
 */
export async function processImages(
  content: string,
  featuredImage: string | undefined,
  basePath: string,
  apiUrl: string,
  sign: SignFunction,
): Promise<{ content: string; featuredImageUrl: string | undefined }> {
  const imageRefs = parseImageReferences(content);
  let processedContent = content;
  let featuredImageUrl = featuredImage;

  // Collect all unique local image paths to upload
  const pathsToUpload = new Map<string, string>(); // path -> uploaded URL

  // Add content images
  for (const ref of imageRefs) {
    if (!pathsToUpload.has(ref.path)) {
      pathsToUpload.set(ref.path, "");
    }
  }

  // Add featured image if it's a local path
  if (featuredImage && isLocalPath(featuredImage)) {
    if (!pathsToUpload.has(featuredImage)) {
      pathsToUpload.set(featuredImage, "");
    }
  }

  if (pathsToUpload.size === 0) {
    return { content, featuredImageUrl };
  }

  console.log(`Found ${pathsToUpload.size} image(s) to upload...`);

  // Upload each unique image
  for (const [localPath] of pathsToUpload) {
    const { file, fullPath } = await validateImageFile(localPath, basePath);
    console.log(`  Uploading: ${fullPath}`);

    const result = await uploadImage(file, sign, apiUrl);
    pathsToUpload.set(localPath, result.url);
    console.log(`  -> ${result.url}`);
  }

  // Replace paths in content
  for (const ref of imageRefs) {
    const uploadedUrl = pathsToUpload.get(ref.path);
    if (uploadedUrl) {
      const newRef = ref.original.replace(ref.path, uploadedUrl);
      processedContent = processedContent.replace(ref.original, newRef);
    }
  }

  // Update featured image URL if it was uploaded
  if (featuredImage && isLocalPath(featuredImage)) {
    featuredImageUrl = pathsToUpload.get(featuredImage);
  }

  return { content: processedContent, featuredImageUrl };
}
