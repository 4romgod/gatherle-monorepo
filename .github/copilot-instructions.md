# GitHub Copilot Instructions

This file contains project-specific guidelines for GitHub Copilot to follow when generating code, suggestions, and
making changes in this repository.

## General Principles

### Product Context

- **Read the product manual first for product-facing work**:
  - [docs/product/GATHERLE_PRODUCT_MANUAL.md](../docs/product/GATHERLE_PRODUCT_MANUAL.md)
- **Use the project brief for market and positioning context**:
  - [docs/project-brief.md](../docs/project-brief.md)
- **Gatherle is a social-first event discovery product**:
  - do not treat it like a generic event listings app
  - do not drift it into a generic social media app
- **People-first social proof beats raw counts**:
  - prefer participant, follower, community, venue, or moment context over anonymous counters when possible
- **Respect surface roles**:
  - Home is personal
  - Explore/Events is broad discovery
  - Moments are proof of life for events, venues, communities, and participation
  - Profile is identity through participation
- **Respect action hierarchy**:
  - RSVP is usually the primary event action
  - Save and Share are usually secondary
- **Ask what the change improves in the product loop**:
  - discovery
  - participation
  - trust
  - social proof
- **Avoid decorative complexity with weak product value**:
  - do not add generic social mechanics, clutter, or back-office-feeling consumer UI without a strong product reason

### Code Consistency

- **Follow existing patterns**: Always analyze and match the coding patterns, conventions, and architectural decisions
  already present in the codebase. Do not reinvent the wheel or introduce new patterns without explicit user permission.
- **Preserve style**: Match the formatting, naming conventions, and code organization used throughout the project.
- **Respect abstractions**: Use existing utilities, helpers, and shared components rather than creating new ones for
  similar functionality.

### Testing Requirements

- **Update tests with code changes**: Whenever you modify application code, ensure corresponding unit tests are updated
  or created.
- **e2e tests**: If changes affect API endpoints, GraphQL resolvers, or cross-module interactions, update or create e2e
  tests in `apps/api/test/e2e/`.
- **Test coverage**: Maintain or improve test coverage when adding new features or modifying existing functionality.

## Framework-Specific Guidelines

### Material-UI (@mui/material)

#### Grid Component

- **Use the new Grid API**: Material-UI Grid now uses the `size` prop instead of individual breakpoint props.

  ✅ **Correct:**

  ```tsx
  <Grid size={{ xs: 12, md: 6, lg: 4 }}>{/* content */}</Grid>
  ```

  ❌ **Incorrect (deprecated):**

  ```tsx
  <Grid xs={12} md={6} lg={4}>
    {/* content */}
  </Grid>
  ```

#### Avoid Deprecated APIs

- **Check component documentation**: Before using any MUI component or prop, ensure it's not deprecated. Prefer current
  APIs over legacy ones.
- **Common deprecations to avoid**:
  - Old Grid props (`xs`, `sm`, `md`, `lg`, `xl` as direct props)
  - Deprecated theme utilities
  - Legacy styling approaches (prefer `sx` prop over `makeStyles`)

### TypeScript

- **Strict typing**: Leverage TypeScript's type system fully. Avoid `any` unless absolutely necessary.
- **Shared types**: Use types from `packages/commons/lib/types` for shared domain models.
- **Type imports**: Use `import type` for type-only imports when possible.

### GraphQL

- **Generated types**: Always use generated types from `@/data/graphql/types/graphql` in the webapp.
- **Type safety**: Ensure GraphQL queries, mutations, and resolvers are properly typed.
- **Schema changes**: When modifying GraphQL schema, regenerate types and update affected code.

## Architecture Guidelines

### Monorepo Structure

- **Workspace boundaries**: Respect workspace boundaries. Shared code goes in `packages/commons`, not duplicated across
  workspaces.
- **Import paths**: Use path aliases defined in `tsconfig.base.json` (for example `@gatherle/commons/client/*` and
  `@gatherle/commons/server/*`).
- **Dependencies**: Add dependencies to the appropriate workspace's `package.json`, not the root unless it's a dev tool.

### API Development

- **Resolver patterns**: Follow existing resolver structure in `apps/api/lib/graphql/resolvers`.
- **Data access**: Use DAOs from `apps/api/lib/mongodb/dao` for database operations.
- **Validation**: Use Zod schemas in `apps/api/lib/validation/zod` for input validation.
- **Authentication**: Apply `@Authorized` decorator and ownership checks for protected operations.

### Frontend Development

- **Next.js patterns**: Follow App Router conventions and file-based routing.
- **Server components**: Use server components by default; opt into client components (`'use client'`) only when
  necessary.
- **Styling**: Use MUI's `sx` prop and the theme system. Tailwind is available for utility classes.
- **Constants**: Use centralized constants from `@/lib/constants` (routes, styles, spacing).
- **Product framing**:
  - prefer interfaces that help users decide whether something is worth attending
  - avoid repeating event metadata when it adds no new meaning
  - empty states should explain the gap and drive the next useful action

## Code Quality Standards

### Performance

- **Parallel operations**: Use `Promise.all()` for independent async operations.
- **ISR/SSR**: Leverage Next.js ISR (`export const revalidate = 60`) for pages with frequently changing data.
- **Minimize client bundles**: Avoid unnecessary client-side JavaScript.

### Error Handling

- **Graceful degradation**: Handle errors gracefully and provide meaningful feedback.
- **Logging**: Use appropriate logging levels and include context for debugging.
- **Type guards**: Use type guards and runtime validation for external data.

### Documentation

- **Complex logic**: Add comments explaining "why" for non-obvious code decisions.
- **JSDoc**: Use JSDoc comments for exported functions and types.
- **README updates**: Update relevant README files when adding new features or changing setup.

## Security & Configuration

### Environment Variables

- **Never commit secrets**: Use `.env` files (gitignored) for local development.
- **Document requirements**: Update `docs/environment-variables.md` when adding new env vars.
- **Type safety**: Add environment variable validation at application startup.

### Authentication & Authorization

- **JWT handling**: Use existing auth utilities in `apps/api/lib/utils/auth.ts`.
- **Authorization checks**: Verify ownership and permissions for all protected operations.
- **Token validation**: Always validate and decode tokens before trusting claims.

## Commit & PR Guidelines

### When Making Changes

- **Atomic commits**: Make focused, single-purpose commits.
- **Descriptive messages**: Use clear, present-tense commit messages (e.g., `feat: add event category validation`).
- **Test before commit**: Ensure all tests pass before committing changes.
- **Type check**: Run `npm run typecheck` to catch TypeScript errors.

### Pull Requests

- **Complete changes**: Include all related updates (code, tests, docs) in one PR.
- **Test evidence**: Document test runs and results in PR description.
- **Breaking changes**: Clearly flag and explain any breaking changes.

## Additional Resources

For more detailed information, see:

- [AGENTS.md](../AGENTS.md) - Complete repository guidelines
- [docs/product/GATHERLE_PRODUCT_MANUAL.md](../docs/product/GATHERLE_PRODUCT_MANUAL.md) - Canonical product context
- [docs/environment-variables.md](../docs/environment-variables.md) - Environment setup
- [apps/api/README.md](../apps/api/README.md) - API-specific guidelines
- [apps/webapp/README.md](../apps/webapp/README.md) - Frontend-specific guidelines

---

**Note**: This file is regularly updated. When adding new patterns or conventions to the codebase, update this file
accordingly to keep Copilot aligned with project standards.
