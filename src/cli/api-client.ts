/**
 * API client abstraction for my2sats API.
 */

import { getToken } from "nostr-tools/nip98";
import { config } from "./config";
import { ApiError, ImageValidationError } from "./errors";
import {
  type SignFunction,
  type PostPayload,
  type UpdatePayload,
  type UploadResponse,
} from "./types";

/**
 * Creates a new post.
 */
export async function createPost(
  payload: PostPayload,
  sign: SignFunction,
  apiUrl: string = config.apiUrl,
): Promise<unknown> {
  const url = `${apiUrl}/api/posts`;
  const token = await getToken(url, "POST", sign, true);

  console.log(`Posting to ${url}...`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText);
  }

  return response.json();
}

/**
 * Updates an existing post.
 */
export async function updatePost(
  slug: string,
  payload: UpdatePayload,
  sign: SignFunction,
  apiUrl: string = config.apiUrl,
): Promise<unknown> {
  const url = `${apiUrl}/api/posts/${slug}`;
  const token = await getToken(url, "PUT", sign, true);

  console.log(`Updating post at ${url}...`);
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText);
  }

  return response.json();
}

/**
 * Deletes an existing post.
 */
export async function deletePost(
  slug: string,
  sign: SignFunction,
  apiUrl: string = config.apiUrl,
): Promise<unknown> {
  const url = `${apiUrl}/api/posts/${slug}`;
  const token = await getToken(url, "DELETE", sign, true);

  console.log(`Deleting post at ${url}...`);
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: token,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText);
  }

  return response.json();
}

/**
 * Validates an image file before upload.
 */
export async function validateImageFile(
  filePath: string,
  basePath: string,
): Promise<{ file: ReturnType<typeof Bun.file>; fullPath: string }> {
  // Resolve path relative to the markdown file's directory
  const fullPath = filePath.startsWith("/")
    ? filePath
    : `${basePath}/${filePath}`;

  const file = Bun.file(fullPath);

  if (!(await file.exists())) {
    throw new ImageValidationError(`Image not found: ${fullPath}`);
  }

  const size = file.size;
  if (size > config.maxImageSize) {
    throw new ImageValidationError(
      `Image exceeds maximum size of 5MB: ${fullPath} (${(size / 1024 / 1024).toFixed(2)}MB)`,
    );
  }

  const type = file.type;
  if (!config.allowedImageTypes.includes(type as typeof config.allowedImageTypes[number])) {
    throw new ImageValidationError(
      `Invalid image type for ${fullPath}: ${type}. Allowed types: ${config.allowedImageTypes.join(", ")}`,
    );
  }

  return { file, fullPath };
}

/**
 * Uploads an image to the API.
 */
export async function uploadImage(
  file: ReturnType<typeof Bun.file>,
  sign: SignFunction,
  apiUrl: string = config.apiUrl,
): Promise<UploadResponse> {
  const url = `${apiUrl}/api/uploads`;
  const token = await getToken(url, "POST", sign, true);

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, `Image upload failed: ${errorText}`);
  }

  return response.json() as Promise<UploadResponse>;
}
