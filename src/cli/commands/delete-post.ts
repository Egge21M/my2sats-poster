import { Command } from "commander";
import prompts from "prompts";
import { getPublicKey } from "nostr-tools/pure";
import { config } from "../config";
import { getSecretKey, createSignFunction } from "../crypto";
import { deletePost as apiDeletePost } from "../api-client";
import { handleError } from "../errors";
import { type DeletePostOptions } from "../types";

async function deletePost(
  slug: string,
  options: DeletePostOptions,
): Promise<void> {
  // Confirm deletion unless --force is used
  if (!options.force) {
    const confirmation = await prompts({
      type: "confirm",
      name: "confirmed",
      message: `Are you sure you want to delete the post "${slug}"?`,
      initial: false,
    });

    if (!confirmation.confirmed) {
      console.log("Deletion cancelled.");
      return;
    }
  }

  // Get secret key and derive public key
  const secretKey = await getSecretKey(options.keyfile);
  const pubkey = getPublicKey(secretKey);

  console.log(`Using pubkey: ${pubkey}`);

  // Create sign function for NIP-98
  const sign = createSignFunction(secretKey);

  // Make API request
  const result = await apiDeletePost(slug, sign, options.api);
  console.log("Post deleted successfully:");
  console.log(JSON.stringify(result, null, 2));
}

export const deletePostCommand = new Command("delete")
  .description("Delete an existing post")
  .argument("<slug>", "Slug of the post to delete")
  .option(
    "-k, --keyfile <path>",
    "Path to the encrypted key file",
    config.keyfilePath,
  )
  .option("-a, --api <url>", "API base URL", config.apiUrl)
  .option("-f, --force", "Skip confirmation prompt", false)
  .action(async (slug: string, options: DeletePostOptions) => {
    try {
      await deletePost(slug, options);
    } catch (error) {
      handleError(error);
    }
  });
