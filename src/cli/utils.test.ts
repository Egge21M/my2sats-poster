import { test, expect, describe } from "bun:test";
import {
  parseFrontmatter,
  isLocalPath,
  parseImageReferences,
  getBasePath,
} from "./utils";

describe("parseFrontmatter", () => {
  test("parses valid frontmatter with all fields", () => {
    const markdown = `---
slug: my-post
title: My Post Title
author: John Doe
excerpt: A short description
featured_image: ./image.png
tags: [tag1, tag2, tag3]
---
This is the content.`;

    const result = parseFrontmatter(markdown);

    expect(result.frontmatter).toEqual({
      slug: "my-post",
      title: "My Post Title",
      author: "John Doe",
      excerpt: "A short description",
      featured_image: "./image.png",
      tags: ["tag1", "tag2", "tag3"],
    });
    expect(result.content).toBe("This is the content.");
  });

  test("handles quoted string values", () => {
    const markdown = `---
title: "Quoted Title"
author: 'Single Quoted'
---
Content`;

    const result = parseFrontmatter(markdown);

    expect(result.frontmatter.title).toBe("Quoted Title");
    expect(result.frontmatter.author).toBe("Single Quoted");
  });

  test("handles quoted array items", () => {
    const markdown = `---
tags: ["tag one", 'tag two', tag3]
---
Content`;

    const result = parseFrontmatter(markdown);

    expect(result.frontmatter.tags).toEqual(["tag one", "tag two", "tag3"]);
  });

  test("returns empty frontmatter when no frontmatter present", () => {
    const markdown = "Just plain content without frontmatter.";

    const result = parseFrontmatter(markdown);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(markdown);
  });

  test("handles minimal frontmatter", () => {
    const markdown = `---
slug: test
---
Content after minimal frontmatter`;

    const result = parseFrontmatter(markdown);

    expect(result.frontmatter).toEqual({ slug: "test" });
    expect(result.content).toBe("Content after minimal frontmatter");
  });

  test("returns original content when frontmatter delimiters are empty", () => {
    // The regex requires at least one char between delimiters
    const markdown = `---
---
Content`;

    const result = parseFrontmatter(markdown);

    // This doesn't match the regex pattern, so returns as plain content
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(markdown);
  });

  test("ignores unknown frontmatter fields", () => {
    const markdown = `---
slug: test
unknown_field: value
another_unknown: 123
---
Content`;

    const result = parseFrontmatter(markdown);

    expect(result.frontmatter).toEqual({ slug: "test" });
    expect((result.frontmatter as Record<string, unknown>).unknown_field).toBeUndefined();
  });

  test("handles multiline content", () => {
    const markdown = `---
title: Test
---
First paragraph.

Second paragraph.

Third paragraph.`;

    const result = parseFrontmatter(markdown);

    expect(result.content).toBe(
      "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
    );
  });
});

describe("isLocalPath", () => {
  test("returns true for relative paths", () => {
    expect(isLocalPath("./image.png")).toBe(true);
    expect(isLocalPath("../images/photo.jpg")).toBe(true);
    expect(isLocalPath("image.png")).toBe(true);
    expect(isLocalPath("folder/image.png")).toBe(true);
  });

  test("returns true for absolute paths", () => {
    expect(isLocalPath("/home/user/image.png")).toBe(true);
    expect(isLocalPath("/var/www/images/photo.jpg")).toBe(true);
  });

  test("returns false for HTTP URLs", () => {
    expect(isLocalPath("http://example.com/image.png")).toBe(false);
    expect(isLocalPath("http://localhost:3000/uploads/photo.jpg")).toBe(false);
  });

  test("returns false for HTTPS URLs", () => {
    expect(isLocalPath("https://example.com/image.png")).toBe(false);
    expect(isLocalPath("https://cdn.example.com/assets/photo.jpg")).toBe(false);
  });
});

describe("parseImageReferences", () => {
  test("parses markdown image syntax", () => {
    const content = "Some text ![Alt text](./image.png) more text";

    const result = parseImageReferences(content);

    expect(result).toEqual([
      { original: "![Alt text](./image.png)", path: "./image.png" },
    ]);
  });

  test("parses markdown image with title", () => {
    const content = '![Alt](./photo.jpg "Image title")';

    const result = parseImageReferences(content);

    expect(result).toEqual([
      { original: '![Alt](./photo.jpg "Image title")', path: "./photo.jpg" },
    ]);
  });

  test("parses HTML img tags with double quotes", () => {
    const content = 'Text <img src="./image.png" alt="test" /> more text';

    const result = parseImageReferences(content);

    expect(result).toEqual([
      { original: '<img src="./image.png" alt="test" />', path: "./image.png" },
    ]);
  });

  test("parses HTML img tags with single quotes", () => {
    const content = "Text <img src='./image.png' /> more text";

    const result = parseImageReferences(content);

    expect(result).toEqual([
      { original: "<img src='./image.png' />", path: "./image.png" },
    ]);
  });

  test("parses multiple images", () => {
    const content = `
      ![First](./first.png)
      Some text
      ![Second](./second.jpg)
      <img src="./third.gif" />
    `;

    const result = parseImageReferences(content);

    expect(result).toHaveLength(3);
    expect(result[0]?.path).toBe("./first.png");
    expect(result[1]?.path).toBe("./second.jpg");
    expect(result[2]?.path).toBe("./third.gif");
  });

  test("ignores remote URLs", () => {
    const content = `
      ![Remote](https://example.com/image.png)
      ![Local](./local.png)
      <img src="http://example.com/photo.jpg" />
    `;

    const result = parseImageReferences(content);

    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe("./local.png");
  });

  test("returns empty array when no images", () => {
    const content = "Just some text without any images.";

    const result = parseImageReferences(content);

    expect(result).toEqual([]);
  });

  test("handles images without alt text", () => {
    const content = "![](./no-alt.png)";

    const result = parseImageReferences(content);

    expect(result).toEqual([
      { original: "![](./no-alt.png)", path: "./no-alt.png" },
    ]);
  });
});

describe("getBasePath", () => {
  test("extracts directory from file path", () => {
    expect(getBasePath("posts/my-post.md")).toBe("posts");
    expect(getBasePath("content/blog/article.md")).toBe("content/blog");
    expect(getBasePath("/absolute/path/file.md")).toBe("/absolute/path");
  });

  test("returns current directory for file without path", () => {
    expect(getBasePath("file.md")).toBe(".");
    expect(getBasePath("post.md")).toBe(".");
  });

  test("handles deeply nested paths", () => {
    expect(getBasePath("a/b/c/d/e/file.md")).toBe("a/b/c/d/e");
  });
});
