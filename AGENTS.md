# Session Log — Jul 4, 2026

## Theme Selector Dropdown (Light/Dark/System)

Replaced the cycling toggle button with a proper dropdown selector on all pages:

- **Layout.tsx** (`src/components/Layout.tsx`) — Desktop nav has a dropdown button showing current theme (🌙/☀️/💻) with a chevron. Clicking opens a positioned dropdown with three options (Light/Dark/System), each with icon, label, and checkmark for the active selection. A footer line shows which mode is *actually* active (`effective`). Click-outside handled via a backdrop `div`.
- **Mobile menu** (`Layout.tsx`) — Shows all three themes as separate radio-style buttons instead of a single toggle.
- **Login.tsx / Register.tsx** (`src/pages/`) — Same dropdown pattern replacing the old absolute-positioned cycle button.
- **ThemeContext** (`src/contexts/ThemeContext.tsx`) — Already exposed `setTheme` so no changes needed there.

## Browse Page Wrapped in Layout

`src/pages/Browse.tsx` was rendering standalone with no header/nav. Wrapped it in `<Layout user={user} maxWidth="3xl">` so the nav bar (with theme dropdown, sign out, nav links) appears on the dashboard. Removed the outer wrapper divs (`min-h-screen bg-warm-50`, `max-w-screen-3xl`) since Layout provides them.
