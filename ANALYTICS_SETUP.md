# Private download analytics setup

The analytics dashboard is available at `/analytics.html`. The page itself is not linked publicly,
and the data API requires a server-side bearer token.

Configure these Vercel environment variables for Production, Preview, and Development:

- `ADMIN_ANALYTICS_TOKEN`: a long random secret used to unlock the dashboard.
- `ANALYTICS_HASH_SECRET`: a different long random secret used to create privacy-preserving unique-download estimates.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`: the existing Upstash Redis connection.

After changing either secret, redeploy the site. Rotating `ANALYTICS_HASH_SECRET` starts a new unique
identity generation, so the same downloader may be counted again after rotation.

Location, device, browser, language, source, version, and unique counts begin only after this code is
deployed. The existing all-time click counter remains intact, but historical details cannot be reconstructed.
