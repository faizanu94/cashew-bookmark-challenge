// =============================================================================
// Test Database Utilities
// =============================================================================
// Provides helpers for testing ZenStack access policies.
//
// Pattern:
// - Use `rawPrisma` to SET UP test data (bypasses policies)
// - Use `getEnhancedClient(userId)` to TEST access (enforces policies)
//
// Two approaches for test isolation:
// 1. `createTestUsers()` + `cleanupTestData()` - Fast, uses dedicated test users
// 2. `resetDatabase()` - Slower, resets DB to seed state (clean slate)
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { enhance } from "@zenstackhq/runtime";
import { SEED_USERS } from "./seed-data";

// Re-export seed users for convenience
export { SEED_USERS } from "./seed-data";

// Raw Prisma client - use for test setup/teardown (bypasses all policies)
export const rawPrisma = new PrismaClient();

/**
 * Get an enhanced Prisma client that enforces ZenStack access policies.
 * Use this to test what a specific user (or anonymous visitor) can access.
 *
 * @param userId - User ID to simulate, or null for anonymous access
 * @returns Enhanced Prisma client with policies enforced
 *
 * @example
 * ```ts
 * // Test as seeded user (alice, bob, charlie)
 * const aliceClient = getEnhancedClient(SEED_USERS.alice.id);
 * const collections = await aliceClient.collection.findMany();
 *
 * // Test as anonymous visitor
 * const anonClient = getEnhancedClient(null);
 * const publicCollections = await anonClient.collection.findMany();
 * ```
 */
export function getEnhancedClient(userId: string | null) {
  return enhance(rawPrisma, {
    user: userId ? { id: userId } : undefined,
  });
}

// =============================================================================
// Database Reset (Full Reset to Seed State)
// =============================================================================

/**
 * Reset the database to its seeded state.
 * Deletes ALL data, then re-creates seed users.
 *
 * Use this when you need a guaranteed clean slate.
 * Slower than targeted cleanup, but simpler mental model.
 *
 * @example
 * ```ts
 * beforeEach(async () => {
 *   await resetDatabase();
 * });
 * ```
 */
export async function resetDatabase() {
  // Delete all data in FK-safe order (children before parents)
  // Note: Models may not exist yet in incomplete implementation
  try {
    await rawPrisma.bookmark.deleteMany({});
  } catch {
    // Model doesn't exist yet
  }

  try {
    await rawPrisma.collection.deleteMany({});
  } catch {
    // Model doesn't exist yet
  }

  await rawPrisma.user.deleteMany({});

  // Re-create seed users
  for (const userData of Object.values(SEED_USERS)) {
    await rawPrisma.user.create({ data: userData });
  }
}

// =============================================================================
// Targeted Test User Approach (Faster)
// =============================================================================
// Use dedicated test users that don't collide with seed data.
// Faster because we only clean up test-specific data.

export const TEST_USERS = {
  owner: {
    id: "test_owner_share_access",
    email: "owner@test-share.com",
    name: "Test Owner",
  },
  other: {
    id: "test_other_share_access",
    email: "other@test-share.com",
    name: "Other User",
  },
} as const;

/**
 * Create dedicated test users (doesn't touch seed data).
 * Faster alternative to resetDatabase() for most tests.
 */
export async function createTestUsers() {
  const owner = await rawPrisma.user.upsert({
    where: { id: TEST_USERS.owner.id },
    update: {},
    create: TEST_USERS.owner,
  });

  const other = await rawPrisma.user.upsert({
    where: { id: TEST_USERS.other.id },
    update: {},
    create: TEST_USERS.other,
  });

  return { owner, other };
}

/**
 * Clean up only test-created data (doesn't touch seed data).
 * Deletes in FK-safe order: Bookmarks -> Collections -> Users
 */
export async function cleanupTestData() {
  const testUserIds = [TEST_USERS.owner.id, TEST_USERS.other.id];

  // Note: @ts-expect-error comments removed - models now exist after schema implementation
  try {
    await rawPrisma.bookmark.deleteMany({
      where: {
        collection: {
          ownerId: { in: testUserIds },
        },
      },
    });
  } catch {
    // Model doesn't exist yet
  }

  try {
    await rawPrisma.collection.deleteMany({
      where: { ownerId: { in: testUserIds } },
    });
  } catch {
    // Model doesn't exist yet
  }

  await rawPrisma.user.deleteMany({
    where: { id: { in: testUserIds } },
  });
}

/**
 * Disconnect from the database.
 * Call this in afterAll to clean up connections.
 */
export async function disconnectDb() {
  await rawPrisma.$disconnect();
}
