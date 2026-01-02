import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { Config, ConfigError } from "./config";

describe("Config", () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Reset singleton before each test
    Config.reset();
    // Save original env
    originalEnv = { ...process.env };
    // Clear relevant env vars
    delete process.env.API_URL;
    delete process.env.KEYFILE_PATH;
    delete process.env.MY2SATS_CONFIG;
    // Create temp directory for test config files
    tempDir = await mkdtemp(join(tmpdir(), "my2sats-config-test-"));
  });

  afterEach(async () => {
    // Reset singleton after each test
    Config.reset();
    // Restore original env
    process.env = originalEnv;
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("defaults", () => {
    test("uses default values when no config file exists", () => {
      const config = Config.load(join(tempDir, "nonexistent.json"));

      expect(config.apiUrl).toBe("http://localhost:3000");
      expect(config.keyfilePath).toBe(join(homedir(), ".my2sats", "nostr.key"));
      expect(config.maxImageSize).toBe(5 * 1024 * 1024);
      expect(config.allowedImageTypes).toEqual([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ]);
    });
  });

  describe("config file loading", () => {
    test("loads apiUrl from config file", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ apiUrl: "https://api.my2sats.com" }),
      );

      const config = Config.load(configPath);

      expect(config.apiUrl).toBe("https://api.my2sats.com");
    });

    test("loads keyfilePath from config file", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ keyfilePath: "/custom/path/.nostr-key" }),
      );

      const config = Config.load(configPath);

      expect(config.keyfilePath).toBe("/custom/path/.nostr-key");
    });

    test("loads maxImageSize from config file", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ maxImageSize: 10 * 1024 * 1024 }),
      );

      const config = Config.load(configPath);

      expect(config.maxImageSize).toBe(10 * 1024 * 1024);
    });

    test("loads allowedImageTypes from config file", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ allowedImageTypes: ["image/png", "image/svg+xml"] }),
      );

      const config = Config.load(configPath);

      expect(config.allowedImageTypes).toEqual(["image/png", "image/svg+xml"]);
    });

    test("loads all config values from file", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({
          apiUrl: "https://custom.api.com",
          keyfilePath: "/custom/key",
          maxImageSize: 1024,
          allowedImageTypes: ["image/png"],
        }),
      );

      const config = Config.load(configPath);

      expect(config.apiUrl).toBe("https://custom.api.com");
      expect(config.keyfilePath).toBe("/custom/key");
      expect(config.maxImageSize).toBe(1024);
      expect(config.allowedImageTypes).toEqual(["image/png"]);
    });
  });

  describe("environment variable priority", () => {
    test("API_URL env var overrides config file", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ apiUrl: "https://file.api.com" }),
      );
      process.env.API_URL = "https://env.api.com";

      const config = Config.load(configPath);

      expect(config.apiUrl).toBe("https://env.api.com");
    });

    test("KEYFILE_PATH env var overrides config file", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ keyfilePath: "/file/path" }),
      );
      process.env.KEYFILE_PATH = "/env/path";

      const config = Config.load(configPath);

      expect(config.keyfilePath).toBe("/env/path");
    });

    test("MY2SATS_CONFIG env var specifies config path", async () => {
      const configPath = join(tempDir, "custom-config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ apiUrl: "https://custom.api.com" }),
      );
      process.env.MY2SATS_CONFIG = configPath;

      const config = Config.load();

      expect(config.apiUrl).toBe("https://custom.api.com");
    });
  });

  describe("validation", () => {
    test("ignores invalid apiUrl type", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, JSON.stringify({ apiUrl: 12345 }));

      const config = Config.load(configPath);

      expect(config.apiUrl).toBe("http://localhost:3000");
    });

    test("ignores invalid keyfilePath type", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, JSON.stringify({ keyfilePath: ["array"] }));

      const config = Config.load(configPath);

      expect(config.keyfilePath).toBe(join(homedir(), ".my2sats", "nostr.key"));
    });

    test("ignores invalid maxImageSize type", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, JSON.stringify({ maxImageSize: "large" }));

      const config = Config.load(configPath);

      expect(config.maxImageSize).toBe(5 * 1024 * 1024);
    });

    test("ignores negative maxImageSize", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, JSON.stringify({ maxImageSize: -100 }));

      const config = Config.load(configPath);

      expect(config.maxImageSize).toBe(5 * 1024 * 1024);
    });

    test("ignores invalid allowedImageTypes", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ allowedImageTypes: "not-an-array" }),
      );

      const config = Config.load(configPath);

      expect(config.allowedImageTypes).toEqual([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ]);
    });

    test("ignores allowedImageTypes with non-string elements", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(
        configPath,
        JSON.stringify({ allowedImageTypes: ["valid", 123, null] }),
      );

      const config = Config.load(configPath);

      expect(config.allowedImageTypes).toEqual([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ]);
    });

    test("throws ConfigError on invalid JSON", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, "{ invalid json }");

      expect(() => Config.load(configPath)).toThrow(ConfigError);
    });

    test("handles empty config file", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, "{}");

      const config = Config.load(configPath);

      expect(config.apiUrl).toBe("http://localhost:3000");
      expect(config.keyfilePath).toBe(join(homedir(), ".my2sats", "nostr.key"));
    });

    test("handles null config file content", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, "null");

      const config = Config.load(configPath);

      expect(config.apiUrl).toBe("http://localhost:3000");
    });
  });

  describe("singleton", () => {
    test("getInstance returns same instance", () => {
      const config1 = Config.getInstance();
      const config2 = Config.getInstance();

      expect(config1).toBe(config2);
    });

    test("reset clears singleton", () => {
      const config1 = Config.getInstance();
      Config.reset();
      const config2 = Config.getInstance();

      // Different instances (though may have same values)
      expect(config1).not.toBe(config2);
    });
  });

  describe("getConfigPath", () => {
    test("returns the loaded config path", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, "{}");

      const config = Config.load(configPath);

      expect(config.getConfigPath()).toBe(configPath);
    });
  });

  describe("getDefaultConfigPath", () => {
    test("returns path in home directory", () => {
      const defaultPath = Config.getDefaultConfigPath();

      expect(defaultPath).toContain(".my2sats");
      expect(defaultPath).toContain("config.json");
    });
  });

  describe("configFileExists", () => {
    test("returns true when config file exists", async () => {
      const configPath = join(tempDir, "config.json");
      await Bun.write(configPath, "{}");

      const exists = await Config.configFileExists(configPath);

      expect(exists).toBe(true);
    });

    test("returns false when config file does not exist", async () => {
      const configPath = join(tempDir, "nonexistent.json");

      const exists = await Config.configFileExists(configPath);

      expect(exists).toBe(false);
    });
  });

  describe("createDefaultConfig", () => {
    test("creates config file with defaults", async () => {
      const configPath = join(tempDir, "new-config.json");

      const createdPath = await Config.createDefaultConfig(configPath);

      expect(createdPath).toBe(configPath);
      const content = await Bun.file(configPath).text();
      const parsed = JSON.parse(content);
      expect(parsed.apiUrl).toBe("http://localhost:3000");
      expect(parsed.keyfilePath).toBe(join(homedir(), ".my2sats", "nostr.key"));
    });

    test("creates parent directories", async () => {
      const configPath = join(tempDir, "nested", "dir", "config.json");

      await Config.createDefaultConfig(configPath);

      const exists = await Bun.file(configPath).exists();
      expect(exists).toBe(true);
    });

    test("throws error if file exists and overwrite is false", async () => {
      const configPath = join(tempDir, "existing.json");
      await Bun.write(configPath, "{}");

      await expect(Config.createDefaultConfig(configPath)).rejects.toThrow(
        ConfigError,
      );
    });

    test("overwrites file when overwrite is true", async () => {
      const configPath = join(tempDir, "existing.json");
      await Bun.write(configPath, '{"apiUrl": "old"}');

      await Config.createDefaultConfig(configPath, true);

      const content = await Bun.file(configPath).text();
      const parsed = JSON.parse(content);
      expect(parsed.apiUrl).toBe("http://localhost:3000");
    });
  });
});

describe("ConfigError", () => {
  test("has correct name", () => {
    const error = new ConfigError("Test message");

    expect(error.name).toBe("ConfigError");
  });

  test("has correct message", () => {
    const error = new ConfigError("Custom error message");

    expect(error.message).toBe("Custom error message");
  });

  test("is instance of Error", () => {
    const error = new ConfigError("Test");

    expect(error).toBeInstanceOf(Error);
  });
});
