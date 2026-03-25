# Implementation Plan

Date: 2026-03-25

## Status Key

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

## Plan

- `[x]` Step 1 - Isolate the current single-well viewer into its own dedicated route and shared component structure so future navigation changes do not disrupt the existing tool.
- `[x]` Step 2 - Build a public landing page at the root route with a professional blue-toned visual identity and a clear `Enter Site` action.
- `[ ]` Step 3 - Build a workspace selection page that clearly routes users to either the single-well viewer or the future multi-well DSU viewer.
- `[ ]` Step 4 - Add shared navigation and fallback behavior across routes so users can move through the app without getting lost or hitting blank states.
- `[ ]` Step 5 - Build the initial multi-well DSU viewer workflow with a clean empty state, well-by-well setup flow, and a 3D-only first experience.
- `[ ]` Step 6 - Add high-impact polish items that improve clarity and reliability as the app grows, including route-level error handling, loading states, and lightweight operational guardrails.

## Notes

- Keep each step high impact and low complexity where possible.
- Favor isolated routes and reusable components over adding more logic to a single page.
- Preserve a working user path at the end of every completed step.
- Update this file as steps are completed or re-scoped.
