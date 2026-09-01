// Shared with layout.tsx (default <title>/description) and page.tsx (the
// per-request title override) so both always agree — the homepage's own
// title should never lose to a dynamic leader name in what search engines
// index. See page.tsx's generateMetadata for why.
export const SITE_TITLE = "bidboard.lol — outbid the leader for the biggest billboard";
export const SITE_DESCRIPTION =
  "bidboard.lol is a live pay-to-outbid leaderboard: bid real money to plant a billboard on a low-poly American highway. Outbid the leader, get bigger, get seen first.";
