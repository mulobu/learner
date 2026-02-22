# Cloudflare Pages Frontend Deployment

This setup deploys the frontend to Cloudflare Pages from GitHub Actions with CI checks and no repo-stored environment values.

Workflow file:
- `.github/workflows/frontend-cloudflare-pages.yml`

## Pipeline behavior

- Pull request to `main` (frontend changes):
  - Runs frontend CI (`npm ci`, `npm run lint`, `npm run build`)
  - Deploys a preview build to Cloudflare Pages (branch `pr-<number>`)
- Push to `main` (frontend changes):
  - Runs frontend CI
  - Deploys production build to Cloudflare Pages (branch `main`)

## Required GitHub configuration

### Secrets

Create in `Settings -> Secrets and variables -> Actions`:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_API_TOKEN`

Recommended token scope: minimal permissions needed to deploy Pages for a single account/project.

### Variables

Create these repository variables:

- `CLOUDFLARE_PAGES_PROJECT_NAME`
- `VITE_API_URL`
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`
- `VITE_AUTH0_REDIRECT_URI` (optional)

## Important security rule

`VITE_*` values are embedded into the browser bundle and are always public at runtime.

- Do not store backend secrets, API private keys, or tokens in any `VITE_*` variable.
- Keep sensitive values only in backend/Fly secrets.

## One-time Cloudflare setup

1. Create a Cloudflare Pages project (if it does not exist yet):
```bash
npx wrangler pages project create <your-project-name>
```

2. Set `CLOUDFLARE_PAGES_PROJECT_NAME` in GitHub Variables to that exact project name.

3. Push to `main` (or open a PR) to trigger deployments.
