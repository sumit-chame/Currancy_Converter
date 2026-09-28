# 💱 Premium Currency Converter Web App

A fast, beautiful, responsive, and reliable **real-time Currency Converter web application** built with vanilla HTML5, CSS3, and modern JavaScript (ES6+). Integrated with Chart.js v4 for historical exchange rate analytics and powered by multi-tier API fallbacks.

---

## 🌟 Key Features

- **⚡ Real-Time Instant Conversion:** Debounced conversion as you type without mandatory button presses.
- **🔄 Smooth Swap (⇄):** Interactive swap button with 180° rotation animation.
- **🔍 Searchable Currency Dropdown:** Search among 200+ currencies by code, full currency name, or country name (e.g. "India", "rupee", "INR").
- **🚩 Flags & Symbols:** Auto-resolves country flags via FlagCDN (`https://flagcdn.com/w40/{cc}.png`) and localizes currency symbols using `Intl.DisplayNames` and `Intl.NumberFormat`.
- **📈 Interactive 7D / 30D / 90D Rate Charts:** Smooth gradient line charts rendered with **Chart.js v4** displaying historical trends, High, Low, Average, and % Change.
- **🛡️ Multi-Tier API Fallback Engine:**
  1. **Primary:** Fawaz Ahmed Currency API (`@fawazahmed0/currency-api`).
  2. **Primary Mirror:** `latest.currency-api.pages.dev`.
  3. **Secondary Fallback:** Frankfurter API (European Central Bank data).
  4. **Offline Mode:** Uses `localStorage` cached rates when disconnected.
- **🌍 Multi-Currency Comparison Card:** Converts your amount into 6 popular global currencies at once (EUR, GBP, JPY, INR, AUD, CAD).
- **⭐ Favorites & Recent Conversions:** Save frequently used pairs and launch past conversions with one click.
- **🌓 Dark & Light Theme Toggle:** Automatic detection of system preference (`prefers-color-scheme`) with persistent toggle state.
- **📋 Copy Result Toast:** Copy conversion result to clipboard with instant toast notifications.
- **🟢 Live Refresh Dot:** Auto-refreshes rates every 60 seconds when tab is active (Visibility API aware).

---

## 🛠️ Technology Stack

- **Structure:** HTML5 (Semantic elements & ARIA accessibility)
- **Styling:** CSS3 (Custom design system with CSS Variables, Glassmorphic cards, Flexbox & CSS Grid)
- **Logic:** Vanilla JavaScript ES6+ (Promises, Async/Await, Intl API, LocalStorage, Event Delegation)
- **Data Visualization:** Chart.js v4.4 (CDN)

---

## 🚀 How to Run

1. Clone or download this repository.
2. Open [`index.html`](file:///d:/All%20VS%20Code/Currancy_Converter/index.html) directly in any web browser, or launch using the **VS Code Live Server** extension.
3. No build step, node modules, or API keys required!

---

## 📁 Project Structure

```
Currancy_Converter/
├── index.html        # Semantic layout, header, cards, chart canvas, and CDN imports
├── index.css         # Glassmorphism design system, dark/light themes, custom dropdown styles
├── index.js          # Multi-tier API fallbacks, custom dropdown search, Chart.js engine, storage
├── README.md         # Documentation & guide
└── PDR.md            # Technical Project Design Report (Architecture, APIs & Data Flow)
```

---

## 📜 Data Credits

- **Primary API:** [Fawaz Ahmed Currency API](https://github.com/fawazahmed0/currency-api)
- **Secondary API:** [Frankfurter API (ECB Data)](https://www.frankfurter.dev/)
- **Flags:** [FlagCDN](https://flagcdn.com/)
