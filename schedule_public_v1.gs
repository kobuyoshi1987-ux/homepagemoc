// ============================================================
// 保護者閲覧ページ GAS - v1.0
// ・U15 / U14 / U13 カレンダーのイベントを月間カレンダーで表示
// ・学年別に色分け表示
// ・学年別活動率を上部に表示
// ・doGet でWebアプリとして公開
// ============================================================

// -------- カレンダー設定 --------
const CALENDARS = {
  U15: {
    id: '00f2c76be64b8468a347da205d5c1ac01152ec41f2d436b36e09f3ccfca406ac@group.calendar.google.com',
    label: 'U15',
    color: '#4A90D9',
    bgColor: '#E8F4FD',
  },
  U14: {
    id: '43f66c98445f5a7d6d89407ba713a4933aae79057fef4beb943b84b1afc90832@group.calendar.google.com',
    label: 'U14',
    color: '#9B59B6',
    bgColor: '#F5EEF8',
  },
  U13: {
    id: 'f7c20fe49f6a9b23d1bd4fe2052fe62b74edca5263886a4059e915e8a699d239@group.calendar.google.com',
    label: 'U13',
    color: '#27AE60',
    bgColor: '#EAFAF1',
  },
};

const TIMEZONE = 'Asia/Tokyo';

// -------- doGet: Webアプリのエントリーポイント --------
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const now = new Date();

  // URLパラメータで年月を指定可能（例: ?year=2026&month=4）
  const year  = parseInt(params.year  || now.getFullYear());
  const month = parseInt(params.month || (now.getMonth() + 1));

  const events      = fetchAllEvents(year, month);
  const activityRates = calcActivityRates(year, month, events);
  const html        = buildHtml(year, month, events, activityRates);

  return HtmlService.createHtmlOutput(html)
    .setTitle('秋田スポーツPLUS スケジュール')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// -------- 全カレンダーからイベント取得 --------
function fetchAllEvents(year, month) {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate   = new Date(year, month,     0, 23, 59, 59); // 月末

  const allEvents = [];

  Object.values(CALENDARS).forEach(cal => {
    try {
      const calendar = CalendarApp.getCalendarById(cal.id);
      if (!calendar) return;

      calendar.getEvents(startDate, endDate).forEach(ev => {
        allEvents.push({
          title:    ev.getTitle(),
          start:    ev.getStartTime(),
          end:      ev.getEndTime(),
          location: ev.getLocation() || '',
          allDay:   ev.isAllDayEvent(),
          label:    cal.label,
          color:    cal.color,
          bgColor:  cal.bgColor,
        });
      });
    } catch(err) {
      Logger.log(`カレンダー取得エラー (${cal.label}): ${err}`);
    }
  });

  return allEvents;
}

// -------- 学年別活動率算出 --------
function calcActivityRates(year, month, events) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const rates = {};

  Object.keys(CALENDARS).forEach(key => {
    const label    = CALENDARS[key].label;
    const activeDays = new Set();

    events
      .filter(ev => ev.label === label)
      .forEach(ev => {
        const d = ev.start.getDate();
        activeDays.add(d);
      });

    const count = activeDays.size;
    rates[label] = {
      days:  count,
      total: daysInMonth,
      rate:  Math.round(count / daysInMonth * 1000) / 10, // 小数点第1位
    };
  });

  return rates;
}

// -------- HTML生成 --------
function buildHtml(year, month, events, activityRates) {
  const daysInMonth  = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=日

  // 前月・翌月リンク用
  const prevYear  = month === 1  ? year - 1 : year;
  const prevMonth = month === 1  ? 12 : month - 1;
  const nextYear  = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1  : month + 1;

  // 日付ごとにイベントをグループ化
  const eventsByDay = {};
  for (let d = 1; d <= daysInMonth; d++) eventsByDay[d] = [];
  events.forEach(ev => {
    const d = ev.start.getDate();
    if (eventsByDay[d]) eventsByDay[d].push(ev);
  });

  // 活動率HTML
  const rateHtml = Object.values(CALENDARS).map(cal => {
    const r = activityRates[cal.label];
    return `
      <div class="rate-card" style="border-left: 4px solid ${cal.color}">
        <span class="rate-label" style="color:${cal.color}">${cal.label}</span>
        <span class="rate-value">${r.rate}%</span>
        <span class="rate-detail">${r.days}日 ／ ${r.total}日</span>
      </div>`;
  }).join('');

  // カレンダーグリッド HTML
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dayHeaderHtml = dayNames.map((d, i) => {
    const cls = i === 0 ? 'day-header sun' : i === 6 ? 'day-header sat' : 'day-header';
    return `<div class="${cls}">${d}</div>`;
  }).join('');

  let cellsHtml = '';
  // 空白セル（月初の曜日まで）
  for (let i = 0; i < firstDayOfWeek; i++) {
    cellsHtml += '<div class="day-cell empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dow     = new Date(year, month - 1, d).getDay();
    const isSun   = dow === 0;
    const isSat   = dow === 6;
    const cls     = `day-cell${isSun ? ' sun' : isSat ? ' sat' : ''}`;

    const evHtml = eventsByDay[d].map(ev => {
      const timeStr = ev.allDay ? '終日' : formatTime(ev.start) + '〜' + formatTime(ev.end);
      const loc     = ev.location ? `<span class="ev-loc">📍${ev.location}</span>` : '';
      return `
        <div class="event" style="background:${ev.bgColor}; border-left:3px solid ${ev.color}">
          <span class="ev-badge" style="background:${ev.color}">${ev.label}</span>
          <span class="ev-title">${escapeHtml(ev.title)}</span>
          <span class="ev-time">${timeStr}</span>
          ${loc}
        </div>`;
    }).join('');

    cellsHtml += `
      <div class="${cls}">
        <div class="day-num">${d}</div>
        ${evHtml}
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>秋田スポーツPLUS スケジュール</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hiragino Kaku Gothic Pro', 'Meiryo', sans-serif; background: #F7F9FC; color: #333; }

  header {
    background: #1A3A5C;
    color: white;
    padding: 16px 20px;
    text-align: center;
  }
  header h1 { font-size: 1.2rem; letter-spacing: 0.05em; }
  header p  { font-size: 0.75rem; opacity: 0.8; margin-top: 4px; }

  .container { max-width: 900px; margin: 0 auto; padding: 16px; }

  /* 活動率 */
  .rates {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .rate-card {
    flex: 1;
    min-width: 120px;
    background: white;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rate-label  { font-size: 0.8rem; font-weight: bold; }
  .rate-value  { font-size: 1.6rem; font-weight: bold; color: #1A3A5C; }
  .rate-detail { font-size: 0.75rem; color: #888; }

  /* 月ナビゲーション */
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .nav a {
    background: white;
    border: 1px solid #DDD;
    border-radius: 6px;
    padding: 6px 14px;
    text-decoration: none;
    color: #1A3A5C;
    font-size: 0.85rem;
  }
  .nav a:hover { background: #EEF3F8; }
  .nav h2 { font-size: 1.1rem; color: #1A3A5C; }

  /* 凡例 */
  .legend {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
  }
  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  /* カレンダーグリッド */
  .calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    background: #DDD;
    border-radius: 8px;
    overflow: hidden;
  }
  .day-header {
    background: #1A3A5C;
    color: white;
    text-align: center;
    padding: 8px 4px;
    font-size: 0.8rem;
    font-weight: bold;
  }
  .day-header.sun { background: #C0392B; }
  .day-header.sat { background: #2980B9; }

  .day-cell {
    background: white;
    min-height: 80px;
    padding: 4px;
    vertical-align: top;
  }
  .day-cell.empty { background: #F0F0F0; }
  .day-cell.sun .day-num { color: #C0392B; }
  .day-cell.sat .day-num { color: #2980B9; }
  .day-num {
    font-size: 0.85rem;
    font-weight: bold;
    margin-bottom: 4px;
    text-align: right;
    color: #555;
  }

  /* イベント */
  .event {
    border-radius: 4px;
    padding: 3px 5px;
    margin-bottom: 3px;
    font-size: 0.7rem;
    line-height: 1.4;
  }
  .ev-badge {
    display: inline-block;
    color: white;
    border-radius: 3px;
    padding: 0 4px;
    font-size: 0.65rem;
    font-weight: bold;
    margin-right: 3px;
  }
  .ev-title { font-weight: bold; }
  .ev-time  { display: block; color: #666; font-size: 0.65rem; }
  .ev-loc   { display: block; color: #888; font-size: 0.65rem; }

  /* スマホ対応 */
  @media (max-width: 600px) {
    .day-cell { min-height: 60px; }
    .event    { font-size: 0.62rem; }
    .ev-time, .ev-loc { display: none; }
  }

  footer {
    text-align: center;
    font-size: 0.7rem;
    color: #AAA;
    margin-top: 24px;
    padding-bottom: 24px;
  }
</style>
</head>
<body>

<header>
  <h1>⚽ 秋田スポーツPLUS ジュニアユース スケジュール</h1>
  <p>最終更新: ${formatDateTime(new Date())}</p>
</header>

<div class="container">

  <!-- 活動率 -->
  <div style="margin: 16px 0 4px; font-size:0.8rem; color:#888;">📊 ${year}年${month}月の活動率</div>
  <div class="rates">${rateHtml}</div>

  <!-- 月ナビ -->
  <div class="nav">
    <a href="?year=${prevYear}&month=${prevMonth}">◀ ${prevMonth}月</a>
    <h2>${year}年 ${month}月</h2>
    <a href="?year=${nextYear}&month=${nextMonth}">${nextMonth}月 ▶</a>
  </div>

  <!-- 凡例 -->
  <div class="legend">
    ${Object.values(CALENDARS).map(cal =>
      `<div class="legend-item">
        <div class="legend-dot" style="background:${cal.color}"></div>
        <span>${cal.label}</span>
      </div>`
    ).join('')}
  </div>

  <!-- カレンダー -->
  <div class="calendar">
    ${dayHeaderHtml}
    ${cellsHtml}
  </div>

</div>

<footer>NPO法人 秋田スポーツPLUS</footer>
</body>
</html>`;
}

// -------- ユーティリティ --------
function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDateTime(date) {
  return Utilities.formatDate(date, TIMEZONE, 'yyyy/MM/dd HH:mm');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// -------- 動作確認用（ログ出力） --------
function testFetch() {
  const now    = new Date();
  const events = fetchAllEvents(now.getFullYear(), now.getMonth() + 1);
  Logger.log(`取得イベント数: ${events.length}`);
  events.forEach(ev => Logger.log(`[${ev.label}] ${ev.title} / ${ev.start}`));
}
