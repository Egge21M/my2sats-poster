#!/usr/bin/env bun
import { Command } from "commander";
import { storeKeyCommand } from "./commands/store-key";
import { createPostCommand } from "./commands/create-post";
import { updatePostCommand } from "./commands/update-post";
import { deletePostCommand } from "./commands/delete-post";

const program = new Command();

program
  .name("my2sats")
  .description("CLI tool for posting to my2sats using Nostr authentication")
  .version("1.0.0");

program.addCommand(storeKeyCommand);
program.addCommand(createPostCommand);
program.addCommand(updatePostCommand);
program.addCommand(deletePostCommand);

program.parse();
