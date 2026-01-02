import { test, expect, describe } from "bun:test";
import {
  KeyfileNotFoundError,
  InvalidKeyfileError,
  DecryptionError,
  InvalidSecretKeyError,
  ApiError,
  ValidationError,
  FileNotFoundError,
  ImageValidationError,
  AbortedError,
  formatError,
} from "./errors";

describe("Custom Error Classes", () => {
  test("KeyfileNotFoundError has correct message and name", () => {
    const error = new KeyfileNotFoundError("/path/to/key");

    expect(error.name).toBe("KeyfileNotFoundError");
    expect(error.message).toBe(
      "Keyfile not found at /path/to/key. Run 'my2sats store-key' first to store your key.",
    );
    expect(error).toBeInstanceOf(Error);
  });

  test("InvalidKeyfileError has correct message and name", () => {
    const error = new InvalidKeyfileError();

    expect(error.name).toBe("InvalidKeyfileError");
    expect(error.message).toBe("Invalid keyfile format. Expected ncryptsec.");
  });

  test("InvalidKeyfileError accepts custom message", () => {
    const error = new InvalidKeyfileError("Custom message");

    expect(error.message).toBe("Custom message");
  });

  test("DecryptionError has correct message and name", () => {
    const error = new DecryptionError();

    expect(error.name).toBe("DecryptionError");
    expect(error.message).toBe("Failed to decrypt key. Wrong password?");
  });

  test("InvalidSecretKeyError has correct message and name", () => {
    const error = new InvalidSecretKeyError();

    expect(error.name).toBe("InvalidSecretKeyError");
    expect(error.message).toBe(
      "Invalid secret key format. Expected nsec or 64-character hex string",
    );
  });

  test("ApiError includes status code", () => {
    const error = new ApiError(404, "Post not found");

    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(404);
    expect(error.message).toBe("API request failed (404): Post not found");
  });

  test("ValidationError includes fields", () => {
    const error = new ValidationError(["slug", "title", "author"]);

    expect(error.name).toBe("ValidationError");
    expect(error.fields).toEqual(["slug", "title", "author"]);
    expect(error.message).toBe("Missing required fields: slug, title, author");
  });

  test("FileNotFoundError has correct message", () => {
    const error = new FileNotFoundError("/path/to/file.md");

    expect(error.name).toBe("FileNotFoundError");
    expect(error.message).toBe("File not found: /path/to/file.md");
  });

  test("ImageValidationError has correct message", () => {
    const error = new ImageValidationError("Image too large: 10MB");

    expect(error.name).toBe("ImageValidationError");
    expect(error.message).toBe("Image too large: 10MB");
  });

  test("AbortedError has default message", () => {
    const error = new AbortedError();

    expect(error.name).toBe("AbortedError");
    expect(error.message).toBe("Operation aborted.");
  });

  test("AbortedError accepts custom message", () => {
    const error = new AbortedError("User cancelled");

    expect(error.message).toBe("User cancelled");
  });
});

describe("formatError", () => {
  test("formats Error instances", () => {
    const error = new Error("Something went wrong");
    expect(formatError(error)).toBe("Something went wrong");
  });

  test("formats custom error instances", () => {
    const error = new ApiError(500, "Internal error");
    expect(formatError(error)).toBe("API request failed (500): Internal error");
  });

  test("formats string values", () => {
    expect(formatError("string error")).toBe("string error");
  });

  test("formats number values", () => {
    expect(formatError(42)).toBe("42");
  });

  test("formats null values", () => {
    expect(formatError(null)).toBe("null");
  });

  test("formats undefined values", () => {
    expect(formatError(undefined)).toBe("undefined");
  });

  test("formats object values", () => {
    expect(formatError({ foo: "bar" })).toBe("[object Object]");
  });
});
