# Ultimate Prompt (for generating this exact app)

You are an expert **product designer + senior frontend engineer + PWA architect**.
Create a production-grade **Adhkar / Azkar** web app that is “unreasonably premium” in UI/UX, animation, and engineering quality.

## Goals
- Build a **PWA** (installable, offline-first) with **React + Vite + TypeScript**.
- App must feel like a **luxury spiritual experience**: calm, elegant, high contrast, fast, and accessible.
- Must support **Arabic** (RTL), excellent typography, and readable layouts.
- Implement a **Tasbeeh counter** per item:
  - tap to increment
  - press-and-hold to fast increment
  - progress ring
  - completion state + micro celebration
- Save progress & favorites **locally**.
- Provide **command palette** (Ctrl/⌘+K) and fuzzy search across all adhkar.
- Include a gorgeous optional **3D background** using **Three.js / React Three Fiber**.
- Use premium motion: **Framer Motion + GSAP**. Keep motion respectful and allow “reduce motion”.
- Provide **data pack import**: user can import additional JSON packs and app merges them safely (handles ID collisions).
- Include settings for theme, font scale, line height, show/hide benefits, strip tashkeel, sounds, haptics.

## Data requirements
- Base dataset: `public/data/adhkar.json` with:
  ```json
  { "sections": [ { "id": "...", "title": "...", "content": [ { "text": "...", "benefit": "", "count": 1 } ] } ] }
  ```
- Validate and coerce numeric counts; never crash on bad data.
- Create a “Sources” page listing dataset & imported packs; allow pack removal.

## Libraries to use
- UI: TailwindCSS (+ custom glass system), Radix UI primitives
- Motion: Framer Motion + GSAP
- 3D: three + @react-three/fiber + @react-three/drei
- Search: fuse.js + cmdk
- Lists: react-virtuoso virtualization
- Share/export: html-to-image + Web Share API
- PWA: vite-plugin-pwa
- State: zustand (persist)

## Quality bar
- Clean architecture (components/data/store/lib separation).
- Type-safe schemas using zod.
- Accessible components and keyboard support.
- Provide Android packaging instructions via Capacitor.

## Deliverables
- Full source code (Vite project) with:
  - `src/` app
  - `public/data/adhkar.json`
  - PWA config
  - Android (Capacitor) instructions
- A polished README with run/build steps.

Now generate the full codebase with all files.
