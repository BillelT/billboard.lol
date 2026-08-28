# OutGrow.lol

A low-poly American highway where companies bid for billboards. Pay more, get
bigger, get seen first. A satire, obviously.

- **The system** (à la outbid.lol): the ranking is the cumulative amount paid per
  company. Every payment adds up — no losing bids, no refunds. Getting outgrown
  is the reason to pay again.
- **The experience**: one scroll drives past the whole ranking, from an aerial
  opening over the giant #1 billboard down to a car-height view of the $5 ones.
- **The look** (à la topfloor.company): low/mid-poly, one closed palette, all
  geometry procedural and vertex-colored — zero downloaded assets.

See [`billboard-brief.md`](./billboard-brief.md) for the full brief.

## Run it

```bash
npm install
npm run dev
```

That's it — with no environment variables the site runs in **demo mode**: seed
ranking, bids applied locally in the scene, no payments taken.

## Going live

Copy `.env.example` to `.env.local` and fill in:

1. **Supabase** — run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL
   editor, then set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`. The client reads the `current_ranking` view and
   re-sorts live via realtime on `payments`.
2. **Stripe** — set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, point a
   webhook at `/api/webhook` for `checkout.session.completed`, and set
   `NEXT_PUBLIC_SITE_URL`. Checkout sessions are created by `/api/checkout`;
   the webhook records payments in Supabase.

Resets are cycles: `insert into cycles default values;` opens a new cycle and
everyone starts from zero — the old cycle keeps its data as a hall of fame.

## Rendering notes

- WebGL2 native MSAA, ACES filmic tone mapping, sRGB color management.
- Gradient sky shader with in-shader dithering (no banding); exponential fog in
  the horizon color dissolves the far world with no hard band.
- All props are merged vertex-colored geometries sharing one material; decor and
  traffic are instanced. Zero downloaded assets — ad faces are generated
  `CanvasTexture`s.
- One soft-shadow map follows the camera; clouds cast the big aerial shadows.
- Scroll is virtual: a damped progress value samples two Catmull-Rom curves
  (position + look-at) derived from the billboard layout, so the framing adapts
  to whatever the ranking looks like.

### Scaling to a long ranking

The scene is built so cost depends on the *view*, not on how many companies are
in the ranking:

- **Decor is generated per cell around the camera**, not once across the whole
  road. Instance counts are constant, density never thins out, and positions are
  a pure function of the cell index — scrolling back shows the same trees.
- **Billboard faces are painted only within range of the camera** and released
  beyond it, so live canvases track what is on screen.
- Billboard size comes from rank, not amount, so the road stays legible however
  long it gets.

Measured with `?perf=1` (draw calls / triangles are renderer counters):

| ranking | draw calls | triangles | uploaded textures |
| --- | --- | --- | --- |
| 12 billboards | 19 | ~95k | 3–13 |
| 200 billboards | 19–20 | ~105k | 3–13 |

Initial JS is 108 kB (the three.js scene is a lazy chunk, and supabase-js is only
downloaded when Supabase is configured).

### Dev tools

- `?debug=1` — live tuning panel: fog (mode, where it starts, where it
  saturates, density, colour), exposure and lights, sun direction, sky colours,
  terrain relief, decor density and camera fov. "copy values" puts the whole
  state on the clipboard, ready to paste back into `lib/debugState.ts` defaults.
- `?perf=1` — live fps / draw calls / triangles / textures / DPR overlay.
- `?stress=200` — fill the ranking with N synthetic companies.

All three are lazy: the tuning panel is its own chunk and nothing ships to
visitors who do not ask for it.
