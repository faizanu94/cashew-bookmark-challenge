"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  createdAt: Date;
}

interface BookmarkCardProps {
  bookmark: Bookmark;
  readonly?: boolean;
  editDialog?: React.ReactNode;
  onDelete?: (bookmark: Bookmark) => void;
}

export function BookmarkCard({
  bookmark,
  readonly = false,
  editDialog,
  onDelete,
}: BookmarkCardProps) {
  // Truncate URL for display
  const displayUrl = bookmark.url.length > 50
    ? bookmark.url.substring(0, 50) + "..."
    : bookmark.url;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline inline-flex items-center gap-1"
              >
                {bookmark.title}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </CardTitle>
            <CardDescription className="truncate">
              {displayUrl}
            </CardDescription>
          </div>

          {!readonly && (editDialog || onDelete) && (
            <div className="flex gap-1 flex-shrink-0">
              {editDialog}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(bookmark)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {bookmark.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {bookmark.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
