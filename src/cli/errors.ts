/**
 * Custom error classes for better error handling and testability.
 */

/**
 * Thrown when the keyfile is not found.
 */
export class KeyfileNotFoundError extends Error {
  constructor(path: string) {
    super(`Keyfile not found at ${path}. Run 'my2sats store-key' first to store your key.`);
    this.name = "KeyfileNotFoundError";
  }
}

/**
 * Thrown when the keyfile has an invalid format.
 */
export class InvalidKeyfileError extends Error {
  constructor(message = "Invalid keyfile format. Expected ncryptsec.") {
    super(message);
    this.name = "InvalidKeyfileError";
  }
}

/**
 * Thrown when key decryption fails.
 */
export class DecryptionError extends Error {
  constructor(message = "Failed to decrypt key. Wrong password?") {
    super(message);
    this.name = "DecryptionError";
  }
}

/**
 * Thrown when a secret key has an invalid format.
 */
export class InvalidSecretKeyError extends Error {
  constructor(message = "Invalid secret key format. Expected nsec or 64-character hex string") {
    super(message);
    this.name = "InvalidSecretKeyError";
  }
}

/**
 * Thrown when an API request fails.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(`API request failed (${status}): ${message}`);
    this.name = "ApiError";
  }
}

/**
 * Thrown when required fields are missing.
 */
export class ValidationError extends Error {
  constructor(public readonly fields: string[]) {
    super(`Missing required fields: ${fields.join(", ")}`);
    this.name = "ValidationError";
  }
}

/**
 * Thrown when a file is not found.
 */
export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = "FileNotFoundError";
  }
}

/**
 * Thrown when an image fails validation.
 */
export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/**
 * Thrown when user aborts an operation.
 */
export class AbortedError extends Error {
  constructor(message = "Operation aborted.") {
    super(message);
    this.name = "AbortedError";
  }
}

/**
 * Formats an error for CLI output.
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Handles an error by printing it and exiting.
 */
export function handleError(error: unknown): never {
  console.error("Error:", formatError(error));
  process.exit(1);
}
