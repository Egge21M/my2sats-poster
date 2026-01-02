/**
 * Cryptographic utilities for Nostr key handling.
 */

import prompts from "prompts";
import { decrypt } from "nostr-tools/nip49";
import { decode } from "nostr-tools/nip19";
import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
import { hexToBytes } from "@noble/hashes/utils";
import { config } from "./config";
import {
  KeyfileNotFoundError,
  InvalidKeyfileError,
  DecryptionError,
  InvalidSecretKeyError,
  AbortedError,
} from "./errors";
import { type SignFunction } from "./types";

/**
 * Parses a secret key from nsec or hex format.
 */
export function parseSecretKey(input: string): Uint8Array {
  const trimmed = input.trim();

  // Check if it's nsec format
  if (trimmed.startsWith("nsec1")) {
    const decoded = decode(trimmed as `nsec1${string}`);
    if (decoded.type !== "nsec") {
      throw new InvalidSecretKeyError("Invalid nsec format");
    }
    return decoded.data;
  }

  // Assume hex format
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new InvalidSecretKeyError();
  }
  return hexToBytes(trimmed);
}

/**
 * Reads and decrypts the secret key from the keyfile.
 * Prompts the user for the decryption password.
 *
 * @throws {KeyfileNotFoundError} If the keyfile doesn't exist
 * @throws {InvalidKeyfileError} If the keyfile format is invalid
 * @throws {AbortedError} If the user cancels the password prompt
 * @throws {DecryptionError} If decryption fails
 */
export async function getSecretKey(
  keyfilePath: string = config.keyfilePath,
): Promise<Uint8Array> {
  const keyfile = Bun.file(keyfilePath);

  if (!(await keyfile.exists())) {
    throw new KeyfileNotFoundError(keyfilePath);
  }

  const ncryptsec = await keyfile.text();

  if (!ncryptsec.startsWith("ncryptsec1")) {
    throw new InvalidKeyfileError();
  }

  const response = await prompts({
    type: "password",
    name: "password",
    message: "Enter password to decrypt key:",
  });

  if (!response.password) {
    throw new AbortedError();
  }

  try {
    return decrypt(ncryptsec.trim(), response.password);
  } catch {
    throw new DecryptionError();
  }
}

/**
 * Creates a sign function for NIP-98 authentication.
 */
export function createSignFunction(secretKey: Uint8Array): SignFunction {
  return async (event: EventTemplate) => {
    return finalizeEvent(event, secretKey);
  };
}
