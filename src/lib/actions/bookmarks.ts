"use server";

// =============================================================================
// Bookmark Server Actions - CANDIDATE IMPLEMENTS
// =============================================================================
// These server actions handle CRUD operations for bookmarks.
//
// Requirements:
// - Use Zod for input validation
// - Use getEnhancedPrisma() for database operations (enforces access policies)
// - Handle errors gracefully and return appropriate error messages
// - Use revalidatePath() to refresh the UI after mutations
//
// Hints:
// - Bookmarks inherit access from their parent collection
// - The enhanced Prisma client will enforce that only collection owners can create/edit
// - Consider validating URLs (optional bonus)
// =============================================================================

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEnhancedPrisma } from "@/lib/db";

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const createBookmarkSchema = z.object({
  collectionId: z.string().cuid(),
  title: z.string().min(1, "Title is required").max(200),
  url: z.string().url("Invalid URL"),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const updateBookmarkSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// -----------------------------------------------------------------------------
// Server Actions
// -----------------------------------------------------------------------------

/**
 * Create a new bookmark in a collection.
 *
 * @param data - Bookmark data (collectionId, title, url, description, tags)
 * @returns The created bookmark or an error
 *
 * TODO: Implement this function
 * - Validate input with Zod
 * - Use getEnhancedPrisma() to create the bookmark
 * - The enhanced client will enforce that user owns the collection
 * - Revalidate the collection detail page
 */
export async function createBookmark(data: {
  collectionId: string;
  title: string;
  url: string;
  description?: string;
  tags?: string[];
}) {
  try {
    const validated = createBookmarkSchema.parse(data);
    const db = await getEnhancedPrisma();
    const bookmark = await db.bookmark.create({
      data: {
        title: validated.title,
        url: validated.url,
        description: validated.description,
        tags: validated.tags ? JSON.stringify(validated.tags) : null,
        collection: { connect: { id: validated.collectionId } },
      },
    });
    revalidatePath(`/collections/${validated.collectionId}`);
    return { success: true, data: bookmark };
  } catch (error) {
    console.error("createBookmark error:", error);
    return { success: false, error: "Failed to create bookmark" };
  }
}

/**
 * Update an existing bookmark.
 *
 * @param id - Bookmark ID
 * @param data - Fields to update (title, url, description, tags)
 * @returns The updated bookmark or an error
 *
 * TODO: Implement this function
 * - Validate input with Zod
 * - Use getEnhancedPrisma() to update (will enforce collection ownership)
 * - Revalidate the collection detail page
 */
export async function updateBookmark(
  id: string,
  data: {
    title?: string;
    url?: string;
    description?: string;
    tags?: string[];
  }
) {
  try {
    const validated = updateBookmarkSchema.parse(data);
    const db = await getEnhancedPrisma();
    const bookmark = await db.bookmark.update({
      where: { id },
      data: {
        ...validated,
        tags: validated.tags !== undefined ? JSON.stringify(validated.tags) : undefined,
      },
    });
    revalidatePath(`/collections/${bookmark.collectionId}`);
    return { success: true, data: bookmark };
  } catch (error) {
    console.error("updateBookmark error:", error);
    return { success: false, error: "Failed to update bookmark" };
  }
}

/**
 * Delete a bookmark.
 *
 * @param id - Bookmark ID
 * @returns Success or error
 *
 * TODO: Implement this function
 * - Use getEnhancedPrisma() to delete (will enforce collection ownership)
 * - Revalidate the collection detail page
 */
export async function deleteBookmark(id: string) {
  try {
    const db = await getEnhancedPrisma();
    const bookmark = await db.bookmark.delete({ where: { id } });
    revalidatePath(`/collections/${bookmark.collectionId}`);
    return { success: true };
  } catch (error) {
    console.error("deleteBookmark error:", error);
    return { success: false, error: "Failed to delete bookmark" };
  }
}
