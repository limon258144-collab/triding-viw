# Security Specification

## Data Invariants
1. A user can only access their own profile.
2. A deposit request must have a valid `userId` matching the creator's `uid`.
3. Only an admin (defined in `users` collection) can update deposit statuses.
4. Only an admin can update the global `bkashNumber`.
5. Balance can only be incremented by the system (admin approval of a deposit).

## The "Dirty Dozen" Payloads
1. Attempt to create a user profile with `role: "admin"`. (Expect: DENY)
2. Attempt to update another user's balance. (Expect: DENY)
3. Attempt to create a deposit request with another user's `userId`. (Expect: DENY)
4. Attempt to update a deposit status from `pending` to `approved` as a normal user. (Expect: DENY)
5. Attempt to update the `bkashNumber` as a normal user. (Expect: DENY)
6. Attempt to delete a deposit record as a normal user. (Expect: DENY)
7. Attempt to inject a 1MB string into the `transactionId` field. (Expect: DENY)
8. Attempt to read the entire `users` collection as a normal user. (Expect: DENY)
9. Attempt to create a deposit with a negative amount. (Expect: DENY)
10. Attempt to update `createdAt` timestamp of a deposit. (Expect: DENY)
11. Attempt to read global `settings` as unauthenticated user. (Expect: DENY)
12. Attempt to spoof `uid` in a deposit request. (Expect: DENY)

## The Test Runner (Conceptual)
I'll implement these in `firestore.rules`.
