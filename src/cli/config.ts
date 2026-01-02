/**
 * Centralized configuration for the my2sats CLI.
 *
 * Configuration is loaded with the following priority (highest to lowest):
 * 1. Environment variables
 * 2. Config file (~/.my2sats/config.json or custom path via MY2SATS_CONFIG)
 * 3. Default values
 */

import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Configuration file structure.
 * All fields are optional - missing fields use defaults.
 */
export interface ConfigFile {
  /** API base URL for my2sats */
  apiUrl?: string;
  /** Path to the encrypted Nostr key file */
  keyfilePath?: string;
  /** Maximum allowed image size in bytes */
  maxImageSize?: number;
  /** Allowed image MIME types for upload */
  allowedImageTypes?: string[];
}

/**
 * Resolved configuration with all required fields.
 */
export interface ResolvedConfig {
  /** API base URL for my2sats */
  apiUrl: string;
  /** Path to the encrypted Nostr key file */
  keyfilePath: string;
  /** Maximum allowed image size in bytes */
  maxImageSize: number;
  /** Allowed image MIME types for upload */
  allowedImageTypes: readonly string[];
}

/** Default my2sats directory */
const DEFAULT_MY2SATS_DIR = join(homedir(), ".my2sats");

/** Default config file path */
const DEFAULT_CONFIG_PATH = join(DEFAULT_MY2SATS_DIR, "config.json");

/** Default keyfile path */
const DEFAULT_KEYFILE_PATH = join(DEFAULT_MY2SATS_DIR, "nostr.key");

/** Default configuration values */
const DEFAULTS: ResolvedConfig = {
  apiUrl: "http://localhost:3000",
  keyfilePath: DEFAULT_KEYFILE_PATH,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

/**
 * Configuration manager for the my2sats CLI.
 *
 * Provides a singleton instance that loads configuration from:
 * 1. Environment variables (highest priority)
 * 2. Config file
 * 3. Default values (lowest priority)
 *
 * @example
 * ```ts
 * import { Config } from "./config";
 *
 * const config = Config.getInstance();
 * console.log(config.apiUrl);
 * ```
 */
export class Config implements ResolvedConfig {
  private static instance: Config | null = null;

  readonly apiUrl: string;
  readonly keyfilePath: string;
  readonly maxImageSize: number;
  readonly allowedImageTypes: readonly string[];

  private constructor(
    fileConfig: ConfigFile,
    private readonly configPath: string,
  ) {
    // Priority: env vars > config file > defaults
    this.apiUrl = process.env.API_URL ?? fileConfig.apiUrl ?? DEFAULTS.apiUrl;
    this.keyfilePath =
      process.env.KEYFILE_PATH ?? fileConfig.keyfilePath ?? DEFAULTS.keyfilePath;
    this.maxImageSize = fileConfig.maxImageSize ?? DEFAULTS.maxImageSize;
    this.allowedImageTypes =
      fileConfig.allowedImageTypes ?? DEFAULTS.allowedImageTypes;
  }

  /**
   * Gets the singleton Config instance.
   * Loads configuration on first call.
   */
  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = Config.load();
    }
    return Config.instance;
  }

  /**
   * Loads configuration from file and environment.
   * Creates a new Config instance (useful for testing).
   *
   * @param configPath - Optional path to config file. Defaults to ~/.my2sats/config.json
   *                     or the value of MY2SATS_CONFIG environment variable.
   */
  static load(configPath?: string): Config {
    const resolvedPath =
      configPath ?? process.env.MY2SATS_CONFIG ?? DEFAULT_CONFIG_PATH;
    const fileConfig = Config.loadConfigFile(resolvedPath);
    return new Config(fileConfig, resolvedPath);
  }

  /**
   * Resets the singleton instance.
   * Useful for testing or reloading configuration.
   */
  static reset(): void {
    Config.instance = null;
  }

  /**
   * Returns the path to the loaded config file.
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Returns the default config file path.
   */
  static getDefaultConfigPath(): string {
    return DEFAULT_CONFIG_PATH;
  }

  /**
   * Checks if a config file exists at the given path.
   */
  static async configFileExists(configPath?: string): Promise<boolean> {
    const path = configPath ?? process.env.MY2SATS_CONFIG ?? DEFAULT_CONFIG_PATH;
    return await Bun.file(path).exists();
  }

  /**
   * Creates a config file with default values.
   * Creates the parent directory if it doesn't exist.
   *
   * @param configPath - Optional path for the config file.
   * @param overwrite - If true, overwrites existing file. Default false.
   * @returns The path to the created config file.
   */
  static async createDefaultConfig(
    configPath?: string,
    overwrite = false,
  ): Promise<string> {
    const path = configPath ?? DEFAULT_CONFIG_PATH;
    const file = Bun.file(path);

    if (!overwrite && (await file.exists())) {
      throw new ConfigError(`Config file already exists at ${path}`);
    }

    // Create parent directory if needed
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(dir, { recursive: true });
    }

    const defaultConfig: ConfigFile = {
      apiUrl: DEFAULTS.apiUrl,
      keyfilePath: DEFAULTS.keyfilePath,
    };

    await Bun.write(file, JSON.stringify(defaultConfig, null, 2) + "\n");
    return path;
  }

  /**
   * Loads and parses a config file.
   * Returns an empty object if the file doesn't exist or is invalid.
   */
  private static loadConfigFile(configPath: string): ConfigFile {
    try {
      const file = Bun.file(configPath);
      // Use synchronous check for constructor
      const fs = require("node:fs");
      if (!fs.existsSync(configPath)) {
        return {};
      }
      const content = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content);
      return Config.validateConfigFile(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ConfigError(
          `Invalid JSON in config file ${configPath}: ${error.message}`,
        );
      }
      // File doesn't exist or other read error - return empty config
      return {};
    }
  }

  /**
   * Validates the structure of a config file.
   * Returns a sanitized ConfigFile object.
   */
  private static validateConfigFile(data: unknown): ConfigFile {
    if (typeof data !== "object" || data === null) {
      return {};
    }

    const config: ConfigFile = {};
    const obj = data as Record<string, unknown>;

    if (typeof obj.apiUrl === "string") {
      config.apiUrl = obj.apiUrl;
    }

    if (typeof obj.keyfilePath === "string") {
      config.keyfilePath = obj.keyfilePath;
    }

    if (typeof obj.maxImageSize === "number" && obj.maxImageSize > 0) {
      config.maxImageSize = obj.maxImageSize;
    }

    if (
      Array.isArray(obj.allowedImageTypes) &&
      obj.allowedImageTypes.every((t) => typeof t === "string")
    ) {
      config.allowedImageTypes = obj.allowedImageTypes;
    }

    return config;
  }
}

/**
 * Error thrown for configuration-related issues.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Default export for convenient access.
 * @example
 * ```ts
 * import { config } from "./config";
 * console.log(config.apiUrl);
 * ```
 */
export const config = Config.getInstance();
