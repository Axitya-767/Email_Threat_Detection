# Email Threat Intelligence & Forensic Platform — Frontend

> Backend setup/rules will be appended once that work starts. This covers frontend only.

---

## 1. Prerequisites

- Node.js 18+ and npm
- Git access to the repo

---

## 2. Setup

```bash
git clone <repo-url>
cd Email_Threat_Detection/frontend
npm install
```

Create your local env file:

```bash
cp .env.example .env.local
```

In `.env.local`, keep this set to `true` until backend endpoints are live:

```
NEXT_PUBLIC_USE_MOCK=true
```

---

## 3. Running the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 4. Git Workflow (Frontend)

**Always branch off `develop`, never off `main`.**

```bash
# 1. Get latest develop before starting any work
git checkout develop
git pull origin develop

# 2. Create your feature branch (use your assigned branch name from the table below)
git checkout -b feature/frontend-<yourpart>

# 3. Work ONLY inside your assigned file(s). Commit often.
git add .
git commit -m "short clear description of what changed"

# 4. Push your branch
git push origin feature/frontend-<yourpart>

# 5. Open a Pull Request into `develop` — this is the single integration
#    branch, everyone's work lands here directly. Tag Person 5 as reviewer
#    (they own app/page.js and are responsible for catching layout breaks).

# 6. Before opening the PR, always re-sync so your branch isn't stale:
git checkout feature/frontend-<yourpart>
git fetch origin
git merge origin/develop
```

**Rules**
- Never edit `app/page.js` or `app/layout.js` unless you are Person 5.
- Never edit another teammate's component file — flag it to them instead.
- No new npm packages without a heads-up in the group chat first (avoids lockfile conflicts).
- Push work-in-progress often (every 30–45 min) — don't sit on uncommitted changes.

---

## 5. Component Reference

| Component | File | Owner | Branch | Reads from mock data |
|---|---|---|---|---|
| UploadPanel | `components/UploadPanel.jsx` | Person 1 | `feature/frontend-upload` | — (triggers mock load) |
| AuthStatusCard | `components/AuthStatusCard.jsx` | Person 1 | `feature/frontend-auth` | `authentication` |
| ScoreBreakdown | `components/ScoreBreakdown.jsx` | Person 3 | `feature/frontend-score` | `risk_score`, `quadrants` |
| MapView | `components/MapView.jsx` | Person 2 | `feature/frontend-map` | `trace` |
| GraphView | `components/GraphView.jsx` | Person 4 | `feature/frontend-graph` | `relationships` |
| PrivacyToggle | `components/PrivacyToggle.jsx` | Person 6 | `feature/frontend-privacy` | `masked_view_available` |
| ReportButton | `components/ReportButton.jsx` | Person 6 | `feature/frontend-report` | full object |

> ⚠️ This table reflects the current stub state (data/page-state fixed, individual components not yet built for real). Once a component is built for real, regenerate its row — see Section 7.

Every component receives two props: `data` (the current mock scenario object) and `masked` (boolean, from the privacy toggle). `PrivacyToggle` additionally receives `setMasked` to control that state. Don't fetch independently, don't add other global state — read straight from `data.<field>` and branch on `masked` where a component needs to hide sensitive detail (e.g. sender name/email).

---

## 6. Using Mock Data in Your Own AI Coding Tool Prompts

Whatever tool you're using (Cursor, Antigravity, etc.), the rules below apply the same way — the tool just needs the same context.

The mock schema lives at `data/mock_responses/` (`mock_01_sbi_kyc.json` through `mock_08_university_compromise.json`) and `lib/schema.js`. `app/page.js` now has a scenario switcher in the header — use it to swap `data` between all 8 scenarios live while you build/test your component, instead of hardcoding one.

When you prompt your AI coding tool to build your real component, **always include these 5 things** or the output will drift from the shared contract:

1. Reference the exact field(s) you're consuming (from the table above) — paste the relevant snippet of the mock JSON, don't describe it from memory.
2. State you use the `data` prop (and `masked`, if your component shows anything sensitive — e.g. sender name/email/domain) — no fetching, no new global state. If you're building `PrivacyToggle`, also mention `setMasked`.
3. State to use the existing dark theme tokens from `tailwind.config.js` (surface/border/text/accent) — don't let it invent new colors.
4. State to match the existing card shell conventions (rounded-lg, border-muted, bg-surface) already used in the stub, so it stays visually consistent in the grid.
5. State explicitly not to touch `app/page.js` or any other component file.

### Template — copy this, fill in your component's details

```
@components/<YourComponent>.jsx @lib/schema.js

Build the real <YourComponent> component. Rules:
- This component receives two props: `data` (current mock scenario) and
  `masked` (boolean). [If applicable: also receives `setMasked`.]
- Don't fetch, don't add other global state.
- data.<your field> looks like: <paste the relevant JSON snippet here>
- [Describe what to actually render/do with that field]
- [If this component shows anything sensitive — sender name, email, domain —
  describe what to show/hide when `masked` is true vs false]
- Use the existing dark theme tokens from tailwind.config.js for any UI chrome
  (card border, background, labels) — don't introduce new colors.
- Match the existing card shell conventions (rounded-lg, border-muted,
  bg-surface) used elsewhere in the app so it's visually consistent.
- Don't touch app/page.js or any other file in components/.
- Once this is a real working component, remove the placeholder
  "TODO / Person X" badge styling — that was only for the WIP stub phase.

Take a screenshot after and confirm it renders correctly inside the existing
grid layout without breaking anything around it.
```

**Example filled in (Person 2, MapView):**

```
@components/MapView.jsx @lib/schema.js

Build the real MapView component. Rules:
- This component receives two props: `data` (current mock scenario) and
  `masked` (boolean) — MapView doesn't need to react to `masked` since IP/geo
  data isn't personal to a sender, but keep the prop in the signature.
- Don't fetch, don't add other global state.
- data.trace is an array of hops: {hop_order, ip, lat, lng, place, note}.
  Plot each as a marker on a Leaflet map and draw a line connecting them in
  hop_order sequence.
- Use react-leaflet with OpenStreetMap tiles.
- Use the existing dark theme tokens from tailwind.config.js for any UI chrome
  (card border, background, labels) — don't introduce new colors.
- Match the existing card shell conventions (rounded-lg, border-muted,
  bg-surface) used elsewhere in the app so it's visually consistent.
- Don't touch app/page.js or any other file in components/.
- Once this is a real working component, remove the placeholder
  "TODO / Person X" badge styling.

Take a screenshot after and confirm it renders correctly inside the existing
grid layout without breaking anything around it.
```

---

## 7. Keeping the Component Table Accurate

Prop shapes may drift as everyone builds. Before merging into `feature/frontend`, run this once in your own AI coding tool to check your file matches:

```
@components/<YourComponent>.jsx

List exactly which fields from the `data` prop this component currently reads,
and list any props other than `data` it accepts, if any. Output as a single
markdown table row: Component | Props | Fields read from data.
```

Paste your row into Section 5 of this README when you open your PR, so the table stays true to actual code instead of going stale.
