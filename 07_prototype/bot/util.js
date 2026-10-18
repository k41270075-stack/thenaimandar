// Даты, серия и склонения. Время бота — Астана (UTC+5): напоминание в 19:00, тихие часы 22:00–08:00.
const TZ_OFFSET_MIN = 5 * 60;

// 'YYYY-MM-DD' по времени Астаны
export function dayKey(date = new Date()) {
  return new Date(date.getTime() + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10);
}

export function prevDay(key) {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Номер дня с 1970-01-01: по нему выбираем задание дня
export function dayNumber(key) {
  return Math.floor(new Date(key + 'T00:00:00Z').getTime() / 86400000);
}

export function astanaHour(date = new Date()) {
  return new Date(date.getTime() + TZ_OFFSET_MIN * 60000).getUTCHours();
}

export function isQuietHours(date = new Date()) {
  const h = astanaHour(date);
  return h >= 22 || h < 8;
}

// Серия, которую видит ученик: жива, если был активен сегодня или вчера
export function liveStreak(user, today = dayKey()) {
  if (!user || !user.lastActive) return 0;
  return user.lastActive === today || user.lastActive === prevDay(today) ? user.streak || 0 : 0;
}

// Отметить активность за день: вчера был → серия +1, сегодня уже был → без изменений, иначе серия 1
export function touchStreak(user, today = dayKey()) {
  if (user.lastActive === today) return false;
  user.streak = user.lastActive === prevDay(today) ? (user.streak || 0) + 1 : 1;
  user.lastActive = today;
  return true;
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function days(n) { return `${n}\u00A0${plural(n, 'день', 'дня', 'дней')}`; }
