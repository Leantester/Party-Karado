# Party Karado Firestore Security Specification

## 1. Data Invariants
1. **Owner-Isolated PII**: `users/{userId}` and `booking_receipts/{bookingId}` contain private PII (`email`, `phone`, `guestName`, `guestPhone`, `guestEmail`, `specialRequests`, payment receipt details) and are readable only by the owning user, the relevant venue host (for `booking_receipts` and `conversations`), or an authenticated admin.
2. **Admin-Only Venue Management**: `venues/{venueId}` documents can be created, updated (including `isActive` toggles), or deleted strictly by an authenticated admin (`request.auth.token.admin == true`, verified admin email, or `/admins/{uid}` document).
3. **Public Non-PII Availability Queries & Double-Booking Prevention**: `bookings/{bookingId}` stores non-PII schedule metadata (`venueId`, `date`, `startHour`, `endHour`, `bookingStatus`) to power live overlapping-hour availability queries, while `runTransaction` atomically writes deterministic hourly `slot_locks/{venueId}__{date}__h{hour}` documents (`!exists()` + `existsAfter()`).
4. **Immutable Ownership & Timestamps**: `userId`, `hostId`, `guestId`, `createdAt` cannot be modified after creation, and `createdAt`/`updatedAt` must equal `request.time`.
5. **Master Gate on Subcollections**: `conversations/{conversationId}/messages/{messageId}` verifies participant membership by reading the parent `conversations/{conversationId}` document via `get()`.
6. **Terminal State Locking**: Once a booking reaches `cancelled` or `completed`, subsequent updates are blocked for non-admin users.
7. **Strict Schema & Size Guards**: Every document enforces exact key allowlists (`hasAll` + `hasOnly`), type checks, string `.size()` bounds, array `.size()` bounds, and `isValidId()` regex checks (`^[a-zA-Z0-9_\-]+$`).

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Non-Admin Venue Create/Update/Delete**: A regular customer creating, modifying `hourlyRate`/`isActive`, or deleting `/venues/{venueId}`.
2. **Identity Spoofing on User Create**: Creating `/users/victimUid` while authenticated as `attackerUid`.
3. **Privilege Escalation on User Profile**: Creating or updating `/users/attackerUid` with `"role": "admin"` or `"isAdmin": true`.
4. **Shadow Field Injection on Booking**: Creating a booking with an extra ghost key `"paymentStatusOverride": "free"`.
5. **Cross-User PII Scraping on Receipts**: Executing `getDocs(collection(db, 'booking_receipts'))` without a `where('userId', '==', auth.uid)` filter, or reading `/users/otherUid`.
6. **Inactive Venue Booking**: Creating a `slot_locks` or `bookings` record referencing a venue where `isActive == false` or non-existent `venueId`.
7. **Orphan Booking Without Lock**: Creating a booking without an atomic `slot_locks` document created in the same transaction (`existsAfter`).
8. **Timestamp Forgery**: Creating a booking, venue, or review with a backdated `createdAt` != `request.time`.
9. **Terminal State Re-opening**: Updating a `cancelled` booking back to `confirmed`.
10. **Oversized Payload / Denial of Wallet**: Creating a review or message with a 5,000-character string or a 2KB document ID.
11. **Unauthorized Message Injection**: Posting into `/conversations/conv1/messages/msg1` when `request.auth.uid` is neither `guestId` nor `hostId` of `conv1`.
12. **Unverified Email Write**: Attempting any write when `request.auth.token.email_verified == false`.
