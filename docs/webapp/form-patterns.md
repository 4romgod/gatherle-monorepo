# Form Patterns: Controlled vs Uncontrolled — Current State & Migration Plan

## Overview

This document captures the current state of form handling across the Gatherle webapp, explains the tradeoffs between
controlled and uncontrolled patterns, identifies the inconsistencies that have accumulated, and lays out a deliberate
migration plan.

The goal is not to pick one pattern for everything — it is to be **intentional** about which pattern fits which use case
and apply it consistently.

---

## Background: Controlled vs Uncontrolled

### Controlled Components

React owns the value. Every input has a `value` prop bound to state and an `onChange` handler that updates it. The DOM
reflects state; it never leads it.

```tsx
const [email, setEmail] = useState('');

<TextField value={email} onChange={(e) => setEmail(e.target.value)} name="email" />;
```

**When to use:**

- Real-time derived UI (character counts, password strength, field interdependencies)
- Complex cross-field validation that needs to run per-keystroke or per-blur
- When you need the values at any point in time, not just on submit
- MUI components that have no native HTML equivalent (`Select`, `Switch`, `DatePicker`, `Autocomplete`)

**Tradeoffs:**

| Pro                         | Con                                      |
| --------------------------- | ---------------------------------------- |
| Values accessible anytime   | Boilerplate per field                    |
| Easy real-time UI reactions | Re-render on every keystroke             |
| Straightforward testing     | Requires lifting state or a form library |

---

### Uncontrolled Components

The DOM owns the value. React does not track it until submit, at which point the native browser `FormData` API
serializes all `name=`-bearing inputs. Server Actions in Next.js 14+ make this pattern first-class.

```tsx
const [formState, formAction, isPending] = useActionState(loginAction, {});

<Box component="form" action={formAction}>
  <OutlinedInput name="email" type="email" /> {/* no value= */}
  <OutlinedInput name="password" type="password" />
</Box>;
```

**When to use:**

- Simple submit-and-process flows (auth, single-field settings)
- Forms using Next.js Server Actions where Zod validates on the server
- When progressive enhancement matters (form works without JS)
- When you have no need for the value between renders

**Tradeoffs:**

| Pro                            | Con                               |
| ------------------------------ | --------------------------------- |
| Minimal code and zero state    | No real-time access to values     |
| No re-renders on keystroke     | Can't do per-keystroke validation |
| Natural fit for Server Actions | MUI components need workarounds   |
| Progressive enhancement        | Cross-field logic is awkward      |

---

### The Hybrid Problem

The Gatherle settings forms reveal a genuine tension: **MUI components (`Select`, `Switch`, `DatePicker`) produce no
native `<input>` that the browser will serialize into `FormData`**. So when a form needs to use Server Actions _and_ MUI
components, a hybrid approach emerges:

1. Hold a local `useState` object to back the MUI component
2. Render a hidden `<input type="hidden" name="X" value={state.X} />` that the server action can read

This works but creates duplication — every MUI field effectively has two representations: the visible controlled input
and the hidden uncontrolled input that actually carries the data.

```tsx
// Current pattern in PersonalSettingsPage, EventSettingsPage, etc.
<Select value={settings.gender} onChange={handleChange}>...</Select>
<input type="hidden" name="gender" value={settings.gender || ''} />
```

This is not wrong, but it is inconsistent and error-prone. If state is updated but the hidden input is not (or vice
versa), the submitted value diverges silently.

---

## Current State Audit

### Pattern A — Pure Server Action (Uncontrolled) ✅

These forms are clean. Simple inputs, named for `FormData`, validated server-side with Zod.

| Form           | File                                       |
| -------------- | ------------------------------------------ |
| Register       | `components/forms/auth/Register.tsx`       |
| Login          | `components/forms/auth/Login.tsx`          |
| ForgotPassword | `components/forms/auth/ForgotPassword.tsx` |
| ResetPassword  | `components/forms/auth/ResetPassword.tsx`  |

**Status:** Correct pattern for the use case. No action needed.

---

### Pattern B — Pure Controlled (Apollo Mutation) ✅

These forms are also correct. They submit via Apollo mutations, not `FormData`, so uncontrolled/Server Action patterns
don't apply. All fields are controlled via `usePersistentState`.

| Form               | File                                                    |
| ------------------ | ------------------------------------------------------- |
| EventMutationForm  | `components/forms/eventMutation/index.tsx`              |
| EventDateInput     | `components/forms/eventMutation/EventDateInput.tsx`     |
| EventLocationInput | `components/forms/eventMutation/EventLocationInput.tsx` |
| VenueCreationForm  | `components/venue/VenueCreationForm.tsx`                |

**Status:** Correct pattern for the use case. No action needed.

---

### Pattern C — Hybrid SA (Controlled State + Hidden Inputs) ⚠️

These forms use Server Actions but also need MUI components, so they maintain controlled state and serialize it into
hidden inputs. This is the problematic surface area.

| Form                 | File                                           | Issue                                                                             |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| EditProfilePage      | `components/settings/EditProfilePage.tsx`      | Manual `FormData` construction via `useRef` + hidden inputs                       |
| PersonalSettingsPage | `components/settings/PersonalSettingsPage.tsx` | Every MUI input doubled with a hidden input                                       |
| EventSettingsPage    | `components/settings/EventSettingsPage.tsx`    | Entire `preferences` object serialized to one hidden JSON blob                    |
| AccountSettingsPage  | `components/settings/AccountSettingsPage.tsx`  | TextFields have both `value=` and `name=`, which is fine but accidental           |
| PasswordSettingsPage | `components/settings/PasswordSettingsPage.tsx` | Manually builds `FormData` in `handleChangePassword`, bypasses form serialization |

**Status:** Working but fragile and inconsistent. Target for consolidation.

---

### Pattern D — Hybrid (Controlled Visible + Hidden Serialization) ⚠️

These are shared input components embedded in both Server Action forms and Apollo forms.

| Component          | File                                           | Issue                                                      |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------- |
| LocationInput      | `components/forms/LocationInput.tsx`           | 3 visible controlled fields + 1 hidden JSON input          |
| AddressInput       | `components/forms/AddressInput.tsx`            | 5 visible controlled fields + 1 hidden JSON input          |
| VerifyEmailPending | `components/forms/auth/VerifyEmailPending.tsx` | Visitor path is controlled; session path is a hidden input |

**Status:** The serialization-to-hidden-JSON pattern is a reasonable adapter, but it should be explicit and documented
as a deliberate choice, not an emergent workaround.

---

## Target Architecture

There are two clean patterns to converge on. Every form should fit one of them.

### Target A — Server Action Form

Use for: auth, simple settings, any form that submits to a server action and whose fields map 1:1 to primitive HTML
inputs.

**Rules:**

- Use `useActionState` for state and pending
- Inputs are uncontrolled: `name=` only, no `value=` or `onChange=`
- Native inputs (`<input>`, `<textarea>`) or MUI components that render them transparently
- Validation is Zod on the server; client shows `formState.zodErrors`
- For MUI components with no native equivalent: see the `FormDataAdapter` pattern below

**Template:**

```tsx
'use client';
import { useActionState } from 'react';
import { myServerAction } from '@/data/actions/myAction';

export default function MyForm() {
  const [formState, formAction, isPending] = useActionState(myServerAction, {});

  return (
    <Box component="form" action={formAction} noValidate>
      <TextField
        name="email"
        type="email"
        error={!!formState.zodErrors?.email}
        helperText={formState.zodErrors?.email?.[0]}
        // no value= or onChange=
      />
      <Button type="submit" disabled={isPending}>
        Save
      </Button>
    </Box>
  );
}
```

---

### Target B — Controlled Form (Apollo / Client Submit)

Use for: any form that submits client-side (Apollo mutation, REST call, in-memory update).

**Rules:**

- All field values live in a single state object (or `useReducer` for complex forms)
- Every input has `value=` + `onChange=`
- No `name=` needed (unless also used in FormData, which is an anti-pattern here)
- No hidden inputs
- Validation can be client-side (Zod parse before submit) or derived per-field

**Template:**

```tsx
'use client';
import { useState } from 'react';

interface FormState {
  name: string;
  bio: string;
}

export default function MyForm() {
  const [form, setForm] = useState<FormState>({ name: '', bio: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    // call Apollo mutation or action directly
  };

  return (
    <Stack spacing={2}>
      <TextField name="name" value={form.name} onChange={handleChange} />
      <TextField name="bio" value={form.bio} onChange={handleChange} multiline />
      <Button onClick={handleSubmit}>Save</Button>
    </Stack>
  );
}
```

---

### The `FormDataAdapter` Pattern — For MUI in Server Action Forms

When a Server Action form needs a MUI component that doesn't render a native `<input>` (e.g., `Select`, `Switch`,
`DatePicker`), use a **self-contained adapter component** that owns minimal local state and emits a single hidden input.
This keeps the parent form uncontrolled and confines the controlled logic to one place.

```tsx
// components/forms/adapters/SelectAdapter.tsx
'use client';

interface Props {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  label: string;
}

export function SelectAdapter({ name, defaultValue = '', options, label }: Props) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <FormControl fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select value={value} onChange={(e) => setValue(e.target.value as string)} label={label}>
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );
}
```

```tsx
// SwitchAdapter, DatePickerAdapter follow the same pattern
```

**Benefits of this approach:**

- The parent form stays uncontrolled (clean `action={formAction}` form)
- Controlled state is encapsulated; no hidden inputs scattered through the parent
- Adapters are reusable and testable in isolation
- Eliminates the doubled-representation problem

---

## Migration Plan

### Phase 1 — Create Adapter Components (No Regressions)

Create the shared adapter components. These have no side effects and don't break anything.

- `components/forms/adapters/SelectAdapter.tsx`
- `components/forms/adapters/SwitchAdapter.tsx`
- `components/forms/adapters/DatePickerAdapter.tsx`
- `components/forms/adapters/AutocompleteAdapter.tsx`

Write unit tests for each. They should render the hidden input with the correct value and update it on interaction.

**Tracking:** WEB task — `WEB-FORM-01`

---

### Phase 2 — Consolidate Settings Forms (Highest Value)

The settings forms are the biggest source of fragmentation. Refactor each one to use either:

- **Target A** (Server Action + adapters) — for `PersonalSettingsPage`, `EventSettingsPage`, `AccountSettingsPage`
- **Target B** (controlled + client submit) — for `PasswordSettingsPage` (already close, just clean up the manual
  `FormData` construction)

**`PersonalSettingsPage` migration:**

Before:

```tsx
// Doubled representation for every MUI field
<Select value={settings.gender} onChange={...}>{...}</Select>
<input type="hidden" name="gender" value={settings.gender || ''} />
```

After:

```tsx
<SelectAdapter name="gender" defaultValue={settings.gender} options={genderOptions} label="Gender" />
```

**`EditProfilePage` migration:**

This form currently uses a `formRef` + manual `FormData` construction inside `startTransition`. Refactor to either:

- Use `action={formAction}` directly on the form (standard Server Action pattern), **or**
- Convert fully to controlled + Apollo/client submit (since it already has a complex save flow)

The ref-based manual dispatch is the worst of both worlds: it looks like a Server Action form but isn't.

**Tracking:** WEB task — `WEB-FORM-02`

---

### Phase 3 — Document and Lock LocationInput / AddressInput

`LocationInput` and `AddressInput` use the serialization-to-hidden-JSON pattern deliberately — they're adapters for
embedding a structured value (object) into a primitive `FormData` field. This is acceptable, but should be:

1. Explicitly documented with a JSDoc comment explaining the pattern
2. The hidden input should be co-located with its controlled fields, not separated
3. Write a unit test that asserts the hidden input's serialized value matches the controlled state

**Tracking:** WEB task — `WEB-FORM-03`

---

### Phase 4 — Enforce via Code Review Checklist

Add to the PR template (`apps/webapp/pull_request_template.md`):

```markdown
## Forms Checklist (if this PR touches form components)

- [ ] Is the form Server Action-based or client-/Apollo-based?
- [ ] If Server Action: are inputs uncontrolled (name= only, no value=)?
- [ ] If Server Action + MUI: is a FormDataAdapter used instead of inline hidden inputs?
- [ ] If controlled: does every input have value= + onChange=, with no name= unless needed?
- [ ] Are there any accidental doubled-representations (same field in both controlled input and hidden input)?
```

**Tracking:** WEB task — `WEB-FORM-04`

---

## Decision Table

Use this when adding a new form.

| Submits via         | Has MUI components? | Pattern                                         |
| ------------------- | ------------------- | ----------------------------------------------- |
| Server Action       | No                  | Target A (pure uncontrolled)                    |
| Server Action       | Yes                 | Target A + `FormDataAdapter` for each MUI field |
| Apollo mutation     | Any                 | Target B (pure controlled)                      |
| Client function     | Any                 | Target B (pure controlled)                      |
| Both (draft + save) | Any                 | Target B (controlled) + manual action call      |

---

## Summary

| Pattern                                  | Forms               | Status                    |
| ---------------------------------------- | ------------------- | ------------------------- |
| Pure Server Action (uncontrolled)        | Auth forms          | ✅ Correct                |
| Pure Controlled (Apollo)                 | Event/venue forms   | ✅ Correct                |
| Hybrid SA + hidden inputs                | Most settings forms | ⚠️ Refactor with adapters |
| LocationInput/AddressInput serialization | Shared inputs       | ⚠️ Document and test      |

The highest-leverage action is **Phase 1** (adapter components) — it unblocks all the settings form cleanup and
establishes the pattern for every future form that combines Server Actions with MUI components.
