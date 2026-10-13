# Private download analytics setup

The analytics dashboard is available at `/analytics.html`. The page itself is not linked publicly,
and the data API requires a server-side bearer token.

Configure these Vercel environment variables for Production, Preview, and Development:

- `ADMIN_ANALYTICS_TOKEN`: a long random secret used to unlock the dashboard.
- `ANALYTICS_HASH_SECRET`: a different long random secret used to create privacy-preserving unique-download estimates.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`: the existing Upstash Redis connection.

After changing either secret, redeploy the site. Rotating `ANALYTICS_HASH_SECRET` starts a new unique
identity generation, so the same downloader may be counted again after rotation.

The dashboard also displays separate timestamped logs for visits and downloads, retaining the
most recent 2,000 events of each kind and displaying up to 250 per log in the selected date range. Each event stores
approximate location and classified client details plus a shortened, secret-keyed visitor fingerprint. Raw IP
addresses and full user-agent strings are never stored. Events recorded before this feature was deployed cannot
be reconstructed from the existing aggregate counters.

The **Recent visits** section includes tagged and untagged visits. Select `resume` in the tag
filter to view résumé visits, or select **Untagged**, which is always available even when there
are no untagged events in the initial view. Source filters search the latest 2,000 retained
events before returning up to 250 matches. Text search applies to the displayed events and
recognizes the label `Untagged` for events without a tag. Visit logging starts after deploying this update; earlier visit totals
remain available, but individual historical visit events cannot be recovered. Referring sites
are stored as hostnames, excluding URL paths and query strings.

Location, device, browser, language, source, version, and unique counts begin only after this code is
deployed. The existing all-time click counter remains intact, but historical details cannot be reconstructed.

## Website visits and downloads by source

Use `https://sonexis.ink/?ref=resume` as the hyperlink in every résumé. The displayed text can
remain `sonexis.ink`. Other links can use their own `ref` tag (1–64 letters, numbers, hyphens,
or underscores); tags are normalized to lowercase. Use campaign labels, not personal data.

The dashboard's **Traffic sources** section shows website visits and download-button clicks by
tag, plus an **Untagged** row, for the selected date range, including All time. A visit is one
homepage load; repeat visits and refreshes count again. React Strict Mode remounts do not count twice.
The latest valid tag is kept in session storage for download attribution in the same browser
tab until the tab closes or a new tag replaces it. Later homepage loads in that tab retain
the source for both visits and downloads. Loads and download clicks without a current or
remembered tag are counted as Untagged. If browser storage is blocked, attribution still
works on the current tagged page.

Download events also display the tag. Counts begin after deployment and cannot be recovered
for older visits or downloads. Untagged counts begin with the untagged-tracking deployment.
Existing historical download totals are not reclassified as untagged. These counts do not establish
who visited, whether a download completed, or whether the app was installed. Browser blockers
and automated link checks can affect the counts. Local development does not record traffic in Redis.

No additional environment variables are needed. Deploy the new `/api/visits` endpoint together
with the updated homepage, download endpoint, analytics endpoint, and dashboard.
