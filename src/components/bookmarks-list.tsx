// =============================================================================
// Bookmarks List - CANDIDATE IMPLEMENTS
// =============================================================================
// Displays a list of bookmarks or an empty state.
//
// TODO:
// - Wire up onEdit and onDelete callbacks to bookmark actions
// - Handle loading states during delete
// =============================================================================

"use client";

import { BookmarkCard } from "@/components/bookmark-card";
import { EditBookmarkDialog } from "@/components/edit-bookmark-dialog";
import { deleteBookmark } from "@/lib/actions/bookmarks";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

interface BookmarkData {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  createdAt: Date;
}

interface BookmarksListProps {
  bookmarks: BookmarkData[];
  readonly?: boolean;
}

export function BookmarksList({ bookmarks, readonly = false }: BookmarksListProps) {
  const handleDelete = async (bookmark: BookmarkData) => {
    const result = await deleteBookmark(bookmark.id);
    if (result.success) {
      toast.success("Bookmark deleted!");
    } else {
      toast.error(result.error || "Failed to delete bookmark");
    }
  };

  if (bookmarks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Bookmark className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No bookmarks yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your first bookmark to this collection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          readonly={readonly}
          editDialog={!readonly ? <EditBookmarkDialog bookmark={bookmark} /> : undefined}
          onDelete={readonly ? undefined : handleDelete}
        />
      ))}
    </div>
  );
}
