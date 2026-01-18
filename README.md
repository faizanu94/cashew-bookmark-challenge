# Senior Fullstack Engineer Take-Home Challenge

## Bookmarks with Share Controls

**Time Estimate:** 2-3 hours

> **Note**: If you're new to ZenStack, budget an extra 30 minutes to review the documentation links provided.
> The access policy syntax may take some time to understand if you haven't used it before.

Build a bookmark management application where users can organize bookmarks into collections and share those collections with configurable access controls.

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (v8+)

If you don't have pnpm installed:
```bash
npm install -g pnpm
```

### Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
```

> **Note**: The `DATABASE_URL` path is relative to the Prisma schema at `src/db/prisma/schema.prisma`.
> If you have `DATABASE_URL` set in your shell environment (common for developers), it will override the `.env` file.
> Run `unset DATABASE_URL` before running the setup commands if you encounter database path errors.

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client from ZenStack schema
pnpm db:generate

# Create the database and seed test users
pnpm db:push
pnpm db:seed

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in as one of the test users.

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm db:generate` | Generate Prisma client from ZenStack schema |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:seed` | Seed database with test users |
| `pnpm db:reset` | Reset database and re-seed |
| `pnpm test` | Run tests with Vitest |

---

## Business Requirements

### 1. Collections Management (Full CRUD)

Users should be able to:
- **Create** new collections with a name and optional description
- **Read** a list of their collections and view individual collection details
- **Update** collection name, description, and share settings
- **Delete** collections (which also deletes all bookmarks within)

### 2. Bookmarks Management (Full CRUD)

Within each collection, users should be able to:
- **Create** bookmarks with a title, URL, and optional description
- **Read** all bookmarks in a collection
- **Update** bookmark details (title, URL, description)
- **Delete** individual bookmarks

### 3. Share Controls (three modes)

| Mode | Description |
|------|-------------|
| `PRIVATE` | Only the owner can view |
| `LINK_ACCESS` | Anyone with the URL can view (read-only) |
| `PASSWORD_PROTECTED` | Requires a password to view |

**Important Access Behavior:**
- When a collection is changed from `LINK_ACCESS` or `PASSWORD_PROTECTED` back to `PRIVATE`, all users except the owner immediately lose access
- There is no "grandfathering" of prior access — changing to `PRIVATE` revokes all external access

### 4. Public View

- Shareable URL for non-private collections (`/share/[slug]`)
- Password gate for protected collections (password only needs to be entered once per session)
- Read-only view of collection and its bookmarks

---

## Technical Requirements

> **⚠️ Important: This project uses ZenStack v2**
> 
> This starter is configured with **ZenStack v2.x** (not v3). Please ensure you reference the v2 documentation when implementing access policies and schema features.
>
> **Helpful ZenStack v2 Documentation:**
> - [ZModel Language Reference](https://zenstack.dev/docs/2.x/reference/zmodel-language)
> - [Access Policies](https://zenstack.dev/docs/2.x/the-complete-guide/part1/access-policy)
> - [Next.js App Router Quick Start](https://zenstack.dev/docs/2.x/quick-start/nextjs-app-router)
> - [Field-Level Access Control](https://zenstack.dev/docs/2.x/the-complete-guide/part1/access-policy/field-level)
> - [@omit Attribute](https://zenstack.dev/docs/2.x/reference/zmodel-language#omit) (for hiding sensitive fields like passwords)

> **📁 Schema File Location**
> 
> Only modify `src/db/schema.zmodel` — this is the ZenStack schema file. **Do not edit** the generated Prisma files in `src/db/prisma/`. When you run `pnpm db:generate`, ZenStack automatically generates the Prisma schema from your `.zmodel` file.

### 1. ZenStack Schema (`src/db/schema.zmodel`)

Extend the provided schema with `Collection` and `Bookmark` models:

```
Collection:
- id, name, description, slug (unique)
- shareMode (enum), sharePassword (hashed, @omit)
- owner relation to User
- bookmarks relation
- timestamps

Bookmark:
- id, title, url, description
- collection relation
- timestamps

Access Policies:
- Use @@allow rules to enforce access control
- Collections: owner can CRUD, others can read if not PRIVATE
- Bookmarks: inherit access from parent collection
```

#### Handling Passwords in ZenStack

For the `sharePassword` field on collections, ZenStack provides two important attributes:

**`@password`** — Automatically hashes the field value using bcryptjs before storing:
```zmodel
sharePassword String? @password
```

**`@omit`** — Ensures the field is never returned in query results from the enhanced client:
```zmodel
sharePassword String? @password @omit
```

> **⚠️ Important:** Always use both `@password` and `@omit` together for password fields. The `@omit` attribute prevents the hashed password from being exposed to the client, even accidentally.
>
> 📖 [ZenStack Password & Omit Documentation](https://zenstack.dev/docs/2.x/the-complete-guide/part1/other-enhancements)

### 2. Server Actions

Implement the functions in `src/lib/actions/`:

**Collections (`src/lib/actions/collections.ts`):**
- `createCollection(data)` - Create a new collection
- `updateCollection(id, data)` - Update collection (including share settings)
- `deleteCollection(id)` - Delete collection and its bookmarks
- `verifySharePassword(slug, password)` - Verify password for protected collections

**Bookmarks (`src/lib/actions/bookmarks.ts`):**
- `createBookmark(data)` - Add bookmark to collection
- `updateBookmark(id, data)` - Update bookmark
- `deleteBookmark(id)` - Delete bookmark

Requirements:
- Use Zod for input validation
- Use `getEnhancedPrisma()` for database operations
- Hash passwords with bcryptjs before storing

### 3. Pages

| Route | Description |
|-------|-------------|
| `/collections` | List user's collections with create dialog |
| `/collections/[id]` | Collection detail with bookmarks, share settings |
| `/share/[slug]` | Public share page with access control |

### 4. Tests

Implement tests in `src/__tests__/share-access.test.ts`:

```typescript
describe('Collection Share Access', () => {
  it('owner can always access their collection');
  it('PRIVATE collection is not accessible to others');
  it('LINK_ACCESS collection is readable by anyone');
  it('PASSWORD_PROTECTED requires correct password');
  it('changing shareMode to PRIVATE revokes access from non-owners');
});
```

> **Expected Behavior**: The tests will fail initially because the `Collection` and `Bookmark` models don't exist yet.
> After implementing the schema correctly, all 10 implemented tests should pass (7 are TODO placeholders).

#### Custom Test Requirement

In addition to passing the provided tests, write **one additional test case** for the following scenario:

> "Verify that when a collection is deleted, all of its bookmarks are also deleted (cascade delete)."

This tests your understanding of the data model and your ability to write meaningful tests.

---

## Code Review Challenge

The `verifySharePassword` function in `src/lib/actions/collections.ts` contains a **partial implementation with security issues**.

As part of this challenge:
1. Identify the security and correctness issues in this function
2. Fix the implementation
3. Document the issues you found in the Design Decisions section below

**Hint**: There are at least 3 significant issues with this code.

---

## What's Provided

### Fully Implemented (do not modify)

| File | Description |
|------|-------------|
| `src/db/schema.zmodel` | Base schema with User model and ShareMode enum |
| `src/db/prisma.ts` | Prisma client singleton |
| `src/db/prisma/seed.ts` | Seed script with test users |
| `src/lib/auth.ts` | Mock authentication helpers |
| `src/lib/db.ts` | ZenStack enhanced Prisma client (`getEnhancedPrisma`) |
| `src/app/layout.tsx` | Root layout with Toaster |
| `src/app/(dashboard)/layout.tsx` | Auth-protected layout with navbar |
| `src/app/page.tsx` | Login page with user picker |
| `src/components/ui/*` | Shadcn UI components (Card, Button, Dialog, Tabs, etc.) |

### Scaffolded with TODOs (you implement)

These files have structure and detailed comments to guide you:

| File | What's There | What You Add |
|------|--------------|--------------|
| `src/lib/actions/collections.ts` | Function signatures, Zod schemas (commented), hints | Actual implementation logic |
| `src/lib/actions/bookmarks.ts` | Function signatures, Zod schemas (commented), hints | Actual implementation logic |
| `src/app/(dashboard)/collections/page.tsx` | Page layout, commented examples | Fetch collections, render list, create dialog |
| `src/app/(dashboard)/collections/[id]/page.tsx` | Page layout, commented examples | Fetch collection, bookmarks CRUD, settings UI |
| `src/app/share/[slug]/page.tsx` | Page layout, commented examples | Public view, password gate component |
| `src/__tests__/share-access.test.ts` | Test structure, some implemented tests | Pass the tests, optionally add more |

> **💡 Tip:** The scaffolded files contain commented code snippets showing the expected patterns. Uncomment and adapt them rather than starting from scratch.

---

## Evaluation Rubric

| Category | Weight | Criteria |
|----------|--------|----------|
| **ZenStack Schema Design** | 20% | Proper relationships, access policies, password handling |
| **Server Actions** | 20% | Type safety, error handling, enhanced client usage |
| **React Components** | 20% | Clean composition, loading/error states, form handling |
| **Share Access Logic** | 15% | Secure password verification, access mode enforcement |
| **Code Review** | 10% | Identified and fixed issues in `verifySharePassword` |
| **Testing** | 10% | Passing tests + custom cascade delete test |
| **Code Quality** | 5% | TypeScript strictness, naming, structure |

### Bonus Points (not required)

- Optimistic UI updates for bookmark operations
- URL validation on bookmark creation
- Favicon fetching for bookmarks
- Copy share link to clipboard functionality

### UI/UX Polish (Encouraged)

While the scaffolded components are functional, we encourage you to improve the overall look and feel of the application where possible:

- Add meaningful loading states and skeleton loaders
- Improve empty states with helpful messaging and calls-to-action
- Add subtle animations for better user feedback
- Ensure responsive design works well on mobile
- Consider accessibility (keyboard navigation, focus states, ARIA labels)
- Add visual hierarchy with typography and spacing

This is not required, but candidates who demonstrate attention to user experience will stand out.

---

## Time Allocation Guidance

| Phase | Time | Activities |
|-------|------|------------|
| Setup & Schema | 30 min | Review starter, design ZenStack schema, run migrations |
| Server Actions | 45 min | Implement CRUD actions with validation |
| Dashboard UI | 45 min | Collections list, detail page, bookmark management |
| Share Feature | 30 min | Public page, password gate, access logic |
| Testing & Polish | 30 min | Write tests, fix edge cases, cleanup |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Error validating datasource: URL must start with protocol file:" | Your shell has `DATABASE_URL` set. Run `unset DATABASE_URL` and retry. |
| Tests fail with "Cannot read properties of undefined" | Run `pnpm db:generate` after schema changes to regenerate the Prisma client. |
| Changes not reflecting in the app | Restart the dev server after running `pnpm db:generate`. |
| "cookies() is async" linter warning | In Next.js 15+, `cookies()` returns a Promise. Use `await cookies()`. |

---

## Submission

### Requirements

1. **Pull Request** — Create a PR on your own fork of this repository with detailed, atomic commits that show your work progression
2. **Demo Video** — Record a Loom video walking through your working application, demonstrating all features
3. **Code Walkthrough Video** — Record a second Loom video explaining the important code you wrote and your implementation decisions

Email your submission to **both**:
- rose@cashewresearch.com
- james@cashewresearch.com

**Include in your email:**
- Link to your Pull Request
- Link to your demo video
- Link to your code walkthrough video

### Completed Work Should Include

- ZenStack schema (`src/db/schema.zmodel`) with Collection and Bookmark models
- Server actions for collections and bookmarks (`src/lib/actions/`)
- Dashboard pages for managing collections/bookmarks
- Public share page with access control
- At least one passing Vitest test for share access logic

---

## Design Decisions

- Security Fixes in `verifySharePassword` documented [here](src/lib/actions/collections.ts#L155)
- Used server actions with Zod validation for type-safe form handling
- Leveraged ZenStack access policies to automatically enforce authorization at the data layer
- Implemented cascade delete via Prisma schema (`onDelete: Cascade`) for bookmark cleanup
- Used httpOnly cookies for password verification to prevent XSS attacks

---

## Questions?

If you have any questions about the requirements, please reach out to rose@cashewresearch.com or james@cashewresearch.com.

Good luck!
