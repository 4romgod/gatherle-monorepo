# Image Upload Architecture

This document defines the agreed-upon structure, conventions, and implementation plan for user-generated image uploads
across all Gatherle entities.

---

## Bucket

Single private S3 bucket per environment: `gatherle-images-{stage}-{region}`

- All objects private by default (`BlockPublicAccess.BLOCK_ALL`)
- Uploads use pre-signed `PutObject` URLs; reads in deployed environments use CloudFront URLs backed by the private
  bucket
- Bucket name exported from `S3BucketStack` and injected into the Lambda as `S3_BUCKET_NAME`
- CloudFront distribution domain exported from `S3BucketStack` and injected into the Lambda as `CF_IMAGES_DOMAIN`

---

## S3 Key Structure

All keys follow a consistent, entity-scoped pattern:

```
{stage}/{entityType}s/{entityId}/{filename}
```

Where `{stage}` is `dev`, `beta`, or `prod` (lowercase, from `STAGE` env var).

| Entity       | Image type               | Example key                                |
| ------------ | ------------------------ | ------------------------------------------ |
| User         | Avatar / profile picture | `beta/users/{userId}/avatar.jpg`           |
| Organization | Logo                     | `beta/organizations/{orgId}/logo.png`      |
| Event        | Featured / cover image   | `beta/events/{eventId}/featured.jpg`       |
| Venue        | Featured image           | `beta/venues/{venueId}/featured.jpg`       |
| Venue        | Gallery images           | `beta/venues/{venueId}/gallery-{uuid}.jpg` |

**User images**: the `entityId` is always resolved server-side from the authenticated user's JWT — the client cannot
supply it.

**Organization / Event / Venue**: the client passes `entityId`. During entity creation (before an ID exists), `entityId`
may be omitted; the resolver generates a random UUID so the key is still non-colliding.

**Naming rule:** gallery images get a UUID suffix so each upload is distinct; avatar, logo, and featured images reuse a
stable filename so the latest upload replaces the previous object for that slot. User-supplied strings never form the
full key.

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

Image uploads in local dev point at the **Beta S3 bucket** directly for the `PUT`, and reads still require the
configured CloudFront domain. There is no dev-stage bucket.

Stage-prefixed keys keep dev and beta objects cleanly separated within the shared bucket:

- Dev uploads land in `dev/users/{userId}/avatar-{uuid}.jpg`, `dev/organizations/{orgId}/logo-{uuid}.png`, etc.
- Beta uploads land in `beta/users/{userId}/avatar-{uuid}.jpg`, etc.

### Setup

**`apps/api/.env.local`**

```
S3_BUCKET_NAME=gatherle-images-beta-af-south-1
CF_IMAGES_DOMAIN=<your-images-cloudfront-domain>
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

## Read URL Behavior

- `readUrl` and `publicUrl` are always stable CloudFront URLs such as `https://<distribution-domain>/<key>`, so the URL
  stored in MongoDB does not expire.
- The API does not fall back to pre-signed `GetObject` URLs. If `CF_IMAGES_DOMAIN` is missing, `getImageUploadUrl` fails
  fast because an expiring URL is not acceptable for persistence.

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
  upload: (file: File) => Promise<string>; // resolves to the URL that should be persisted
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
- Returns the final media URL for persistence

---

## Implementation Order

| Step | Task                                                                                           | Scope        | Status  |
| ---- | ---------------------------------------------------------------------------------------------- | ------------ | ------- |
| 1    | Add `ImageEntityType` / `ImageType` enums to `packages/commons`                                | API          | ✅ Done |
| 2    | Redesign `getImageUploadUrl` resolver — enum params + entity-ID key structure                  | API          | ✅ Done |
| 3    | Emit schema + run codegen                                                                      | API / Webapp | ✅ Done |
| 4    | Update webapp GQL query to new variables                                                       | Webapp       | ✅ Done |
| 5    | Update `CreateOrganizationPage` caller                                                         | Webapp       | ✅ Done |
| 6    | Update `EditProfilePage` caller                                                                | Webapp       | ✅ Done |
| 7    | **Return stable media URLs** — CloudFront in front of the bucket with local presigned fallback | API + CDK    | ✅ Done |
| 8    | **Create `useImageUpload` hook**                                                               | Webapp       | ⬜      |
| 9    | **Refactor `CreateOrganizationPage`** onto the hook                                            | Webapp       | ⬜      |
| 10   | **Refactor `EditProfilePage`** onto the hook                                                   | Webapp       | ⬜      |
| 11   | **`EditOrganizationPage`** — logo upload                                                       | Webapp       | ⬜      |
| 12   | **`EventMutationForm`** (create + edit) — featured image                                       | Webapp       | ⬜      |
| 13   | **`CreateVenuePage` / `EditVenuePage`** — featured + gallery                                   | Webapp       | ⬜      |
| 14   | **Store `key` instead of URL** (+ resolver hydration)                                          | API + Webapp | ⬜      |

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
