# UI/UX Design System & Style Guide (Based on Dashboard Reference)

This document serves as the **Single Source of Truth** for all frontend development. The `frontend-design` skill must adhere strictly to these visual tokens extracted from the reference dashboard.

---

## 1. Color Palette (Extracted from Image)

- **Backgrounds:**
  - `bg-main`: #FFFFFF (Main content areas).
  - `bg-sidebar`: #F8F8F8 (Very subtle grey for sidebar/background).
  - `bg-surface`: #FFFFFF (Cards and notes).
- **Text & Typography:**
  - `text-primary`: #000000 (Titles, Headings, active text).
  - `text-secondary`: #6B7280 (Subtitle text, e.g., "Recently updated collections").
  - `text-muted`: #9CA3AF (Breadcrumbs like "HOME", meta info).
- **Accents & Components:**
  - `accent-pink`: #FBCFE8 (Background for tags/badges).
  - `text-accent-pink`: #DB2777 (Text inside pink tags).
  - `border-default`: #F3F4F6 (Subtle lines and card borders).
  - `icon-inactive`: #6B7280 (Sidebar icon colors).

## 2. Geometry & Shape

- **Border Radius:**
  - `radius-sm`: 6px (Input focus, small elements).
  - `radius-md`: 12px (Action buttons like "Create Board", sidebar items).
  - `radius-lg`: 20px (Main cards, "My First Board" image, "Recent Notes" container).
- **Cards:** White background with a very subtle `1px` border (no heavy shadows).

## 3. Typography Hierarchy

- **Font Family:** 'Jakarta' or 'Geist', sans-serif. Tight letter-spacing for headings.
- **H1 (Welcome Title):** 36px | Extra Bold (800) | Black.
- **H2 (Section Titles):** 24px | Bold (700) | Black.
- **Body Text:** 16px | Regular (400) | Grey-600.
- **Metadata/Breadcrumbs:** 12px | Medium (500) | Uppercase | Grey-400.

## 4. Layout Specifics

- **Sidebar Width:** 80px (Icon-only sidebar when is collapsed) and 240px (when is expanded).
- **Content Padding:** Large breathing room (40px to 60px padding on main containers).
- **Grid:** Use a clean 2-column or 3-column layout for "Boards" and masonry layout for "Notes".

## 5. Implementation Rules

1. **Consistency Check:** Every new page must use the #000000 Bold H1 and the #6B7280 secondary text.
2. **Component Style:** "Create Board" should be a dashed-border card with #F3F4F6 background and centered content.
3. **Note Cards:** Must feature a white background, `20px` radius, and a separator line above the bottom meta-info.

## 6. Form & Input Consistency (New)

To maintain the "clean and spacious" look from the dashboard, all forms must follow these strict rules:

### A. Input Anatomy

- **Height:** Standardized at `48px` for main inputs and `40px` for secondary ones.
- **Border Radius:** Always use `radius-md` (12px) to match the "Create Board" button style.
- **Background:** - Default: `#FFFFFF` (White) with a `1px` border in `#F3F4F6`.
  - Focused: Background stays white, but border changes to `#000000` or adds a `2px` ring.
- **Placeholder Text:** Use `text-muted` (#9CA3AF) in `14px` Regular.

### B. Form Layout

- **Labels:** Must be `12px` Bold, All-Caps, using `text-secondary` (#6B7280). Always placed 8px above the input.
- **Spacing:** Vertical gap of `24px` between form fields to maintain the "airy" feel of the dashboard.
- **Validation:** - Error states must use a soft red border and `12px` error text below the input.
  - Never shift the layout when showing error messages (use absolute positioning or reserved space).

### C. Buttons in Forms

- **Primary Action:** Black background (#000000), white text, `radius-md` (12px), centered or full-width depending on modal size.
- **Secondary/Cancel:** Transparent background with `text-secondary` (#6B7280), no border, or subtle grey background (#F3F4F6).

---

## 7. Implementation Rules for AI

1. **Consistency Check:** Every new page must use the #000000 Bold H1 and the #6B7280 secondary text.
2. **Form Generation:** When the `frontend-design` skill generates a form, it must ensure all `input`, `select`, and `textarea` elements share the exact same `12px` border-radius and `#F3F4F6` border color.
3. **Note Cards:** Must feature a white background, `20px` radius, and a separator line above the bottom meta-info.

---

_Reference Image: Dashboard - Updated Feb 2026_
