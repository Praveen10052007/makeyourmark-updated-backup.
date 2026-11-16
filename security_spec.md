# Security Specification & Red Team Test Plan

## 1. Data Invariants
1. Zero-Trust Isolation: Every document under `/users/{userId}` and its subcollections (`notes`, `tasks`, `roadmaps`, `resumes`) contains PII or private study data and is readable/writable ONLY when `request.auth != null && request.auth.uid == userId && request.auth.token.email_verified == true`.
2. Identity Integrity: Incoming `uid` / `userId` must match `request.auth.uid` on create and remain immutable on update.
3. No Shadow / Ghost Fields: Every `create` checks both `keys().hasAll(...)` and `keys().hasOnly(...)`; every `update` validates `isValid[Entity](incoming())` and checks `affectedKeys().hasOnly(...)`.
4. Temporal Integrity: `createdAt == request.time` on create; `createdAt == existing().createdAt` and `updatedAt == request.time` on update.
5. ID & Size Hardening: Every path ID uses `isValidId(id)` (`^[a-zA-Z0-9_\-]+$` max 128 chars), every string has explicit `.size()` bounds, and every list has explicit `.size()` bounds.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read on `/users/uid_1` -> Denied (`request.auth == null`).
2. Cross-user read on `/users/uid_2/notes/note_1` by `uid_1` -> Denied (`uid != userId`).
3. Unverified email write on `/users/uid_1` (`email_verified: false`) -> Denied.
4. UID spoofing on create `/users/uid_1/notes/n1` with `userId: "uid_2"` -> Denied.
5. Shadow field injection (`isAdmin: true`) on `/users/uid_1` create -> Denied (`hasOnly` check).
6. Oversized ID poisoning (200-char doc ID or invalid chars `../hack`) -> Denied (`isValidId`).
7. Timestamp spoofing (`createdAt` backdated client timestamp) -> Denied (`== request.time`).
8. Immutable field tampering (`createdAt` or `userId` modified in update) -> Denied.
9. Oversized payload DoW (`content` > 50,000 chars in `StudyNote`) -> Denied.
10. Invalid enum injection (`category: "HackCategory"` or `priority: "Critical"` in `WeeklyTaskItem`) -> Denied.
11. Unbounded list injection (`tags` list > 20 items in `StudyNote`) -> Denied.
12. Blanket `list` query on `/users` collection -> Denied (no list rule on `/users`).
