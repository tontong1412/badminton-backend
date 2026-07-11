# Changelog (Compared to `main`)

Generated: 2026-06-20
Branch: `fix/cancel-booking`

## Commit delta
- Ahead of `main` by 1 commit
- `6c17a7a` - audit booker

## File changes
- Modified: `src/controllers/bookings/createRecurring.ts`
- Modified: `src/controllers/bookings/createSingle.ts`
- Modified: `src/controllers/resale/purchaseListing.ts`
- Modified: `src/schema/booking.ts`
- Modified: `src/type.ts`

## Functional changes
- Added `createdByUserID` assignment in booking creation flows:
  - recurring bookings
  - single bookings
  - resale purchase bookings
- Expanded `bookerType` to support `admin`.
- Extended booking model/types with optional `createdByUserID`.
- Added schema validation to require `userID` when `bookerType` is `user`.

## Diff stats
- 5 files changed
- 27 insertions, 4 deletions
