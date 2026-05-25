# PR Generation Prompt

## Trigger

User types `pr`, `generate pr`, or similar.

## Workflow

1. **Check staged changes** using `get_changed_files` tool with `sourceControlState: ['staged']`.

2. **Read and understand ALL staged changes** before generating any output.
   - Read every modified file's diff carefully.
   - If there are many staged files, ensure you go through all of them — do not skip or summarize unseen changes.
   - Understand the full scope: what was added, removed, refactored, and why.

3. **Generate the following PR materials**:

   ### Branch Name

   Follow git-flow conventions:
   - `feat/brief-description` - New features
   - `fix/brief-description` - Bug fixes
   - `chore/brief-description` - Maintenance, deps, config
   - `refactor/brief-description` - Code restructuring
   - `docs/brief-description` - Documentation updates
   - Use kebab-case, keep under 50 chars

   ### Commit Message

   Conventional commit format:
   - Format: `type(scope): subject`
   - Present tense, imperative mood
   - Examples:
     - `feat(webapp): add interests settings page`
     - `fix(api): handle null user interests`

   ### PR Title

   Clear, concise summary matching commit message format

   ### PR Description

   Include:
   - **Summary**: What changes were made and why
   - **Changes**: Bulleted list of key modifications by file/feature
   - **Testing**: Commands run, manual testing performed, test results
   - **Environment Variables**: Any new/modified env vars (if applicable)
   - **Screenshots/GIFs**: For UI changes in `apps/webapp` (note if applicable)
   - **Related Issues**: Link to issues/tickets (if known)

4. **Follow conventions** from "Commit & Pull Request Guidelines" section in AGENTS.md.

5. **Present all materials as RAW MARKDOWN TEXT** in a single code block that the user can copy-paste directly (do NOT
   render as formatted markdown, do NOT create a new file).

## Example Output Format

Present output as raw markdown in a code block:

````markdown
Branch Name: feat/interests-settings-page

Commit Message: feat(webapp): add user interests settings with session refresh

PR Title: feat(webapp): Add User Interests Settings with Session Refresh

PR Description:

## Summary

Implemented user interests management on settings page with automatic session refresh after updates.

## Changes

- Added `InterestsSettingsPage` component with modal for selecting interests
- Integrated `EventCategoryChip` for visual consistency
- Implemented session refresh using custom 'refresh-session' credentials provider
- Updated `updateUserProfileAction` to handle interests field

## Testing

- Manual testing: Updated interests, verified session refreshes without logout
- Tested on different screen sizes (mobile/desktop responsive)

## Environment Variables

None

## Screenshots

UI changes - screenshots recommended

```

```
````

## Formatting Rules

- **Do NOT use markdown links for file paths** — just use plain text paths (e.g., `apps/webapp/components/Foo.tsx`).
  Markdown file links do not render or work in PR descriptions on GitHub.
- Use backtick-wrapped inline code for file paths, component names, function names, etc.
- For backend changes, mention resolver/DAO/model changes
- For frontend changes, note component hierarchy and hook usage
- Include test results (unit, e2e, build status)
- Mention any breaking changes or migration steps
