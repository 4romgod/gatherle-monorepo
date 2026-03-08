# Image Upload Architecture

This document defines the agreed-upon structure, conventions, and implementation plan for user-generated image uploads
across all Gatherle entities.

---

## Bucket

Single private S3 bucket per environment: `gatherle-images-{stage}-{region}`

- All objects private by default (`BlockPublicAccess.BLOCK_ALL`)
- Access via pre-signed URLs only (upload: `PutObject`, read: `GetObject`)
- Bucket name exported from `S3BucketStack` and injected into the Lambda as `S3_BUCKET_NAME`

---

## S3 Key Structure

All keys follow a consistent, entity-scoped pattern:

```
{stage}/{entityType}s/{entityId}/{imageType}-{uuid}.{ext}
```

Where `{stage}` is `dev`, `beta`, or `prod` (lowercase, from `STAGE` env var).

| Entity       | Image type               | Example key                                  |
| ------------ | ------------------------ | -------------------------------------------- |
| User         | Avatar / profile picture | `beta/users/{userId}/avatar-{uuid}.jpg`      |
| Organization | Logo                     | `beta/organizations/{orgId}/logo-{uuid}.png` |
| Event        | Featured / cover image   | `beta/events/{eventId}/featured-{uuid}.jpg`  |
| Venue        | Featured image           | `beta/venues/{venueId}/featured-{uuid}.jpg`  |
| Venue        | Gallery images           | `beta/venues/{venueId}/gallery-{uuid}.jpg`   |

**User images**: the `entityId` is always resolved server-side from the authenticated user's JWT — the client cannot
supply it.

**Organization / Event / Venue**: the client passes `entityId`. During entity creation (before an ID exists), `entityId`
may be omitted; the resolver generates a random UUID so the key is still non-colliding.

**Naming rule:** the UUID suffix is mandatory. User-supplied strings never form the full key.

---

## Domain Model → Image Field Mapping

| Type file                                    | GraphQL type                                                           | Image field(s)                                   | Upload page(s)                               |
| -------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| `packages/commons/lib/types/user.ts`         | `User` / `UpdateUserInput`                                             | `profile_picture: String`                        | EditProfilePage                              |
| `packages/commons/lib/types/organization.ts` | `Organization` / `CreateOrganizationInput` / `UpdateOrganizationInput` | `logo: String`                                   | CreateOrganizationPage, EditOrganizationPage |
| `packages/commons/lib/types/event.ts`        | `Media` (nested in `Event`)                                            | `featuredImageUrl: String` inside `media: Media` | EventMutationForm (create + edit)            |
| `packages/commons/lib/types/venue.ts`        | `Venue` / `CreateVenueInput` / `UpdateVenueInput`                      | `featuredImageUrl: String`, `images: [String]`   | CreateVenuePage, EditVenuePage               |

---

## Local Development

Image uploads in local dev point at the **Beta S3 bucket** directly. There is no dev-stage bucket.

Stage-prefixed keys keep dev and beta objects cleanly separated within the shared bucket:

- Dev uploads land in `dev/users/{userId}/avatar-{uuid}.jpg`, `dev/organizations/{orgId}/logo-{uuid}.png`, etc.
- Beta uploads land in `beta/users/{userId}/avatar-{uuid}.jpg`, etc.

### Setup

**`apps/api/.env.local`**

```
S3_BUCKET_NAME=gatherle-images-beta-af-south-1
STAGE=Dev
# Add localhost to the Beta bucket's CORS allowed origins:
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

**`apps/webapp/.env.local`**

```
NEXT_PUBLIC_S3_IMAGES_URL=https://gatherle-images-beta-af-south-1.s3.af-south-1.amazonaws.com
```

The API uses `STAGE=Dev` so all keys are prefixed `dev/`, keeping them separate from real Beta data. Local AWS
credentials must have `s3:GetObject` / `s3:PutObject` on the bucket (the same credentials used for CDK work).

---

```
User selects file
  │
  ├── FileReader preview (immediate, no network)
  │
  ├── POST getImageUploadUrl (GraphQL query)
  │     entityType: ImageEntityType  (e.g. Organization)
  │     imageType:  ImageType        (e.g. Logo)
  │     extension:  string           (e.g. "jpg")
  │     entityId?:  string           (omit for User; required for Org/Event/Venue)
  │     → returns { uploadUrl, key, readUrl, publicUrl }
  │
  ├── PUT {file} → uploadUrl (direct S3 from browser)
  │
  └── Store readUrl in component state → submitted with the form
```

All authentication is enforced by the `@Authorized` decorator on `getImageUploadUrl`; the Lambda IAM role grants
`s3:PutObject` on the bucket (see `s3BucketStack.imagesBucket.grantReadWrite(graphqlStack.graphqlLambda)`).

---

## ⚠️ Known Issue: `readUrl` Expires

`getPresignedUrl` currently defaults to `expiresIn = 3600s` (1 hour). Storing the resulting URL in the database means
image URLs break after an hour.

### Short-term fix (immediate)

Extend the expiry when called from the image resolver to 7 days:

```ts
// apps/api/lib/graphql/resolvers/image.ts
const readUrl = await getPresignedUrl(key, 604800); // 7 days
```

This makes the bug non-critical in practice while the proper solution is implemented.

### Long-term fix

Store the S3 **`key`** in the database field (not the URL). Hydrate a fresh pre-signed read URL at query time inside the
resolver, or serve images through a CloudFront distribution with a permanent custom URL.

| Option                                | Description                                                               | Effort                                        |
| ------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| **Store key + hydrate at query time** | Model fields hold keys; resolvers call `getPresignedUrl` before returning | Medium — requires resolver changes per entity |
| **CloudFront distribution**           | CDN in front of the bucket; objects have permanent, cacheable URLs        | Medium — CDK infrastructure change            |

CloudFront is the production-grade end state. Key hydration is the interim step before CDK investment.

---

## Accepted Formats & Limits

Consistent across all upload points:

| Constraint                  | Value                                                           |
| --------------------------- | --------------------------------------------------------------- |
| Accepted MIME types         | `image/jpeg`, `image/png`, `image/webp`, `image/gif`            |
| Max file size               | 5 MB (enforced client-side before requesting the presigned URL) |
| Max gallery images (venue)  | 10                                                              |
| Presigned upload URL expiry | 15 minutes (`expiresIn: 900` in `getPresignedUploadUrl`)        |

---

## Shared Upload Hook

All upload UI goes through a single reusable hook to avoid duplicating the fetch flow in every component.

**Location:** `apps/webapp/hooks/useImageUpload.ts`

```ts
import { ImageEntityType, ImageType } from '@/data/graphql/types/graphql';

interface UseImageUploadOptions {
  entityType: ImageEntityType;
  imageType: ImageType;
  entityId?: string; // omit for User (resolved server-side from JWT)
}

function useImageUpload(options: UseImageUploadOptions): {
  upload: (file: File) => Promise<string>; // resolves to readUrl
  uploading: boolean;
  error: string | null;
  preview: string | null; // local FileReader data URL (shows immediately)
  reset: () => void;
};
```

- Internally calls `useLazyQuery(GetImageUploadUrlDocument)`
- Accepts `ImageEntityType` and `ImageType` enum values — no raw strings
- Handles `FileReader` preview generation
- Performs the S3 `PUT` via `fetch`
- Manages `uploading` / `error` state
- Returns the final `readUrl` from S3

---

## Implementation Order

| Step | Task                                                                                        | Scope        | Status  |
| ---- | ------------------------------------------------------------------------------------------- | ------------ | ------- |
| 1    | Add `ImageEntityType` / `ImageType` enums to `packages/commons`                             | API          | ✅ Done |
| 2    | Redesign `getImageUploadUrl` resolver — enum params + entity-ID key structure               | API          | ✅ Done |
| 3    | Emit schema + run codegen                                                                   | API / Webapp | ✅ Done |
| 4    | Update webapp GQL query to new variables                                                    | Webapp       | ✅ Done |
| 5    | Update `CreateOrganizationPage` caller                                                      | Webapp       | ✅ Done |
| 6    | Update `EditProfilePage` caller                                                             | Webapp       | ✅ Done |
| 7    | **Fix expiry bug** — extend `readUrl` presigned URL expiry to 7 days in `image.ts` resolver | API          | ⬜      |
| 8    | **Create `useImageUpload` hook**                                                            | Webapp       | ⬜      |
| 9    | **Refactor `CreateOrganizationPage`** onto the hook                                         | Webapp       | ⬜      |
| 10   | **Refactor `EditProfilePage`** onto the hook                                                | Webapp       | ⬜      |
| 11   | **`EditOrganizationPage`** — logo upload                                                    | Webapp       | ⬜      |
| 12   | **`EventMutationForm`** (create + edit) — featured image                                    | Webapp       | ⬜      |
| 13   | **`CreateVenuePage` / `EditVenuePage`** — featured + gallery                                | Webapp       | ⬜      |
| 14   | **Store `key` instead of URL** (+ resolver hydration or CloudFront)                         | API + Webapp | ⬜      |

---

## Current Status

| Page                         | Entity       | Field                        | Upload UI                 |
| ---------------------------- | ------------ | ---------------------------- | ------------------------- |
| `EditProfilePage`            | User         | `profile_picture`            | ✅ implemented            |
| `CreateOrganizationPage`     | Organization | `logo`                       | ✅ implemented (pre-hook) |
| `EditOrganizationPage`       | Organization | `logo`                       | ❌ missing                |
| `EventMutationForm` (create) | Event        | `media.featuredImageUrl`     | ❌ missing                |
| `EventMutationForm` (edit)   | Event        | `media.featuredImageUrl`     | ❌ missing                |
| `CreateVenuePage`            | Venue        | `featuredImageUrl`, `images` | ❌ missing                |
| `EditVenuePage`              | Venue        | `featuredImageUrl`, `images` | ❌ missing                |
