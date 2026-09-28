/**
 * ============================================================================
 * CURRENCY CONVERTER - MAIN JS ENGINE
 * ============================================================================
 * Features:
 *  1. Multi-tier API fallback (Fawaz Ahmed API -> Mirror -> Frankfurter ECB)
 *  2. Searchable custom dropdowns with FlagCDN images & Intl names
 *  3. Debounced real-time conversion as you type & Swap animation
 *  4. 7D / 30D / 90D Chart.js gradient line chart with min/max/avg stats
 *  5. Multi-currency comparison card & Favorite / Recent conversion chips
 *  6. Dark / Light theme toggle & offline detection & LocalStorage caching
 * ============================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. CONFIG & STATIC DATA MAPS
     -------------------------------------------------------------------------- */
  const CONFIG = {
    DEFAULT_FROM: 'USD',
    DEFAULT_TO: 'INR',
    DEBOUNCE_MS: 300,
    AUTO_REFRESH_MS: 60000, // 60 seconds
    POPULAR_CURRENCIES: ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SAR', 'AED', 'SGD'],
    CRYPTO_CURRENCIES: ['btc', 'eth', 'usdt', 'usdc', 'sol', 'xrp', 'ada', 'doge', 'ltc', 'dot', 'link', 'bnb'],
    STORAGE_KEYS: {
      THEME: 'currency_converter_theme',
      RATES_CACHE: 'currency_converter_rates_cache',
      FAVORITES: 'currency_converter_favorites',
      RECENTS: 'currency_converter_recents'
    }
  };

  // Currency Code to Country Code Mapping (for FlagCDN image: https://flagcdn.com/w40/{cc}.png)
  const COUNTRY_MAP = {
    USD: 'us', INR: 'in', EUR: 'eu', GBP: 'gb', JPY: 'jp', AUD: 'au', CAD: 'ca', CHF: 'ch', CNY: 'cn',
    SAR: 'sa', AED: 'ae', SGD: 'sg', BRL: 'br', ZAR: 'za', NZD: 'nz', MXN: 'mx', HKD: 'hk', SEK: 'se',
    NOK: 'no', KRW: 'kr', TRY: 'tr', RUB: 'ru', IDR: 'id', MYR: 'my', PHP: 'ph', THB: 'th', PLN: 'pl',
    HUF: 'hu', CZK: 'cz', ILS: 'il', CLP: 'cl', COP: 'co', ARS: 'ar', EGP: 'eg', PKR: 'pk', BDT: 'bd',
    LKR: 'lk', VND: 'vn', NGN: 'ng', KES: 'ke', GHS: 'gh', QAR: 'qa', KWD: 'kw', BHD: 'bh', OMR: 'om',
    JOD: 'jo', DKK: 'dk', ISK: 'is', RON: 'ro', BGN: 'bg', HRK: 'hr', MAD: 'ma', TWD: 'tw', PEN: 'pe'
  };

  // Static Fallback Currencies (used if initial API fetch fails or offline)
  const FALLBACK_CURRENCIES = {
    usd: 'US Dollar', inr: 'Indian Rupee', eur: 'Euro', gbp: 'British Pound', jpy: 'Japanese Yen',
    aud: 'Australian Dollar', cad: 'Canadian Dollar', chf: 'Swiss Franc', cny: 'Chinese Yuan',
    sar: 'Saudi Riyal', aed: 'UAE Dirham', sgd: 'Singapore Dollar', brl: 'Brazilian Real',
    zar: 'South African Rand', nzd: 'New Zealand Dollar', mxn: 'Mexican Peso', rub: 'Russian Ruble',
    krw: 'South Korean Won', btc: 'Bitcoin', eth: 'Ethereum'
  };

  /* --------------------------------------------------------------------------
     2. GLOBAL APPLICATION STATE
     -------------------------------------------------------------------------- */
  const state = {
    currencies: {},           // Map of code -> Full Name
    currencyList: [],         // Array of formatted objects { code, name, countryCode, isPopular, isCrypto }
    fromCurrency: CONFIG.DEFAULT_FROM,
    toCurrency: CONFIG.DEFAULT_TO,
    amount: 1,
    currentRate: 1,
    ratesCache: {},           // Rates cached for current base
    lastUpdateDate: '',
    chartInstance: null,
    chartRange: '7D',
    favorites: [],
    recents: [],
    autoRefreshTimer: null
  };

  /* --------------------------------------------------------------------------
     3. DOM ELEMENTS REFERENCE
     -------------------------------------------------------------------------- */
  const dom = {
    amountInput: document.getElementById('amount-input'),
    inputSymbol: document.getElementById('input-symbol'),
    swapBtn: document.getElementById('swap-btn'),
    convertBtn: document.getElementById('convert-btn'),
    resultValue: document.getElementById('result-value'),
    resultCurrency: document.getElementById('result-currency'),
    unitRate: document.getElementById('unit-rate'),
    updateTime: document.getElementById('update-time'),
    favBtn: document.getElementById('fav-btn'),
    favIcon: document.getElementById('fav-icon'),
    copyBtn: document.getElementById('copy-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    offlineBanner: document.getElementById('offline-banner'),
    
    // Dropdown elements
    fromDropdown: document.getElementById('dropdown-from'),
    toDropdown: document.getElementById('dropdown-to'),
    fromTrigger: document.getElementById('from-trigger'),
    toTrigger: document.getElementById('to-trigger'),
    fromMenu: document.getElementById('menu-from'),
    toMenu: document.getElementById('menu-to'),
    fromSearch: document.getElementById('search-from'),
    toSearch: document.getElementById('search-to'),
    fromList: document.getElementById('list-from'),
    toList: document.getElementById('list-to'),
    fromFlag: document.getElementById('from-flag'),
    toFlag: document.getElementById('to-flag'),
    fromCodeTxt: document.getElementById('from-code'),
    toCodeTxt: document.getElementById('to-code'),
    fromNameTxt: document.getElementById('from-name'),
    toNameTxt: document.getElementById('to-name'),
    
    // Chart elements
    chartCanvas: document.getElementById('rateChart'),
    chartLoader: document.getElementById('chart-loader'),
    chartPairLabel: document.getElementById('chart-pair-label'),
    rangeTabs: document.querySelectorAll('.range-tabs .tab-btn'),
    statHigh: document.getElementById('stat-high'),
    statLow: document.getElementById('stat-low'),
    statAvg: document.getElementById('stat-avg'),
    statChange: document.getElementById('stat-change'),
    
    // Multi-currency & Quick cards
    multiBaseLabel: document.getElementById('multi-base-label'),
    multiGrid: document.getElementById('multi-grid'),
    favoritesContainer: document.getElementById('favorites-container'),
    recentsContainer: document.getElementById('recents-container'),
    toastContainer: document.getElementById('toast-container')
  };

  /* --------------------------------------------------------------------------
     4. INTL HELPERS & UTILITIES
     -------------------------------------------------------------------------- */
  // Get currency symbol (e.g., "USD" -> "$", "INR" -> "₹")
  function getCurrencySymbol(code) {
    try {
      const parts = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code.toUpperCase(),
        currencyDisplay: 'narrowSymbol'
      }).formatToParts(1);
      const symbolObj = parts.find(p => p.type === 'currency');
      return symbolObj ? symbolObj.value : code;
    } catch (e) {
      return code;
    }
  }

  // Get full currency display name using browser Intl API
  function getCurrencyDisplayName(code) {
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'currency' });
      const name = displayNames.of(code.toUpperCase());
      if (name && name.toLowerCase() !== code.toLowerCase()) return name;
    } catch (e) {}
    return state.currencies[code.toLowerCase()] || code.toUpperCase();
  }

  // Derive country code for flags (e.g. USD -> us, INR -> in, CAD -> ca)
  function getCountryCodeForCurrency(code) {
    const upper = code.toUpperCase();
    if (COUNTRY_MAP[upper]) return COUNTRY_MAP[upper];
    if (upper.length === 3 && !CONFIG.CRYPTO_CURRENCIES.includes(code.toLowerCase())) {
      return upper.substring(0, 2).toLowerCase();
    }
    return 'un'; // fallback flag
  }

  // Number Formatter
  function formatNumber(num, decimals = 2) {
    if (isNaN(num)) return '0.00';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: num < 0.01 ? 6 : decimals
    }).format(num);
  }

  // Debounce helper
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Show Toast Message
  function showToast(message, icon = 'fa-check-circle') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  /* --------------------------------------------------------------------------
     5. API LAYER (Multi-tier Fallback System)
     -------------------------------------------------------------------------- */
  
  // Fetch All Currencies List
  async function fetchCurrenciesList() {
    const endpoints = [
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json',
      'https://latest.currency-api.pages.dev/v1/currencies.json'
    ];

    for (let url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          state.currencies = await res.json();
          processCurrencyList();
          return;
        }
      } catch (e) {
        console.warn('Currency list fetch failed, trying mirror...', url);
      }
    }

    // Static fallback if network fails
    state.currencies = FALLBACK_CURRENCIES;
    processCurrencyList();
  }

  // Process raw currency dictionary into structured items
  function processCurrencyList() {
    const entries = Object.entries(state.currencies);
    state.currencyList = entries.map(([codeKey, rawName]) => {
      const code = codeKey.toUpperCase();
      const isCrypto = CONFIG.CRYPTO_CURRENCIES.includes(codeKey.toLowerCase());
      const isPopular = CONFIG.POPULAR_CURRENCIES.includes(code);
      const name = getCurrencyDisplayName(code);
      const countryCode = getCountryCodeForCurrency(code);
      const symbol = getCurrencySymbol(code);

      return {
        code,
        codeKey: codeKey.toLowerCase(),
        name,
        symbol,
        countryCode,
        isPopular,
        isCrypto
      };
    });

    // Sort alphabetically by code
    state.currencyList.sort((a, b) => a.code.localeCompare(b.code));
  }

  // Fetch Live Rates (Primary -> Mirror -> Frankfurter Secondary)
  async function fetchRates(baseCurrency) {
    const fromLower = baseCurrency.toLowerCase();
    const fromUpper = baseCurrency.toUpperCase();

    // 1. Primary Fawaz Ahmed API
    const urlPrimary = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromLower}.json`;
    // 2. Mirror Fawaz Ahmed API
    const urlMirror = `https://latest.currency-api.pages.dev/v1/currencies/${fromLower}.json`;
    
    try {
      const res = await fetch(urlPrimary);
      if (res.ok) {
        const data = await res.json();
        if (data && data[fromLower]) {
          cacheRates(fromUpper, data[fromLower], data.date);
          return { rates: data[fromLower], date: data.date, source: 'Primary' };
        }
      }
    } catch (e) {
      console.warn('Primary rate API failed, falling back to mirror...');
    }

    try {
      const res = await fetch(urlMirror);
      if (res.ok) {
        const data = await res.json();
        if (data && data[fromLower]) {
          cacheRates(fromUpper, data[fromLower], data.date);
          return { rates: data[fromLower], date: data.date, source: 'Mirror' };
        }
      }
    } catch (e) {
      console.warn('Mirror rate API failed, falling back to Frankfurter...');
    }

    // 3. Secondary Fallback (Frankfurter API for fiat)
    try {
      const urlFrankfurter = `https://api.frankfurter.dev/v1/latest?base=${fromUpper}`;
      const res = await fetch(urlFrankfurter);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          const formattedRates = {};
          // Normalize to lower case keys to match standard schema
          Object.keys(data.rates).forEach(k => {
            formattedRates[k.toLowerCase()] = data.rates[k];
          });
          formattedRates[fromLower] = 1; // Base rate = 1
          cacheRates(fromUpper, formattedRates, data.date);
          return { rates: formattedRates, date: data.date, source: 'Frankfurter' };
        }
      }
    } catch (e) {
      console.error('All rate endpoints failed!');
    }

    // Return cached rates if offline or all failed
    const cached = getCachedRates(fromUpper);
    if (cached) {
      return { rates: cached.rates, date: cached.date, source: 'Cache (Offline)' };
    }

    throw new Error('Unable to fetch live exchange rates');
  }

  // Fetch Historical Rate Series for Chart (7D / 30D / 90D)
  async function fetchHistoricalData(from, to, daysCount) {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysCount);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Fast Path: Try Frankfurter time series for supported fiat currencies
    try {
      const frankfurterUrl = `https://api.frankfurter.dev/v1/${startStr}..${endStr}?base=${fromUpper}&symbols=${toUpper}`;
      const res = await fetch(frankfurterUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          const dates = Object.keys(data.rates).sort();
          const rates = dates.map(d => data.rates[d][toUpper]).filter(Boolean);
          if (rates.length > 0) {
            return { dates, rates };
          }
        }
      }
    } catch (e) {
      console.warn('Frankfurter history unavailable, using multi-date fetch fallback...');
    }

    // Fallback Path: Sample dates over requested duration
    const dates = [];
    const step = daysCount <= 7 ? 1 : daysCount <= 30 ? 3 : 7;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + step)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const promises = dates.map(dateStr => {
      const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/${fromLower}.json`;
      return fetch(url).then(r => r.json());
    });

    const results = await Promise.allSettled(promises);
    const validDates = [];
    const validRates = [];

    results.forEach((res, index) => {
      if (res.status === 'fulfilled' && res.value && res.value[fromLower] && res.value[fromLower][toLower]) {
        validDates.push(dates[index]);
        validRates.push(res.value[fromLower][toLower]);
      }
    });

    return { dates: validDates, rates: validRates };
  }

  /* --------------------------------------------------------------------------
     6. LOCAL STORAGE & CACHING
     -------------------------------------------------------------------------- */
  function cacheRates(base, rates, date) {
    try {
      const cacheObj = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RATES_CACHE) || '{}');
      cacheObj[base] = { rates, date, timestamp: Date.now() };
      localStorage.setItem(CONFIG.STORAGE_KEYS.RATES_CACHE, JSON.stringify(cacheObj));
    } catch (e) {}
  }

  function getCachedRates(base) {
    try {
      const cacheObj = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RATES_CACHE) || '{}');
      return cacheObj[base] || null;
    } catch (e) { return null; }
  }

  function loadSavedPreferences() {
    // Theme
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    // Favorites
    try {
      state.favorites = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.FAVORITES)) || ['USD/INR', 'EUR/USD', 'GBP/USD'];
    } catch (e) { state.favorites = ['USD/INR', 'EUR/USD', 'GBP/USD']; }

    // Recents
    try {
      state.recents = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RECENTS)) || [];
    } catch (e) { state.recents = []; }
  }

  function saveFavorites() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.FAVORITES, JSON.stringify(state.favorites));
    renderFavorites();
  }

  function addRecentConversion(from, to) {
    const pair = `${from}/${to}`;
    state.recents = state.recents.filter(p => p !== pair);
    state.recents.unshift(pair);
    if (state.recents.length > 5) state.recents.pop();
    localStorage.setItem(CONFIG.STORAGE_KEYS.RECENTS, JSON.stringify(state.recents));
    renderRecents();
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  }

  /* --------------------------------------------------------------------------
     7. UI RENDERERS & EVENT HANDLERS
     -------------------------------------------------------------------------- */
  
  // Render Custom Searchable Dropdown Items
  function renderDropdownMenu(type) {
    const listEl = type === 'from' ? dom.fromList : dom.toList;
    const searchVal = (type === 'from' ? dom.fromSearch.value : dom.toSearch.value).toLowerCase().trim();
    listEl.innerHTML = '';

    const filtered = state.currencyList.filter(item => {
      if (!searchVal) return true;
      return (
        item.code.toLowerCase().includes(searchVal) ||
        item.name.toLowerCase().includes(searchVal) ||
        item.countryCode.toLowerCase().includes(searchVal)
      );
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="dropdown-item" style="color:var(--text-muted); cursor:default;">No currencies found</div>`;
      return;
    }

    // Grouping: Popular -> All -> Crypto
    const popularGroup = filtered.filter(i => i.isPopular && !i.isCrypto);
    const regularGroup = filtered.filter(i => !i.isPopular && !i.isCrypto);
    const cryptoGroup = filtered.filter(i => i.isCrypto);

    const appendGroup = (title, items) => {
      if (items.length === 0) return;
      const header = document.createElement('div');
      header.className = 'dropdown-group-header';
      header.textContent = title;
      listEl.appendChild(header);

      items.forEach(item => {
        const div = document.createElement('div');
        const selectedCode = type === 'from' ? state.fromCurrency : state.toCurrency;
        div.className = `dropdown-item ${item.code === selectedCode ? 'selected' : ''}`;
        div.setAttribute('role', 'option');
        div.setAttribute('data-code', item.code);

        div.innerHTML = `
          <div class="item-main">
            <img class="flag-img" src="https://flagcdn.com/w40/${item.countryCode}.png" alt="${item.code} flag" onerror="this.src='https://flagcdn.com/w40/un.png';" />
            <div class="item-info">
              <span class="item-code">${item.code}</span>
              <span class="item-name">${item.name}</span>
            </div>
          </div>
          <span class="item-symbol">${item.symbol}</span>
        `;

        div.addEventListener('click', () => {
          selectCurrency(type, item.code);
          closeDropdown(type);
        });

        listEl.appendChild(div);
      });
    };

    if (!searchVal && popularGroup.length > 0) appendGroup('Popular Currencies', popularGroup);
    appendGroup(searchVal ? 'Search Results' : 'All Currencies', searchVal ? filtered : regularGroup);
    if (!searchVal && cryptoGroup.length > 0) appendGroup('Cryptocurrencies', cryptoGroup);
  }

  // Select Currency Action
  function selectCurrency(type, code) {
    if (type === 'from') {
      state.fromCurrency = code;
      updateDropdownTrigger('from', code);
    } else {
      state.toCurrency = code;
      updateDropdownTrigger('to', code);
    }
    updateInputSymbol();
    performConversion();
    updateChart();
    updateFavoriteIcon();
  }

  // Update Trigger Button Display
  function updateDropdownTrigger(type, code) {
    const countryCode = getCountryCodeForCurrency(code);
    const name = getCurrencyDisplayName(code);
    const flagEl = type === 'from' ? dom.fromFlag : dom.toFlag;
    const codeEl = type === 'from' ? dom.fromCodeTxt : dom.toCodeTxt;
    const nameEl = type === 'from' ? dom.fromNameTxt : dom.toNameTxt;

    flagEl.src = `https://flagcdn.com/w40/${countryCode}.png`;
    codeEl.textContent = code;
    nameEl.textContent = name;
  }

  function updateInputSymbol() {
    dom.inputSymbol.textContent = getCurrencySymbol(state.fromCurrency);
  }

  // Dropdown Open/Close Control
  function openDropdown(type) {
    closeDropdown(type === 'from' ? 'to' : 'from'); // close opposing
    const menu = type === 'from' ? dom.fromMenu : dom.toMenu;
    const trigger = type === 'from' ? dom.fromTrigger : dom.toTrigger;
    const searchInput = type === 'from' ? dom.fromSearch : dom.toSearch;

    menu.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
    renderDropdownMenu(type);
    searchInput.focus();
  }

  function closeDropdown(type) {
    const menu = type === 'from' ? dom.fromMenu : dom.toMenu;
    const trigger = type === 'from' ? dom.fromTrigger : dom.toTrigger;
    if (menu) menu.classList.add('hidden');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  /* --------------------------------------------------------------------------
     8. MAIN CONVERSION LOGIC
     -------------------------------------------------------------------------- */
  async function performConversion() {
    const amountVal = parseFloat(dom.amountInput.value);
    state.amount = isNaN(amountVal) || amountVal < 0 ? 0 : amountVal;

    const from = state.fromCurrency;
    const to = state.toCurrency;

    if (from === to) {
      state.currentRate = 1;
      renderResult(state.amount, 1, 'Same Currency');
      renderMultiCurrencyCard(1);
      return;
    }

    try {
      const data = await fetchRates(from);
      state.ratesCache = data.rates;
      state.lastUpdateDate = data.date;

      const rate = data.rates[to.toLowerCase()];
      if (rate !== undefined) {
        state.currentRate = rate;
        renderResult(state.amount * rate, rate, data.date);
        renderMultiCurrencyCard(rate);
        addRecentConversion(from, to);
      } else {
        dom.resultValue.textContent = 'N/A';
        dom.unitRate.textContent = `Rate unavailable for ${to}`;
      }
    } catch (err) {
      console.error('Conversion failed:', err);
      dom.resultValue.textContent = 'Error';
      dom.unitRate.textContent = 'Unable to connect to rate server';
    }
  }

  // Render Converted Result with Count-Up Animation
  function renderResult(convertedAmount, rate, dateInfo) {
    const toSymbol = getCurrencySymbol(state.toCurrency);
    dom.resultCurrency.textContent = `${state.toCurrency} (${toSymbol})`;
    
    // Count-up animation
    animateValue(dom.resultValue, parseFloat(dom.resultValue.textContent.replace(/,/g, '')) || 0, convertedAmount, 400);

    dom.unitRate.textContent = `1 ${state.fromCurrency} = ${formatNumber(rate, 4)} ${state.toCurrency}`;
    dom.updateTime.innerHTML = `<i class="fa-regular fa-clock"></i> Updated: ${dateInfo || 'Live'}`;
  }

  function animateValue(element, start, end, duration) {
    if (isNaN(start)) start = 0;
    const range = end - start;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentVal = start + range * progress;
      element.textContent = formatNumber(currentVal, 2);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = formatNumber(end, 2);
      }
    }
    requestAnimationFrame(step);
  }

  /* --------------------------------------------------------------------------
     9. HISTORICAL RATE CHART MODULE (Chart.js)
     -------------------------------------------------------------------------- */
  async function updateChart() {
    const from = state.fromCurrency;
    const to = state.toCurrency;
    dom.chartPairLabel.textContent = `${from} to ${to} (${state.chartRange})`;
    dom.chartLoader.classList.remove('hidden');

    const daysCount = state.chartRange === '7D' ? 7 : state.chartRange === '30D' ? 30 : 90;

    try {
      const { dates, rates } = await fetchHistoricalData(from, to, daysCount);
      renderChart(dates, rates);
      calculateChartStats(rates);
    } catch (e) {
      console.error('Chart update error:', e);
    } finally {
      dom.chartLoader.classList.add('hidden');
    }
  }

  function renderChart(labels, dataPoints) {
    if (state.chartInstance) {
      state.chartInstance.destroy(); // Prevent memory leak
    }

    const ctx = dom.chartCanvas.getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Gradient background fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.25)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

    state.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${state.fromCurrency} to ${state.toCurrency}`,
          data: dataPoints,
          borderColor: isDark ? '#818cf8' : '#4f46e5',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointRadius: labels.length > 30 ? 0 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4f46e5'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (ctx) => `1 ${state.fromCurrency} = ${formatNumber(ctx.parsed.y, 4)} ${state.toCurrency}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: isDark ? '#94a3b8' : '#64748b',
              maxTicksLimit: 7,
              font: { family: 'Inter', size: 11 }
            }
          },
          y: {
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: {
              color: isDark ? '#94a3b8' : '#64748b',
              font: { family: 'Inter', size: 11 }
            }
          }
        }
      }
    });
  }

  function calculateChartStats(rates) {
    if (!rates || rates.length === 0) {
      dom.statHigh.textContent = '--';
      dom.statLow.textContent = '--';
      dom.statAvg.textContent = '--';
      dom.statChange.textContent = '--';
      return;
    }

    const high = Math.max(...rates);
    const low = Math.min(...rates);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const first = rates[0];
    const last = rates[rates.length - 1];
    const changePct = ((last - first) / first) * 100;

    dom.statHigh.textContent = formatNumber(high, 4);
    dom.statLow.textContent = formatNumber(low, 4);
    dom.statAvg.textContent = formatNumber(avg, 4);

    const changeEl = dom.statChange;
    const sign = changePct >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${formatNumber(changePct, 2)}%`;
    changeEl.className = `stat-value ${changePct >= 0 ? 'up' : 'down'}`;
  }

  /* --------------------------------------------------------------------------
     10. MULTI-CURRENCY COMPARISON CARD
     -------------------------------------------------------------------------- */
  function renderMultiCurrencyCard(baseRate) {
    const popularTargets = ['EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD'].filter(c => c !== state.fromCurrency);
    dom.multiBaseLabel.textContent = `Base: ${formatNumber(state.amount, 2)} ${state.fromCurrency}`;
    dom.multiGrid.innerHTML = '';

    popularTargets.slice(0, 6).forEach(targetCode => {
      const targetRate = state.ratesCache[targetCode.toLowerCase()];
      const itemVal = targetRate ? state.amount * targetRate : 0;
      const countryCode = getCountryCodeForCurrency(targetCode);

      const div = document.createElement('div');
      div.className = 'multi-item';
      div.innerHTML = `
        <div class="multi-item-left">
          <img class="flag-img" src="https://flagcdn.com/w40/${countryCode}.png" alt="${targetCode}" onerror="this.src='https://flagcdn.com/w40/un.png';" />
          <span style="font-weight:700; font-size:0.9rem;">${targetCode}</span>
        </div>
        <span class="multi-val">${formatNumber(itemVal, 2)}</span>
      `;
      dom.multiGrid.appendChild(div);
    });
  }

  /* --------------------------------------------------------------------------
     11. FAVORITES & RECENTS
     -------------------------------------------------------------------------- */
  function updateFavoriteIcon() {
    const currentPair = `${state.fromCurrency}/${state.toCurrency}`;
    if (state.favorites.includes(currentPair)) {
      dom.favIcon.className = 'fa-solid fa-star gold-star';
    } else {
      dom.favIcon.className = 'fa-regular fa-star';
    }
  }

  function toggleFavorite() {
    const currentPair = `${state.fromCurrency}/${state.toCurrency}`;
    if (state.favorites.includes(currentPair)) {
      state.favorites = state.favorites.filter(p => p !== currentPair);
      showToast(`Removed ${currentPair} from favorites`, 'fa-star-half-stroke');
    } else {
      state.favorites.push(currentPair);
      showToast(`Saved ${currentPair} to favorites!`, 'fa-star');
    }
    saveFavorites();
    updateFavoriteIcon();
  }

  function renderFavorites() {
    dom.favoritesContainer.innerHTML = '';
    if (state.favorites.length === 0) {
      dom.favoritesContainer.innerHTML = `<span class="empty-msg">No favorite pairs saved yet.</span>`;
      return;
    }

    state.favorites.forEach(pair => {
      const btn = document.createElement('button');
      btn.className = 'chip-btn';
      btn.innerHTML = `<i class="fa-solid fa-star gold-star"></i> ${pair}`;
      btn.addEventListener('click', () => {
        const [f, t] = pair.split('/');
        state.fromCurrency = f;
        state.toCurrency = t;
        updateDropdownTrigger('from', f);
        updateDropdownTrigger('to', t);
        updateInputSymbol();
        performConversion();
        updateChart();
        updateFavoriteIcon();
      });
      dom.favoritesContainer.appendChild(btn);
    });
  }

  function renderRecents() {
    dom.recentsContainer.innerHTML = '';
    if (state.recents.length === 0) {
      dom.recentsContainer.innerHTML = `<span class="empty-msg">No recent conversions.</span>`;
      return;
    }

    state.recents.forEach(pair => {
      const btn = document.createElement('button');
      btn.className = 'chip-btn';
      btn.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${pair}`;
      btn.addEventListener('click', () => {
        const [f, t] = pair.split('/');
        state.fromCurrency = f;
        state.toCurrency = t;
        updateDropdownTrigger('from', f);
        updateDropdownTrigger('to', t);
        updateInputSymbol();
        performConversion();
        updateChart();
        updateFavoriteIcon();
      });
      dom.recentsContainer.appendChild(btn);
    });
  }

  /* --------------------------------------------------------------------------
     12. EVENT LISTENERS SETUP
     -------------------------------------------------------------------------- */
  function setupEventListeners() {
    // Amount Input (Instant debounced conversion)
    dom.amountInput.addEventListener('input', debounce(() => performConversion(), CONFIG.DEBOUNCE_MS));

    // Preset Amount Chips
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        dom.amountInput.value = btn.dataset.value;
        performConversion();
      });
    });

    // Swap Button
    dom.swapBtn.addEventListener('click', () => {
      const temp = state.fromCurrency;
      state.fromCurrency = state.toCurrency;
      state.toCurrency = temp;

      updateDropdownTrigger('from', state.fromCurrency);
      updateDropdownTrigger('to', state.toCurrency);
      updateInputSymbol();
      performConversion();
      updateChart();
      updateFavoriteIcon();
    });

    // Convert Button
    dom.convertBtn.addEventListener('click', performConversion);

    // Dropdown Triggers
    dom.fromTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openDropdown('from');
    });

    dom.toTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openDropdown('to');
    });

    // Search Inputs
    dom.fromSearch.addEventListener('input', () => renderDropdownMenu('from'));
    dom.toSearch.addEventListener('input', () => renderDropdownMenu('to'));

    // Close Dropdowns on Click Outside
    document.addEventListener('click', (e) => {
      if (!dom.fromDropdown.contains(e.target)) closeDropdown('from');
      if (!dom.toDropdown.contains(e.target)) closeDropdown('to');
    });

    // Favorite Button
    dom.favBtn.addEventListener('click', toggleFavorite);

    // Copy Result Button
    dom.copyBtn.addEventListener('click', () => {
      const text = `${dom.amountInput.value} ${state.fromCurrency} = ${dom.resultValue.textContent} ${state.toCurrency}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast('Result copied to clipboard!', 'fa-copy');
      });
    });

    // Theme Toggle
    dom.themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      updateChart(); // Redraw chart for proper grid contrast
    });

    // Range Tabs
    dom.rangeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        dom.rangeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.chartRange = tab.dataset.range;
        updateChart();
      });
    });

    // Online / Offline Status
    window.addEventListener('online', () => {
      dom.offlineBanner.classList.add('hidden');
      performConversion();
    });
    window.addEventListener('offline', () => {
      dom.offlineBanner.classList.remove('hidden');
    });

    // Auto Refresh Timer (Visibility Aware)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        performConversion();
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    state.autoRefreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        performConversion();
      }
    }, CONFIG.AUTO_REFRESH_MS);
  }

  function stopAutoRefresh() {
    if (state.autoRefreshTimer) clearInterval(state.autoRefreshTimer);
  }

  /* --------------------------------------------------------------------------
     13. APPLICATION INITIALIZATION
     -------------------------------------------------------------------------- */
  async function init() {
    loadSavedPreferences();
    setupEventListeners();

    if (!navigator.onLine) {
      dom.offlineBanner.classList.remove('hidden');
    }

    // Load Currencies
    await fetchCurrenciesList();

    // Set Initial Dropdown Display
    updateDropdownTrigger('from', state.fromCurrency);
    updateDropdownTrigger('to', state.toCurrency);
    updateInputSymbol();

    // Perform Initial Conversion & Render Chart
    await performConversion();
    await updateChart();
    renderFavorites();
    renderRecents();
    updateFavoriteIcon();

    startAutoRefresh();
  }

  // Boot Application
  document.addEventListener('DOMContentLoaded', init);

})();