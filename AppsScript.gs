// ═══════════════════════════════════════════════════════════════════════════
//  Google Apps Script Backend
//  Paste this entire file into Extensions → Apps Script in your Google Sheet.
//  Then: Deploy → New deployment → Web app → Execute as: Me → Anyone → Deploy
//  Copy the Web App URL → paste into DATA_URL in Portfolio.html
// ═══════════════════════════════════════════════════════════════════════════

// ── Sheet name constants ─────────────────────────────────────────────────
const SHEET_SUMMARY      = 'Summary';
const SHEET_HOLDINGS     = 'Holdings';
const SHEET_MARKET_DATA  = 'MarketData';
const SHEET_FX           = 'FX';

// ── Range constants (match your Portis_Portfolio_Database layout) ────────
const SUMMARY_RANGE      = 'B3:B28';   // Summary!B3:B28 — all computed totals
const HOLDINGS_RANGE     = 'A3:U22';   // Holdings!A3:U22 — up to 20 positions
const MARKET_RANGE       = 'A3:V102';  // MarketData!A3:V102 — full market stats
const FX_RANGE           = 'A2:E9';    // FX!A2:E9 — currency rates

// ═══════════════════════════════════════════════════════════════════════════
//  doGet — entry point for all web app requests
// ═══════════════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const payload = buildPayload();
    return buildResponse(payload);
  } catch (err) {
    return buildResponse({ error: err.message, stack: err.stack });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  buildPayload — reads all sheets and assembles the JSON object
// ═══════════════════════════════════════════════════════════════════════════
function buildPayload() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── 1. Read Summary sheet ───────────────────────────────────────────────
  const summarySheet = ss.getSheetByName(SHEET_SUMMARY);
  const sumVals = summarySheet.getRange(SUMMARY_RANGE).getValues(); // [row][0]
  // B3=index0, B4=index1, … B28=index25
  const bRow = (n) => {
    const val = sumVals[n - 3][0];
    return (val === '' || val === null || val === undefined) ? null : val;
  };

  const summary = {
    totalCost:       num(bRow(3)),   // B3
    dayChangeNZD:    num(bRow(4)),   // B4
    portfolioValue:  num(bRow(5)),   // B5 ★
    totalReturnNZD:  num(bRow(6)),   // B6
    totalReturnPct:  num(bRow(7)),   // B7  (fraction: 0.15 = 15%)
    dayChangePct:    num(bRow(8)),   // B8  (fraction)
    numHoldings:     num(bRow(9)),   // B9
    kernelValue:     num(bRow(12)),  // B12 ★
    sharesiesValue:  num(bRow(13)),  // B13 ★
    usValue:         num(bRow(16)),  // B16 ★
    nzxValue:        num(bRow(17)),  // B17 ★
    asxValue:        num(bRow(18)),  // B18 ★
    usPct:           num(bRow(19)),  // B19 ★ (fraction)
    nzxPct:          num(bRow(20)),  // B20 ★ (fraction)
    asxPct:          num(bRow(21)),  // B21 ★ (fraction)
    usdToNzd:        num(bRow(24)),  // B24 ★
    audToNzd:        num(bRow(25)),  // B25 ★
    lastRefreshed:   dateStr(bRow(28)), // B28
  };

  // ── 2. Read FX sheet ────────────────────────────────────────────────────
  // FX!A2:E9  cols: Currency | Rate to NZD | Pair | Last Refreshed | Notes
  const fxSheet = ss.getSheetByName(SHEET_FX);
  const fxVals  = fxSheet.getRange(FX_RANGE).getValues();
  const fx      = { NZD: 1.00 };
  fxVals.forEach(row => {
    const ccy  = row[0] ? String(row[0]).trim().toUpperCase() : '';
    const rate = parseFloat(row[1]);
    if (ccy && !isNaN(rate) && rate > 0) fx[ccy] = rate;
  });
  // Override summary FX with live sheet values if available
  if (fx.USD && fx.USD > 0) summary.usdToNzd = fx.USD;
  if (fx.AUD && fx.AUD > 0) summary.audToNzd = fx.AUD;

  // ── 3. Read Holdings sheet ──────────────────────────────────────────────
  // Holdings!A3:U22 — 21 columns per row (see column mapping in Portfolio.html)
  // Col: A=platform B=ticker C=exchange D=name E=assetClass F=country
  //      G=sector H=industry I=currency J=shares K=avgCost L=price
  //      M=dayPct N=fxRate O=costNZD P=valueNZD Q=returnNZD R=returnPct
  //      S=dayChgNZD T=weightPct U=color
  const holdingsSheet = ss.getSheetByName(SHEET_HOLDINGS);
  const holdVals      = holdingsSheet.getRange(HOLDINGS_RANGE).getValues();
  const holdings      = [];

  holdVals.forEach(row => {
    const ticker = str(row[1]);
    if (!ticker) return; // skip empty rows
    holdings.push({
      platform:   str(row[0])  || '—',
      tk:         ticker,
      mkt:        exchangeToMkt(str(row[2])),
      exchange:   str(row[2]),
      name:       str(row[3]),
      assetClass: str(row[4]),
      country:    str(row[5]),
      sector:     str(row[6]),
      industry:   str(row[7]),
      currency:   str(row[8])  || 'NZD',
      shares:     num(row[9])  || 0,
      cost:       num(row[10]) || 0,   // avg cost per share (native)
      px:         num(row[11]) || 0,   // current price (native, from MarketData)
      day:        num(row[12]) || 0,   // day change % (fraction)
      fxRate:     num(row[13]) || 1,   // FX rate to NZD
      costNZD:    num(row[14]) || 0,
      valueNZD:   num(row[15]) || 0,
      returnNZD:  num(row[16]) || 0,
      returnPct:  num(row[17]) || 0,   // fraction
      dayChgNZD:  num(row[18]) || 0,
      weightPct:  num(row[19]) || 0,   // fraction
      color:      str(row[20]) || '#787E96',
    });
  });

  // ── 4. Read MarketData sheet ────────────────────────────────────────────
  // MarketData!A3:V102 — full GOOGLEFINANCE stats per ticker
  // Row: A=rowNum B=ticker C=exchange D=price E=dayChgPct F=dayChgAbs
  //      G=open H=high I=low J=volume K=mktCap L=52wHigh M=52wLow
  //      N=52wChgPct O=peRatio P=eps Q=divPerShare R=divYield
  //      S=beta T=sharesOut U=priceTgt V=currency
  const mdSheet = ss.getSheetByName(SHEET_MARKET_DATA);
  const mdVals  = mdSheet.getRange(MARKET_RANGE).getValues();
  const marketData = {};

  mdVals.forEach(row => {
    const ticker = str(row[1]);
    if (!ticker) return;
    marketData[ticker] = {
      ticker:      ticker,
      exchange:    str(row[2]),
      price:       num(row[3]),
      dayChgPct:   num(row[4]),
      dayChgAbs:   num(row[5]),
      open:        num(row[6]),
      high:        num(row[7]),
      low:         num(row[8]),
      volume:      num(row[9]),
      mktCap:      num(row[10]),
      high52w:     num(row[11]),
      low52w:      num(row[12]),
      chg52wPct:   num(row[13]),
      peRatio:     num(row[14]),
      eps:         num(row[15]),
      divPerShare: num(row[16]),
      divYield:    num(row[17]),
      beta:        num(row[18]),
      sharesOut:   num(row[19]),
      priceTgt:    str(row[20]),
      currency:    str(row[21]),
    };
  });

  return {
    summary,
    holdings,
    marketData,
    fx,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Wrap JSON with CORS headers so the browser can fetch it. */
function buildResponse(obj) {
  const json = JSON.stringify(obj);
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/** Safely coerce to number; returns null if not a real number. */
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

/** Safely coerce to trimmed string; returns '' if falsy. */
function str(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** Serialize dates to ISO string; pass through strings. */
function dateStr(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/**
 * Map exchange code from the spreadsheet (NZE, ASX, NASDAQ, NYSE…)
 * to the mkt token the HTML uses (NZX, ASX, US).
 */
function exchangeToMkt(exchange) {
  const e = (exchange || '').toUpperCase();
  if (e === 'NZE') return 'NZX';
  if (e === 'ASX') return 'ASX';
  return 'US';
}

// ═══════════════════════════════════════════════════════════════════════════
//  Manual test — run this function in the Apps Script editor to verify output
// ═══════════════════════════════════════════════════════════════════════════
function testPayload() {
  const payload = buildPayload();
  Logger.log(JSON.stringify(payload, null, 2));
  Logger.log('Holdings: ' + payload.holdings.length);
  Logger.log('Summary portfolioValue: ' + payload.summary.portfolioValue);
  Logger.log('FX USD→NZD: ' + payload.fx.USD);
}
