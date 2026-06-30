# CSP Hardening Checklist

## Goal
Maintain strict script execution controls and gradually eliminate inline style allowances.

## Current Baseline
- Inline script blocks removed from HTML entry pages.
- Inline script handlers removed from static HTML controls.
- script-src no longer includes unsafe-inline.
- style-src still includes unsafe-inline for compatibility with existing inline style attributes and dynamic style-heavy UI markup.

## Quick Verification Steps
1. Search for inline scripts in HTML:
   - rg -n "<script(?![^>]*src=)" --pcre2 **/*.html
2. Search for inline event handlers in HTML:
   - rg -n "\son[a-z]+=" **/*.html
3. Search for inline handler attributes generated in JS templates:
   - rg -n "onclick=|onmouseover=|onmouseout=|onkeydown=" **/*.js
4. Confirm CSP script policy is strict:
   - rg -n "script-src 'self'" **/*.html
   - Ensure no script-src 'self' 'unsafe-inline' remains.

## Before Editing UI Files
1. Prefer CSS classes over inline style attributes in HTML.
2. Prefer addEventListener over inline event attributes.
3. For dynamic markup, emit data-* attributes and wire listeners after render.

## Staged Work To Remove style-src unsafe-inline
1. Replace static inline style attributes in HTML with classes in stylesheet files.
2. Replace dynamic template-string inline style attributes with class-based variants.
3. Keep dynamic style changes via class toggles where possible.
4. Re-test all pages and then remove unsafe-inline from style-src.

## Regression Test Suggestions
1. Home page: news tabs, NASCAR tabs, weather, market widgets.
2. Stream page: load/toggle controls, streamer list interactions, OAuth connect/disconnect flows.
3. Dashboard: chart rendering and search popup behavior.
4. Web games and RPG: panel load, game controls, and embedded views.
