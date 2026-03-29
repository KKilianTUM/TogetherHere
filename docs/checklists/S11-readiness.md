# S11 Merge-Readiness Checklist

Status: **Ready to merge S11.1 baseline fixes**

- [x] Duplicate/conflicting auth middleware registration resolved (centralized middleware stack + split public/protected auth route modules).
- [x] Auth and middleware errors normalized to global error payload contract.
- [x] Missing/incorrect auth/cookie/cors env keys resolved with explicit config keys and environment defaults.
- [x] Route mount order normalized: public routes are mounted before protected auth routes.
- [x] App bootstrap normalized to one place for middleware wiring and one place for route wiring.
- [x] Error handler remains terminal middleware (notFound -> errorHandler last).
- [x] Pre-S11 security decisions documented in `docs/contracts/security-decisions.md`.
