// Хранилище в памяти для запуска на компьютере (npm start) без Upstash.
// Повторяет те команды Redis, которыми пользуется store.js. Всё стирается при остановке.
const data = new Map();
const expires = new Map();

function alive(key) {
  const t = expires.get(key);
  if (t && t <= Date.now()) {
    data.delete(key);
    expires.delete(key);
  }
  return data.has(key);
}

// Как в Upstash: значения хранятся сериализованными, наружу отдаются копии
const pack = (v) => JSON.stringify(v);
const unpack = (v) => (v === undefined ? null : JSON.parse(v));

function setOf(key) {
  if (!alive(key)) data.set(key, new Set());
  return data.get(key);
}

function listOf(key) {
  if (!alive(key)) data.set(key, []);
  return data.get(key);
}

function range(list, start, stop) {
  const n = list.length;
  const s = start < 0 ? Math.max(0, n + start) : start;
  const e = stop < 0 ? n + stop : stop;
  return list.slice(s, e + 1);
}

export const memoryRedis = {
  async get(key) { return alive(key) ? unpack(data.get(key)) : null; },
  async set(key, value, opts = {}) {
    if (opts.nx && alive(key)) return null;
    data.set(key, pack(value));
    if (opts.ex) expires.set(key, Date.now() + opts.ex * 1000);
    else expires.delete(key);
    return 'OK';
  },
  async mget(...keys) { return keys.map((k) => (alive(k) ? unpack(data.get(k)) : null)); },
  async del(...keys) {
    let n = 0;
    keys.forEach((k) => { if (alive(k)) n++; data.delete(k); expires.delete(k); });
    return n;
  },
  async incr(key) {
    const v = (alive(key) ? Number(unpack(data.get(key))) : 0) + 1;
    data.set(key, pack(v));
    return v;
  },
  async expire(key, seconds) {
    if (!alive(key)) return 0;
    expires.set(key, Date.now() + seconds * 1000);
    return 1;
  },
  async sadd(key, ...members) {
    const s = setOf(key);
    const before = s.size;
    members.forEach((m) => s.add(String(m)));
    return s.size - before;
  },
  async srem(key, ...members) {
    const s = setOf(key);
    return members.filter((m) => s.delete(String(m))).length;
  },
  async smembers(key) { return [...setOf(key)]; },
  async scard(key) { return setOf(key).size; },
  async rpush(key, ...values) {
    const l = listOf(key);
    l.push(...values.map(pack));
    return l.length;
  },
  async lpush(key, ...values) {
    const l = listOf(key);
    values.forEach((v) => l.unshift(pack(v)));
    return l.length;
  },
  async ltrim(key, start, stop) {
    data.set(key, range(listOf(key), start, stop));
    return 'OK';
  },
  async lrange(key, start, stop) { return range(listOf(key), start, stop).map(unpack); }
};
