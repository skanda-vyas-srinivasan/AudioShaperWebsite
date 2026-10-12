# Private download analytics setup

The analytics dashboard is available at `/analytics.html`. The page itself is not linked publicly,
and the data API requires a server-side bearer token.

Configure these Vercel environment variables for Production, Preview, and Development:

- `ADMIN_ANALYTICS_TOKEN`: a long random secret used to unlock the dashboard.
- `ANALYTICS_HASH_SECRET`: a different long random secret used to create privacy-preserving unique-download estimates.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`: the existing Upstash Redis connection.

After changing either secret, redeploy the site. Rotating `ANALYTICS_HASH_SECRET` starts a new unique
identity generation, so the same downloader may be counted again after rotation.

The dashboard also displays a timestamped log of the most recent 2,000 download events. Each event stores
approximate location and classified client details plus a shortened, secret-keyed visitor fingerprint. Raw IP
addresses and full user-agent strings are never stored. Events recorded before this feature was deployed cannot
be reconstructed from the existing aggregate counters.

Location, device, browser, language, source, version, and unique counts begin only after this code is
deployed. The existing all-time click counter remains intact, but historical details cannot be reconstructed.

## Tagged website visits and downloads

Use `https://sonexis.ink/?ref=resume` as the hyperlink in every résumé. The displayed text can
remain `sonexis.ink`. Other links can use their own `ref` tag (1–64 letters, numbers, hyphens,
or underscores); tags are normalized to lowercase. Use campaign labels, not personal data.

The dashboard's **Tagged traffic** section shows website visits and download-button clicks by
tag for the selected date range, including All time. A visit is one tagged homepage load;
repeat visits and refreshes count again. React Strict Mode remounts do not count twice.
The latest valid tag is kept in session storage for download attribution in the same browser
tab until the tab closes or a new tag replaces it. Untagged homepage loads do not add tagged
visits. If browser storage is blocked, attribution still works on the current tagged page.

Download events also display the tag. Counts begin after deployment and cannot be recovered
for older visits or downloads. These counts do not establish who visited, whether a download
completed, or whether the app was installed. Browser blockers and automated link checks can
affect the counts. Local development does not record traffic in Redis.

No additional environment variables are needed. Deploy the new `/api/visits` endpoint together
with the updated homepage, download endpoint, analytics endpoint, and dashboard.
