# Private website and download analytics setup

The analytics dashboard is available at `/analytics.html`. The page itself is not linked publicly,
and the data API requires a server-side bearer token.

Configure these Vercel environment variables for Production, Preview, and Development:

- `ADMIN_ANALYTICS_TOKEN`: a long random secret used to unlock the dashboard.
- `ANALYTICS_HASH_SECRET`: a different long random secret used to create privacy-preserving unique-download estimates.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`: the existing Upstash Redis connection.
- `IPINFO_TOKEN` (optional): IPinfo Lite token for ASN and organization enrichment. The free Lite tier provides ASN data but not reliable residential, corporate, VPN, or proxy flags. Without this token those fields show as unavailable. The visitor's IP is sent server-side to IPinfo only when configured; it is never stored in Redis.

IPinfo documents the [Lite ASN fields](https://ipinfo.io/developers/lite-api) and the [additional privacy and network fields on higher tiers](https://ipinfo.io/developers/ipinfo-api). Vercel's [request headers](https://vercel.com/docs/headers/request-headers) provide the existing location fields but not the ASN organization used here.

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

No additional environment variables are required. Deploy the new `/api/visits` endpoint together
with the updated homepage, download endpoint, analytics endpoint, and dashboard.

## Engagement sessions and classification

Deploy `/api/engagement` with the other functions. New visits receive a random session ID and a separate bearer token. A session can span internal page navigation in the same tab. The server retains up to 100 recent events per session for seven days in Upstash Redis. The visit and download logs remain capped at 2,000 records each. No database migration or backfill is required: the new Redis keys are additive and historical records keep their original fields.

The browser sends batches about every 15 seconds, on visibility changes, and at page exit using `sendBeacon` where possible. Active time is accrued only while the tab is visible and within 30 seconds of load or user activity. Total time is the interval between the first and last observed server requests, so an abrupt close may leave it short. Scroll depth is the maximum percent. Click targets are safe paths, hostnames, or explicit identifiers; no typed content or URL query is sent. Do Not Track and Global Privacy Control opt visitors out of website tracking. Client events can be forged or blocked.

The classification score is an uncalibrated risk score, not a probability. Recognized scanner or bot user-agent strings add 5; a browser automation hint, rapid repeated batches, or multiple rapid page navigations add 2 each; hosting or cloud ASN and a very short ended session add 1 each. Score 4 or more means **Likely automated**. Score 0–1 with observable engagement (15 seconds active time, a click, at least 50% scroll, or two pages) means **Likely human**. Everything else is **Uncertain**. A hosting ASN alone never makes a visit automated. Zero clicks or scroll alone adds no risk. User-agent strings are unverified claims. This implementation has no verified bot identity signal. Each row displays its signals and limitations. Historical visits without a retained session show **Not recorded** for engagement and **Insufficient data** for classification unless a captured metadata signal is available.

The **Resume traffic** section summarizes visits tagged `resume` in the latest 2,000 retained visit records for the selected dates. Its filters search retained visits by classification, location, referring hostname, and recorded timing pattern; the table displays up to 250 matches. Historical visits without session events are assessed from retained metadata only. For each visit with a shortened visitor ID, the dashboard shows other actual recorded visits with that ID within 30 seconds on either side. Three visits within 10 seconds on either side add a weak rapid-repeat signal worth 2 points; this signal alone leaves the visit **Uncertain**. Nearby page loads can be refreshes or different people behind a shared network and browser type. Rotating `ANALYTICS_HASH_SECRET` also changes visitor IDs and breaks this comparison across the rotation. These are not reconstructed sessions, and no duration, click, scroll, ASN, or project navigation is inferred. The resume summary reports how many retained visits have metadata only and how many show a rapid-repeat pattern. Project navigation counts only paths under `/project/` or `/projects/`; the current site has no individual project routes, so this metric remains zero until those routes exist. Click a visit row for its retained event timeline or its actual nearby visit timestamps. Verify new event capture by opening a tagged link in a normal browser, scrolling and clicking, waiting at least 15 seconds, then refreshing the private dashboard. Confirm the same visitor ID and session ID are associated with the visit and its timeline. Inspect `/api/engagement` in browser developer tools to check batch delivery. Allow for blockers and network failures.

The existing visit collection runs in browser JavaScript. A link scanner that only fetches the HTML and never runs JavaScript does not call `/api/visits`, so it will not appear in these visit or resume counts. Capturing those requests would require a separate server-side document-request hook, such as Vercel Routing Middleware, and careful deduplication against browser visits. These counts should therefore be read as observed browser-executed visits, not all HTTP requests to a resume link.
