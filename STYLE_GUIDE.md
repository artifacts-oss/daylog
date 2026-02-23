# UI/UX Design System & Style Guide (Based on Dashboard Reference)

This document serves as the **Single Source of Truth** for all frontend development. The `frontend-design` skill must adhere strictly to these visual tokens extracted from the reference dashboard.

---

## 1. Color Palette & Dark Theme Mapping

The `frontend-design` skill must use these semantic tokens. When `class="dark"` is present on the body/html, switch to the Dark Variant.

| Token              | Light Theme (Default) | Dark Theme Variant | Usage                                               |
| :----------------- | :-------------------- | :----------------- | :-------------------------------------------------- |
| `bg-main`          | #FFFFFF               | #0A0A0A            | Main application background                         |
| `bg-sidebar`       | #F8F8F8               | #121212            | Sidebar and secondary panels                        |
| `bg-surface`       | #FFFFFF               | #1C1C1E            | Cards, Modals, and Note containers                  |
| `text-primary`     | #000000               | #E5E5E5            | Main titles and primary text (Reduced Stress White) |
| `text-secondary`   | #6B7280               | #9CA3AF            | Subtitles and descriptions                          |
| `text-muted`       | #9CA3AF               | #6B7280            | Breadcrumbs and metadata                            |
| `border-default`   | #F3F4F6               | #2D2D2E            | Dividers and card outlines                          |
| `accent-pink`      | #FBCFE8               | #321626            | Darker pink base for tags                           |
| `text-accent-pink` | #DB2777               | #F472B6            | Lighter pink text for readability                   |
| `accent-red`       | #FEE2E2               | #450A0A            | Soft red base for danger elements                   |
| `text-accent-red`  | #DC2626               | #F87171            | High-contrast red for text/actions                  |

## 2. Dark Mode Specific Rules

1. **Elevation:** In Dark Mode, do not use drop shadows. Instead, use a slightly lighter background color (`bg-surface`) to indicate that an element is "closer" to the user.
2. **Contrast:** Ensure all form borders in Dark Mode use `#3F3F46` so they remain visible against the `#0A0A0A` background.
3. **Images/Icons:** Reduce the brightness of images by 10% (filter: brightness(.9)) in Dark Mode to prevent eye strain.
4. **Scrollbars:** Use a dark-themed scrollbar (`thumb: #3F3F46`) when Dark Mode is active.
5. **Reduced Stress White:** Use `#E5E5E5` for primary text in dark mode to reduce eye strain.

## 3. Geometry & Shape

- **Border Radius:**
  - `radius-sm`: 6px (Input focus, small elements).
  - `radius-md`: 12px (Action buttons like "Create Board", sidebar items).
  - `radius-lg`: 20px (Main cards, "My First Board" image, "Recent Notes" container).
- **Cards:** White background with a very subtle `1px` border (no heavy shadows).

## 4. Typography Hierarchy

- **Font Family:** 'Jakarta' or 'Geist', sans-serif. Tight letter-spacing for headings.
- **H1 (Welcome Title):** 36px | Extra Bold (800) | Black.
- **H2 (Section Titles):** 24px | Bold (700) | Black.
- **Body Text:** 16px | Regular (400) | Grey-600.
- **Metadata/Breadcrumbs:** 12px | Medium (500) | Uppercase | Grey-400.

## 5. Layout Specifics

- **Sidebar Width:** 80px (Icon-only sidebar when is collapsed) and 240px (when is expanded).
- **Content Padding:** Large breathing room (40px to 60px padding on main containers).
- **Grid:** Use a clean 2-column or 3-column layout for "Boards" and masonry layout for "Notes".

## 6. Implementation Rules

1. **Consistency Check:** Every new page must use the #000000 Bold H1 and the #6B7280 secondary text.
2. **Component Style:** "Create Board" should be a dashed-border card with #F3F4F6 background and centered content.
3. **Note Cards:** Must feature a white background, `20px` radius, and a separator line above the bottom meta-info.

## 7. Form & Input Consistency (New)

To maintain the "clean and spacious" look from the dashboard, all forms must follow these strict rules:

### A. Input Anatomy

- **Height:** Standardized at `48px` for main inputs and `40px` for secondary ones.
- **Border Radius:** Always use `radius-md` (12px) to match the "Create Board" button style.
- **Background:** - Default: `#FFFFFF` (White) with a `1px` border in `#E5E7EB`.
  - Focused: Background stays white, but border changes to `#000000` or adds a `2px` ring.
- **Placeholder Text:** Use `text-muted` (#9CA3AF) in `14px` Regular.

### B. Form Layout

- **Labels:** Must be `12px` Bold, All-Caps, using `text-secondary` (#6B7280). Always placed 8px above the input.
- **Spacing:** Vertical gap of `8px` between form fields to maintain the "airy" feel of the dashboard.
- **Validation:** - Error states must use a soft red border and `12px` error text below the input.
  - Never shift the layout when showing error messages (use absolute positioning or reserved space).

### C. Buttons in Forms

- **Primary Action:** Black background (#000000), white text, `radius-md` (12px), centered or full-width depending on modal size.
- **Secondary/Cancel:** Transparent background with `text-secondary` (#6B7280), no border, or subtle grey background (#F3F4F6).
- **Danger Action:** Use `accent-red` background with `text-accent-red` text for soft danger actions, or solid `bg-red-600` with white text for critical destructive actions.

### D. Danger Alerts & Elements

- **Alert Backgrounds:** Use `accent-red` for the background block to ensure visual distinction.
- **Alert Text/Icons:** Use `text-accent-red` for high contrast and to signify danger/error states.

---

## 8. Implementation Rules for AI

1. **Consistency Check:** Every new page must use the #000000 Bold H1 and the #6B7280 secondary text.
2. **Form Generation:** When the `frontend-design` skill generates a form, it must ensure all `input`, `select`, and `textarea` elements share the exact same `12px` border-radius and `#E5E7EB` border color.
3. **Note Cards:** Must feature a white background, `20px` radius, and a separator line above the bottom meta-info.

---

_Reference Image: Dashboard - Updated Feb 2026_
