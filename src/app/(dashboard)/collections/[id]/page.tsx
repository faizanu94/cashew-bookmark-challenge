// =============================================================================
// Collection Detail Page - CANDIDATE IMPLEMENTS
// =============================================================================
// Display a single collection with its bookmarks and settings.
//
// Requirements:
// - Fetch collection by ID with bookmarks using getEnhancedPrisma()
// - Bookmarks tab: list bookmarks with add/edit/delete functionality
// - Settings tab: edit collection details and share settings
// =============================================================================

import { notFound } from "next/navigation";
import Link from "next/link";
import { BookmarksList } from "@/components/bookmarks-list";
import { CreateBookmarkDialog } from "@/components/create-bookmark-dialog";
import { CollectionSettingsForm } from "@/components/collection-settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEnhancedPrisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface CollectionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const { id } = await params;

  // Fetch collection with bookmarks using getEnhancedPrisma()
  // If not found, call notFound()
  const user = await getCurrentUser();
  const db = await getEnhancedPrisma();
  const collection = await db.collection.findUnique({
    where: { id },
    include: { bookmarks: { orderBy: { createdAt: "desc" } } },
  });

  if (!collection || collection.ownerId !== user?.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{collection.name} ({collection.description})</h1>
          <p className="text-muted-foreground">Collection ID: {collection.id}</p>
        </div>

        <Link href="/collections" className="text-sm text-muted-foreground hover:underline">
          ← Back to Collections
        </Link>
      </div>

      <Tabs defaultValue="bookmarks">
        <TabsList>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="bookmarks" className="space-y-4">
          <div className="flex justify-end">
            <CreateBookmarkDialog collectionId={id} />
          </div>

          <BookmarksList bookmarks={collection.bookmarks} />
        </TabsContent>

        <TabsContent value="settings">
          <CollectionSettingsForm collection={collection} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
