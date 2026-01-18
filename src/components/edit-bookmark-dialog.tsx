// =============================================================================
// Edit Bookmark Dialog - CANDIDATE IMPLEMENTS
// =============================================================================
// A dialog for editing existing bookmarks. Wire up the form submission.
//
// TODO:
// - Add state for form fields (or use form action)
// - Call updateBookmark action on submit with bookmark id
// - Handle loading/error states
// - Close dialog on success
// =============================================================================

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBookmark } from "@/lib/actions/bookmarks";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

interface EditBookmarkDialogProps {
  bookmark: {
    id: string;
    title: string;
    url: string;
    description?: string | null;
  };
  trigger?: React.ReactNode;
}

export function EditBookmarkDialog({
  bookmark,
  trigger,
}: EditBookmarkDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateBookmark(bookmark.id, {
      title: formData.get("title") as string,
      url: formData.get("url") as string,
      description: formData.get("description") as string,
    });

    setIsLoading(false);

    if (result.success) {
      toast.success("Bookmark updated!");
      setOpen(false);
    } else {
      toast.error(result.error || "Failed to update bookmark");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Bookmark</DialogTitle>
          <DialogDescription>Update your bookmark details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={bookmark.title}
              placeholder="My Bookmark"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              name="url"
              type="url"
              defaultValue={bookmark.url}
              placeholder="https://example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={bookmark.description ?? ""}
              placeholder="What's this bookmark about?"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
