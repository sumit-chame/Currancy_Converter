# Project Design Report (PDR) - Currency Converter Web Application

**Project Name:** Premium Currency Converter Web App  
**Document Type:** Project Design Report (PDR) / Technical Architecture Document  
**Version:** 2.0.0  
**Date:** September 28, 2026  
**Status:** Completed & Operational  

---

## 1. Executive Summary

The **Currency Converter Web Application** is a production-grade frontend solution designed to provide real-time currency conversion rates, multi-currency comparisons, and interactive historical rate analytics. Built with zero build steps or heavy frameworks, it utilizes vanilla HTML5, CSS3, ES6+ JavaScript, Chart.js v4, and a multi-tiered API architecture with automatic fallbacks and local storage caching.

---

## 2. System Architecture & Data Flow

### Multi-Tiered API Fallback Pipeline

```
 +-----------------------------------------------------------------------------+
 |                              Client Browser                                 |
 |                                                                             |
 |  +--------------------+  +--------------------+  +-----------------------+  |
 |  | Input / Dropdown   |  | Theme & Prefs      |  | Chart Range Tabs      |  |
 |  | (Debounced ~300ms) |  | (LocalStorage)     |  | (7D / 30D / 90D)      |  |
 |  +---------+----------+  +--------------------+  +-----------+-----------+  |
 |            |                                                 |              |
 |            +-----------------------+-------------------------+              |
 |                                    |                                        |
 |                                    v                                        |
 |                         [App Logic Engine: index.js]                        |
 |                                    |                                        |
 +------------------------------------|----------------------------------------+
                                      |
                         +------------v------------+
                         | Try Primary API         |
                         | (Fawaz Ahmed jsDelivr)  |
                         +------------+------------+
                                      |
                            [Success?]--+-- (Yes) --> [Cache Rates & Update UI]
                                      |
                                     (No)
                                      |
                         +------------v------------+
                         | Try Mirror API          |
                         | (pages.dev CDN)         |
                         +------------+------------+
                                      |
                            [Success?]--+-- (Yes) --> [Cache Rates & Update UI]
                                      |
                                     (No)
                                      |
                         +------------v------------+
                         | Try Secondary Fallback  |
                         | (Frankfurter ECB API)   |
                         +------------+------------+
                                      |
                            [Success?]--+-- (Yes) --> [Cache Rates & Update UI]
                                      |
                                     (No)
                                      |
                         +------------v------------+
                         | Use LocalStorage Cache  |
                         | (Offline Mode Banner)   |
                         +-------------------------+
```

---

## 3. Technology Stack & Design System

| Layer | Technology | Function |
|---|---|---|
| **Structure** | Semantic HTML5 | Form controls, custom dropdown containers, ARIA live region, canvas host |
| **Styling** | CSS3 | Glassmorphism card UI, dark/light theme variables, flex/grid layouts |
| **Scripting Engine** | Vanilla JS (ES6+) | Async pipeline, debounced handlers, DOM sanitization, state management |
| **Analytics Engine** | Chart.js (v4.4 CDN) | Line chart visualization, gradient fills, dynamic destruction & re-render |
| **Flag Imagery** | FlagCDN | Real-time country flag images (`https://flagcdn.com/w40/{cc}.png`) |
| **Localization** | `Intl` Browser API | `Intl.DisplayNames` & `Intl.NumberFormat` for currency names & symbols |

---

## 4. Completed Feature Matrix

| Feature | Description | Status |
|---|---|---|
| **Debounced Conversion** | Calculates rates instantly as you type (~300ms debounce) | ✅ Completed |
| **Interactive Swap** | 180° animated currency swap button (⇄) | ✅ Completed |
| **Searchable Dropdown** | Custom dropdown searchable by code, name, or country | ✅ Completed |
| **Flags & Symbols** | Real country flags via FlagCDN and native localized symbols | ✅ Completed |
| **Multi-Tier API Fallback** | Primary CDN $\rightarrow$ Mirror $\rightarrow$ Frankfurter (ECB) $\rightarrow$ Cache | ✅ Completed |
| **Rate History Chart** | 7D / 30D / 90D range tabs with min, max, average, and % change | ✅ Completed |
| **Multi-Currency Overview** | Converts amount into 6 popular currencies simultaneously | ✅ Completed |
| **Favorites & Recents** | Star currency pairs and launch recent conversions from chips | ✅ Completed |
| **Dark / Light Theme** | CSS variable theme system respecting `prefers-color-scheme` | ✅ Completed |
| **Offline Mode** | `navigator.onLine` listener with cached rates fallback banner | ✅ Completed |
| **Copy Result & Toast** | Instant result copy with notification toasts | ✅ Completed |
| **Live Auto-Refresh** | 60-second visibility-aware auto-refresh timer | ✅ Completed |

---

## 5. File Structure & Component Map

- **[`index.html`](file:///d:/All%20VS%20Code/Currancy_Converter/index.html):** Declares accessibility labels, theme controls, custom dropdown triggers, result card, `<canvas id="rateChart">`, multi-currency grid, quick chips, and footer credits.
- **[`index.css`](file:///d:/All%20VS%20Code/Currancy_Converter/index.css):** Glassmorphism styles, dark/light CSS variables (`--card-bg`, `--accent-primary`, `--input-bg`), responsive grid rules, pulse dot animation, and custom dropdown styling.
- **[`index.js`](file:///d:/All%20VS%20Code/Currancy_Converter/index.js):**
  - Section 1–4: Config, country map, state, DOM references, `Intl` helpers.
  - Section 5: API Layer with multi-tier fallback and historical fetching.
  - Section 6–8: Caching, custom dropdown rendering & search, debounced conversion.
  - Section 9–12: Chart.js rendering & destruction, multi-currency grid, favorites, recents, theme & visibility event listeners.
- **[`README.md`](file:///d:/All%20VS%20Code/Currancy_Converter/README.md):** User documentation and repository guide.

---

## 6. Installation & Verification

1. Open [`index.html`](file:///d:/All%20VS%20Code/Currancy_Converter/index.html) in your browser or with VS Code Live Server.
2. Verify live rate conversion, swap animation, custom dropdown search, theme toggle, and 7D/30D/90D historical chart rendering.
