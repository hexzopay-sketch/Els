# Simulation: mongodb-broadcast-overhaul
Created: 2026-06-18T18:49:49.084Z

## Plan
Phase 1: StorageBackend interface
- cnc/config.go: load config.json, expose DB type + URI
- cnc/storage.go: StorageBackend interface (all CRUD methods)
- cnc/database_sqlite.go: SQLiteBackend implementing StorageBackend
- cnc/database_mongo.go: MongoDBBackend implementing StorageBackend
- cnc/database.go: global var, initStorage() reads config, instantiates backend
- miscellaneous.go save functions call storage.Save*(...) instead of mustExec
Phase 2: Broadcast system
- cnc/storage.go: add Broadcast CRUD to interface
- Both backends implement broadcast methods
- cnc/web.go: GET/POST /api/broadcasts (active), DELETE /api/broadcasts/{id}
- Admin tab: BroadcastManagement.tsx
- BroadcastPopup.tsx on / page (shown on refresh)
Phase 3: Security
- Rate limiter middleware (token bucket) on login/register
- Input length/size limits
- CORS headers
- Broadcast API docs in admin
Phase 4: Animations
- Replace motion-variants.ts with unified subtle variants
- Replace heavy animations with the CSS loader styles user provided
- Add --loader CSS classes to globals.css

## Files Affected
cnc/config.go, cnc/storage.go, cnc/database.go, cnc/database_sqlite.go, cnc/database_mongo.go, cnc/miscellaneous.go, cnc/web.go, cnc/main.go, config.json, src/components/admin/BroadcastManagement.tsx, src/components/BroadcastPopup.tsx, src/app/page.tsx, src/app/globals.css, src/lib/motion-variants.ts

## Status: PENDING REVIEW
Review the plan and files above. Check for:
- Edge cases and error states
- Breaking changes to other files
- Missing imports or dependencies
- Type mismatches
- Security implications

## Result
- [ ] Simulation reviewed
- [ ] Edge cases handled
- [ ] No breaking changes
- [ ] Ready to execute