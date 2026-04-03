# Storefront Login Auth - Progress Tracker (Vendor Setup Page Only)

## Plan Breakdown
1. [x] Edit src/pages/ManageVendorsPage.jsx: Add login guard with hardcoded creds.

## Completed Steps
- ✅ Added states, normalizePhone, handleLogin/Logout, useEffect load auth.
- ✅ Login form (phone/pw, error handling).
- ✅ Guard: if !auth → form, else content + logout btn.
- ✅ localStorage persist (`vendor_creator_auth`).

## Remaining
```
git add src/pages/ManageVendorsPage.jsx TODO.md
git commit -m "feat: Add phone/password auth guard to vendor setup page only"
git push
```
Test localhost:3000 → login (9994292890 / 123@Dragvin@qwerty) → create vendors. Only this page protected.

Delete TODO.md when done.

## After Edits
```
git add src/pages/ManageVendorsPage.jsx
git commit -m "Add auth guard to vendor setup page (phone/pw login)"
git push
```
Test: Visit / → login → enter phone & pw → vendor form. Only this page protected.

Delete when done.
