// =============================================================================
// Collection Settings Form - CANDIDATE IMPLEMENTS
// =============================================================================
// Form for editing collection settings including share mode and password.
//
// TODO:
// - Add state for form fields
// - Call updateCollection action on save
// - Show password field only when shareMode is PASSWORD_PROTECTED
// - Show shareable URL only when shareMode is not PRIVATE
// - Handle loading/error states
// =============================================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShareModeSelect } from "@/components/share-mode-select";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCollection, deleteCollection } from "@/lib/actions/collections";
import { Copy } from "lucide-react";
import { toast } from "sonner";

type ShareMode = "PRIVATE" | "LINK_ACCESS" | "PASSWORD_PROTECTED";

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  shareMode: ShareMode;
}

interface CollectionSettingsFormProps {
  collection: Collection;
}

export function CollectionSettingsForm({ collection }: CollectionSettingsFormProps) {
  const router = useRouter();
  const [shareMode, setShareMode] = useState<ShareMode>(collection.shareMode);
  const [sharePassword, setSharePassword] = useState("");
  const [loading, setLoading] = useState<"details" | "share" | "delete" | null>(null);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/${collection.slug}`
    : `/share/${collection.slug}`;

  async function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("details");
    const formData = new FormData(e.currentTarget);
    const result = await updateCollection(collection.id, {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    });
    setLoading(null);
    if (result.success) {
      toast.success("Details updated!");
    } else {
      toast.error(result.error || "Failed to update details");
    }
  }

  async function handleSaveShare(e: React.FormEvent) {
    e.preventDefault();
    setLoading("share");

    const data: { shareMode: ShareMode; sharePassword?: string } = { shareMode };

    if (shareMode === "PASSWORD_PROTECTED" && sharePassword) {
      data.sharePassword = sharePassword;
    }

    const result = await updateCollection(collection.id, data);

    setLoading(null);

    if (result.success) {
      toast.success("Share settings updated!");
      setSharePassword("");
    } else {
      toast.error(result.error || "Failed to update share settings");
    }
  }

  async function handleDelete() {
    setLoading("delete");
    const result = await deleteCollection(collection.id);
    setLoading(null);

    if (result.success) {
      toast.success("Collection deleted!");
      router.push("/collections");
    } else {
      toast.error(result.error || "Failed to delete collection");
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Details</CardTitle>
          <CardDescription>Update your collection name and description.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={collection.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={collection.description ?? ""}
                placeholder="What's this collection about?"
              />
            </div>
            <Button type="submit" disabled={loading === "details"}>
              {loading === "details" ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Share Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Share Settings</CardTitle>
          <CardDescription>Control who can access this collection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSaveShare} className="space-y-4">
            <div className="space-y-2">
              <Label>Share Mode</Label>
              <ShareModeSelect value={shareMode} onChange={setShareMode} />
            </div>

            {/* Show password field when PASSWORD_PROTECTED */}
            {shareMode === "PASSWORD_PROTECTED" && (
              <div className="space-y-2">
                <Label htmlFor="password">Share Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Enter a password"
                />
                <p className="text-xs text-muted-foreground">
                  Visitors will need this password to view the collection.
                </p>
              </div>
            )}

            {/* Show shareable URL when not PRIVATE */}
            {shareMode !== "PRIVATE" && (
              <div className="space-y-2">
                <Label>Shareable URL</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast.info("Link copied!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading === "share"}>
              {loading === "share" ? "Updating..." : "Update Share Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this collection and all its bookmarks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteConfirmDialog
            title="Delete Collection"
            description={`Are you sure you want to delete "${collection.name}"? This will permanently delete the collection and all its bookmarks.`}
            onConfirm={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
