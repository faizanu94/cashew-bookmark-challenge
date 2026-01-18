// =============================================================================
// Share Access Tests - CANDIDATE IMPLEMENTS
// =============================================================================
// These tests verify that the share access control logic works correctly.
//
// The tests use:
// - `rawPrisma` to SET UP test data (bypasses ZenStack policies)
// - `getEnhancedClient(userId)` to TEST access (enforces policies)
//
// Requirements:
// - Test that owners can always access their collections
// - Test that PRIVATE collections are not accessible to others
// - Test that LINK_ACCESS collections are readable by anyone
// - Test that PASSWORD_PROTECTED collections require correct password
//
// -----------------------------------------------------------------------------
// NOTE ON @ts-expect-error COMMENTS
// -----------------------------------------------------------------------------
// The `@ts-expect-error` comments exist because the `Collection` and `Bookmark`
// models do not exist yet in the schema. TypeScript cannot recognize these
// models on the Prisma client until you implement them.
//
// Once you have:
// 1. Added the Collection and Bookmark models to `src/db/schema.zmodel`
// 2. Run `pnpm db:generate` to regenerate the Prisma client
//
// The @ts-expect-error comments will start showing TypeScript errors because
// the models now exist. **Remove all @ts-expect-error comments** before
// submitting your solution — they should no longer be needed.
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import {
  rawPrisma,
  getEnhancedClient,
  createTestUsers,
  cleanupTestData,
  disconnectDb,
} from "./fixtures/db";

// -----------------------------------------------------------------------------
// Test Cases
// -----------------------------------------------------------------------------

describe("Collection Share Access", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  describe("Owner Access", () => {
    it("owner can access their PRIVATE collection", async () => {
      const { owner } = await createTestUsers();

      // Create collection with raw prisma (bypasses policies for test setup)
      const collection = await rawPrisma.collection.create({
        data: {
          name: "My Private Collection",
          ownerId: owner.id,
          shareMode: "PRIVATE",
        },
      });

      // Test access with enhanced client (enforces policies)
      const ownerClient = getEnhancedClient(owner.id);
      const result = await ownerClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe("My Private Collection");
      expect(result?.shareMode).toBe("PRIVATE");
    });

    it("owner can access their LINK_ACCESS collection", async () => {
      const { owner } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Shared Link Collection",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      const ownerClient = getEnhancedClient(owner.id);
      const result = await ownerClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(result).not.toBeNull();
      expect(result?.shareMode).toBe("LINK_ACCESS");
    });

    it("owner can access their PASSWORD_PROTECTED collection", async () => {
      const { owner } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Password Protected Collection",
          ownerId: owner.id,
          shareMode: "PASSWORD_PROTECTED",
          sharePassword: "hashedpassword",
        },
      });

      const ownerClient = getEnhancedClient(owner.id);
      const result = await ownerClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(result).not.toBeNull();
      expect(result?.shareMode).toBe("PASSWORD_PROTECTED");
    });
  });

  describe("PRIVATE Collections", () => {
    it("PRIVATE collection is not accessible to other users", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Secret Collection",
          ownerId: owner.id,
          shareMode: "PRIVATE",
        },
      });

      // Other user tries to access - should be denied by policy
      const otherClient = getEnhancedClient(other.id);
      const result = await otherClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(result).toBeNull();
    });

    it("PRIVATE collection is not accessible to anonymous users", async () => {
      const { owner } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Private Only",
          ownerId: owner.id,
          shareMode: "PRIVATE",
        },
      });

      // Anonymous access (null = no authenticated user)
      const anonClient = getEnhancedClient(null);
      const result = await anonClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(result).toBeNull();
    });
  });

  describe("LINK_ACCESS Collections", () => {
    it("LINK_ACCESS collection is readable by other users", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Public Link Collection",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      // Other user should be able to read
      const otherClient = getEnhancedClient(other.id);
      const result = await otherClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Public Link Collection");
    });

    it("LINK_ACCESS collection is readable by anonymous users", async () => {
      const { owner } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Anyone Can View",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      const anonClient = getEnhancedClient(null);
      const result = await anonClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Anyone Can View");
    });

    it("LINK_ACCESS collection cannot be updated by other users", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Read Only For Others",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      // Other user tries to update - should be rejected by policy
      const otherClient = getEnhancedClient(other.id);

      await expect(
        otherClient.collection.update({
          where: { id: collection.id },
          data: { name: "Hacked!" },
        })
      ).rejects.toThrow();
    });

    it("LINK_ACCESS collection cannot be deleted by other users", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Cannot Delete",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      const otherClient = getEnhancedClient(other.id);

      await expect(
        otherClient.collection.delete({
          where: { id: collection.id },
        })
      ).rejects.toThrow();
    });
  });

  describe("PASSWORD_PROTECTED Collections", () => {
    it("PASSWORD_PROTECTED collection is visible to anonymous users", async () => {
      const { owner } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Protected Collection",
          ownerId: owner.id,
          shareMode: "PASSWORD_PROTECTED",
        },
      });

      const anonClient = getEnhancedClient(null);
      const result = await anonClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Protected Collection");
    });

    it.todo("correct password grants access to content");
    it.todo("incorrect password does not grant access");

    it("PASSWORD_PROTECTED cannot be edited by other users", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Protected",
          ownerId: owner.id,
          shareMode: "PASSWORD_PROTECTED",
        },
      });

      const otherClient = getEnhancedClient(other.id);

      await expect(
        otherClient.collection.update({
          where: { id: collection.id },
          data: { name: "Hacked!" },
        })
      ).rejects.toThrow();
    });
  });

  describe("Bookmark Access", () => {
    it("bookmarks in LINK_ACCESS collection are readable by others", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Shared Bookmarks",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      const bookmark = await rawPrisma.bookmark.create({
        data: {
          title: "Cool Website",
          url: "https://example.com",
          collectionId: collection.id,
        },
      });

      // Other user should see the bookmark
      const otherClient = getEnhancedClient(other.id);
      const result = await otherClient.bookmark.findUnique({
        where: { id: bookmark.id },
      });

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Cool Website");
    });

    it("bookmarks in PRIVATE collection are not accessible to others", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Private Bookmarks",
          ownerId: owner.id,
          shareMode: "PRIVATE",
        },
      });

      await rawPrisma.bookmark.create({
        data: {
          title: "Secret Link",
          url: "https://secret.com",
          collectionId: collection.id,
        },
      });

      // Other user should NOT see bookmarks
      const otherClient = getEnhancedClient(other.id);
      const results = await otherClient.bookmark.findMany({
        where: { collectionId: collection.id },
      });

      expect(results).toHaveLength(0);
    });

    it("only collection owner can create bookmarks", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Owner Only Bookmarks",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      // Other user tries to add a bookmark - should fail
      const otherClient = getEnhancedClient(other.id);

      await expect(
        otherClient.bookmark.create({
          data: {
            title: "Unauthorized Bookmark",
            url: "https://hacker.com",
            collectionId: collection.id,
          },
        })
      ).rejects.toThrow();
    });

    it("only collection owner can delete bookmarks", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Owner Bookmarks",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      const bookmark = await rawPrisma.bookmark.create({
        data: {
          title: "My Bookmark",
          url: "https://example.com",
          collectionId: collection.id,
        },
      });

      const otherClient = getEnhancedClient(other.id);

      await expect(
        otherClient.bookmark.delete({
          where: { id: bookmark.id },
        })
      ).rejects.toThrow();
    });
  });

  // Share Mode Change Test
  describe("Share Mode Changes", () => {
    it("changing shareMode to PRIVATE revokes access from non-owners", async () => {
      const { owner, other } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Initially Public",
          ownerId: owner.id,
          shareMode: "LINK_ACCESS",
        },
      });

      const otherClient = getEnhancedClient(other.id);

      const beforeChange = await otherClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(beforeChange).not.toBeNull();

      await rawPrisma.collection.update({
        where: { id: collection.id },
        data: { shareMode: "PRIVATE" },
      });

      const afterChange = await otherClient.collection.findUnique({
        where: { id: collection.id },
      });

      expect(afterChange).toBeNull();
    });
  });

  // Custom Test: Cascade Delete
  describe("Cascade Delete", () => {
    it("deleting a collection also deletes all its bookmarks", async () => {
      const { owner } = await createTestUsers();

      const collection = await rawPrisma.collection.create({
        data: {
          name: "Collection to Delete",
          ownerId: owner.id,
          shareMode: "PRIVATE",
        },
      });

      await rawPrisma.bookmark.create({
        data: {
          title: "Bookmark 1",
          url: "https://example1.com",
          collectionId: collection.id,
        },
      });

      await rawPrisma.bookmark.create({
        data: {
          title: "Bookmark 2",
          url: "https://example2.com",
          collectionId: collection.id,
        },
      });

      const bookmarksBefore = await rawPrisma.bookmark.findMany({
        where: { collectionId: collection.id },
      });

      expect(bookmarksBefore).toHaveLength(2);

      await rawPrisma.collection.delete({
        where: { id: collection.id },
      });

      const bookmarksAfter = await rawPrisma.bookmark.findMany({
        where: { collectionId: collection.id },
      });

      expect(bookmarksAfter).toHaveLength(0);
    });
  });
});
