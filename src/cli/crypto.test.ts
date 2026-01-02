import { test, expect, describe } from "bun:test";
import { parseSecretKey } from "./crypto";
import { InvalidSecretKeyError } from "./errors";

describe("parseSecretKey", () => {
  // Valid 64-character hex key for testing
  const validHexKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  test("parses valid hex secret key", () => {
    const result = parseSecretKey(validHexKey);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });

  test("parses hex key with uppercase letters", () => {
    const upperHex = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";
    const result = parseSecretKey(upperHex);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });

  test("trims whitespace from input", () => {
    const result = parseSecretKey(`  ${validHexKey}  `);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });

  test("throws InvalidSecretKeyError for short hex", () => {
    expect(() => parseSecretKey("0123456789abcdef")).toThrow(InvalidSecretKeyError);
  });

  test("throws InvalidSecretKeyError for long hex", () => {
    const longHex = validHexKey + "00";
    expect(() => parseSecretKey(longHex)).toThrow(InvalidSecretKeyError);
  });

  test("throws InvalidSecretKeyError for invalid characters", () => {
    const invalidHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg";
    expect(() => parseSecretKey(invalidHex)).toThrow(InvalidSecretKeyError);
  });

  test("throws InvalidSecretKeyError for empty string", () => {
    expect(() => parseSecretKey("")).toThrow(InvalidSecretKeyError);
  });

  test("throws InvalidSecretKeyError for random string", () => {
    expect(() => parseSecretKey("not a valid key at all")).toThrow(InvalidSecretKeyError);
  });

  test("parses valid nsec format", () => {
    // This is a valid nsec1 format key (the data corresponds to a valid private key)
    const nsec = "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5";
    const result = parseSecretKey(nsec);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });

  test("throws for invalid nsec prefix with valid length", () => {
    // nsec must decode to type "nsec"
    expect(() => parseSecretKey("nsec1invalid")).toThrow();
  });
});
