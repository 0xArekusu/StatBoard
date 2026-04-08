---
name: Code style rules
description: Code style preferences enforced in this project
type: feedback
---

Comments must be in English, never French.

**Why:** Consistency across the codebase — the user enforces English-only comments.

**How to apply:** All JSDoc, inline comments, and block comments must be written in English.

---

Never use magic strings for subscription tiers. Use the `SUBSCRIPTION_TIER` constant from `models/Subscription.ts` (e.g. `SUBSCRIPTION_TIER.FREE` instead of `"free"`).

**Why:** There are enums/constants defined for this. Using raw strings bypasses type safety and breaks the established pattern.

**How to apply:** Whenever comparing or referencing subscription tiers, import and use `SUBSCRIPTION_TIER` from `models/Subscription.ts`.
