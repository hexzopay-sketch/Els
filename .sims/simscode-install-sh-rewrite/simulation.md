# Simulation: install-sh-rewrite
Created: 2026-06-19T05:20:14.099Z

## Plan
Rewrite install.sh with --no-nginx and --no-systemd flags. --no-nginx uses Caddy instead of nginx+certbot for automatic HTTPS. --no-systemd uses pm2 instead of systemd for process management. Default (no flags) keeps existing nginx+systemd behavior.

## Files Affected
install.sh

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