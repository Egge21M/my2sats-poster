import { Command } from "commander";
import prompts from "prompts";
import { encrypt } from "nostr-tools/nip49";
import { getPublicKey } from "nostr-tools/pure";
import { config } from "../config";
import { parseSecretKey } from "../crypto";
import { AbortedError, handleError } from "../errors";

async function storeKey(
  nsecInput: string | undefined,
  keyfilePath: string,
): Promise<void> {
  let secretKeyInput = nsecInput;

  // Prompt for secret key if not provided
  if (!secretKeyInput) {
    const response = await prompts({
      type: "password",
      name: "secretKey",
      message: "Enter your nsec or hex secret key:",
      validate: (value) => {
        if (!value) return "Secret key is required";
        try {
          parseSecretKey(value.trim());
          return true;
        } catch (e) {
          return e instanceof Error ? e.message : "Invalid key format";
        }
      },
    });

    if (!response.secretKey) {
      throw new AbortedError();
    }
    secretKeyInput = response.secretKey;
  }

  const secretKey = parseSecretKey(secretKeyInput!);
  const pubkey = getPublicKey(secretKey);

  console.log(`Public key: ${pubkey}`);

  // Prompt for password
  const passwordResponse = await prompts([
    {
      type: "password",
      name: "password",
      message: "Enter encryption password:",
      validate: (value) => (value ? true : "Password cannot be empty"),
    },
    {
      type: "password",
      name: "confirmPassword",
      message: "Confirm password:",
    },
  ]);

  if (!passwordResponse.password || !passwordResponse.confirmPassword) {
    throw new AbortedError();
  }

  if (passwordResponse.password !== passwordResponse.confirmPassword) {
    throw new Error("Passwords do not match");
  }

  // Encrypt with NIP-49
  console.log("Encrypting key (this may take a moment)...");
  const ncryptsec = encrypt(secretKey, passwordResponse.password);

  // Write to keyfile
  const keyfile = Bun.file(keyfilePath);
  await Bun.write(keyfile, ncryptsec);

  console.log(`Key stored successfully in ${keyfilePath}`);
}

export const storeKeyCommand = new Command("store-key")
  .description("Store and encrypt your Nostr secret key")
  .argument("[nsec]", "Your nsec or hex secret key (will prompt if not provided)")
  .option("-k, --keyfile <path>", "Path to store the encrypted key", config.keyfilePath)
  .action(async (nsec: string | undefined, options: { keyfile: string }) => {
    try {
      await storeKey(nsec, options.keyfile);
    } catch (error) {
      handleError(error);
    }
  });
