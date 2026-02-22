# Fly.io CI/CD Setup

This project now deploys backend changes to Fly.io through GitHub Actions without storing runtime env values in git.

## What the pipeline does

- Runs CI on pull requests and pushes to `main`:
  - Frontend: `npm ci`, `npm run lint`, `npm run build`
  - Backend: dependency install, syntax check, app import check
- Deploys only on push to `main` after CI passes.
- Syncs runtime env to Fly using `flyctl secrets set` (values come from GitHub Secrets).

Workflow file:
- `.github/workflows/ci-cd-fly.yml`

## One-time GitHub setup

Create these repository secrets in GitHub (`Settings -> Secrets and variables -> Actions`):

Required:
- `FLY_API_TOKEN`
- `DATABASE_URL`
- `STORAGE_MODE` (`r2` or `local`)
- `CORS_ORIGINS`
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Required when `STORAGE_MODE=r2`:
- `R2_BUCKET_NAME`
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Optional (recommended if you use them):
- `AUTH0_ISSUER`
- `AUTH0_ADMIN_ROLE`
- `AUTH0_ROLES_CLAIM`
- `AUTH0_JWKS_CACHE_SECONDS`
- `AUTH0_USERINFO_TIMEOUT_SECONDS`
- `CLOUDFLARE_MODEL`
- `YOUTUBE_API_KEY`
- `LLM_RATE_LIMIT`
- `YOUTUBE_RATE_LIMIT`
- `MAX_FILE_SIZE_MB`
- `DEBUG`
- `APP_NAME`
- `API_V1_PREFIX`

## One-time Fly setup

1. Create app (if not already created):
```bash
cd backend
flyctl apps create learner-api
```

2. Verify `backend/fly.toml` points to the right app:
- `app = "learner-api"`

3. Push to `main`.

## Security notes

- No runtime env values are stored in `backend/fly.toml` anymore.
- `.env` files remain gitignored and excluded from Docker build context.
- Secrets are injected from GitHub Secrets to Fly secrets at deploy time.
