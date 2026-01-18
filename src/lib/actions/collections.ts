"use server";

// =============================================================================
// Collection Server Actions - CANDIDATE IMPLEMENTS
// =============================================================================
// These server actions handle CRUD operations for collections.
//
// Requirements:
// - Use Zod for input validation
// - Use getEnhancedPrisma() for database operations (enforces access policies)
// - Handle errors gracefully and return appropriate error messages
// - Use revalidatePath() to refresh the UI after mutations
//
// Hints:
// - The enhanced Prisma client will automatically enforce ownership rules
// - For password-protected collections, hash the password with bcryptjs
// - Return structured results: { success: true, data } or { success: false, error }
// =============================================================================

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getEnhancedPrisma } from "@/lib/db";
import { prisma } from "@/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const createCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  shareMode: z.enum(["PRIVATE", "LINK_ACCESS", "PASSWORD_PROTECTED"]).optional(),
  sharePassword: z.string().min(4).max(100).optional(),
});

// -----------------------------------------------------------------------------
// Server Actions
// -----------------------------------------------------------------------------

/**
 * Create a new collection for the current user.
 *
 * @param data - Collection data (name, description)
 * @returns The created collection or an error
 *
 * TODO: Implement this function
 * - Validate input with Zod
 * - Use getEnhancedPrisma() to create the collection
 * - The enhanced client will automatically set the ownerId
 * - Revalidate the collections page after creation
 */
export async function createCollection(data: {
  name: string;
  description?: string;
}) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const validated = createCollectionSchema.parse(data);
    const db = await getEnhancedPrisma();
    const collection = await db.collection.create({
      data: {
        name: validated.name,
        description: validated.description,
        owner: { connect: { id: user.id } },
      },
    });
    revalidatePath("/collections");
    return { success: true, data: collection };
  } catch (error) {
    console.error("createCollection error:", error);
    return { success: false, error: "Failed to create collection" };
  }
}

/**
 * Update an existing collection.
 *
 * @param id - Collection ID
 * @param data - Fields to update (name, description, shareMode, sharePassword)
 * @returns The updated collection or an error
 *
 * TODO: Implement this function
 * - Validate input with Zod
 * - If sharePassword is provided, hash it with bcryptjs
 * - Use getEnhancedPrisma() to update (will enforce ownership)
 * - Revalidate the collection detail page
 */
export async function updateCollection(
  id: string,
  data: {
    name?: string;
    description?: string;
    shareMode?: "PRIVATE" | "LINK_ACCESS" | "PASSWORD_PROTECTED";
    sharePassword?: string;
  }
) {
  try {
    const validated = updateCollectionSchema.parse(data);
    const db = await getEnhancedPrisma();
    const collection = await db.collection.update({
      where: { id },
      data: validated,
    });
    revalidatePath("/collections");
    revalidatePath(`/collections/${id}`);
    return { success: true, data: collection };
  } catch (error) {
    console.error("updateCollection error:", error);
    return { success: false, error: "Failed to update collection" };
  }
}

/**
 * Delete a collection and all its bookmarks.
 *
 * @param id - Collection ID
 * @returns Success or error
 *
 * TODO: Implement this function
 * - Use getEnhancedPrisma() to delete (will enforce ownership)
 * - Bookmarks will be cascade deleted per schema
 * - Revalidate the collections page
 */
export async function deleteCollection(id: string) {
  try {
    const db = await getEnhancedPrisma();
    await db.collection.delete({ where: { id } });
    revalidatePath("/collections");
    return { success: true };
  } catch (error) {
    console.error("deleteCollection error:", error);
    return { success: false, error: "Failed to delete collection" };
  }
}

/**
 * Verify a share password for a password-protected collection.
 *
 * ⚠️ CODE REVIEW CHALLENGE: This implementation has security issues.
 * Identify and fix them as part of your submission.
 *
 * SECURITY FIXES:
 * 1. Use raw prisma instead of enhanced (sharePassword has @omit)
 * 2. Use bcrypt.compare() instead of plain text comparison
 * 3. Check that collection is PASSWORD_PROTECTED
 * 4. Set cookie on success for session persistence
 * 5. Use consistent error message
 *
 * @param slug - Collection slug
 * @param password - Password to verify
 * @returns Whether the password is correct
 */
export async function verifySharePassword(
  slug: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!slug || !password) {
    return { success: false, error: "Invalid request" };
  }

  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: { sharePassword: true, shareMode: true },
  });

  if (!collection) {
    return { success: false, error: "Invalid password" };
  }

  if (collection.shareMode !== "PASSWORD_PROTECTED") {
    return { success: false, error: "Invalid request" };
  }

  if (!collection.sharePassword) {
    return { success: false, error: "Invalid password" };
  }

  const isValid = await bcrypt.compare(password, collection.sharePassword);

  if (!isValid) {
    return { success: false, error: "Invalid password" };
  }

  const cookieStore = await cookies();

  cookieStore.set(`share-verified-${slug}`, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });

  return { success: true };
}
