/* 3D-сцена за первым экраном на three.js.

   Правила, из-за которых этот файл отдельный и подключён как type="module":
   - Кнопка регистрации и вся логика живут в app.js и не зависят от этого
     файла. Если three.js не загрузится или WebGL нет, страница остаётся
     ровно такой же, просто без 3D.
   - Библиотека грузится ПОСЛЕ загрузки страницы, в свободное время
     браузера: первый экран и кнопка появляются без ожидания.
   - Не грузим вовсе: при «уменьшить движение», при режиме экономии
     трафика и на 2G. Встроенный браузер Instagram медленный, а 52,5%
     трафика Ventorme — Instagram (Т3).
   - Рисуем только пока первый экран виден и вкладка активна.          */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const conn = navigator.connection || {};
const slowNet = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "");
const hero = document.querySelector(".hero");

if (hero && !reduce && !slowNet) {
  const go = () => import(THREE_URL).then(init).catch(() => {});
  const later = () => ("requestIdleCallback" in window)
    ? requestIdleCallback(go, { timeout: 2500 })
    : setTimeout(go, 1200);
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}

function init(THREE) {
  const canvas = document.createElement("canvas");
  canvas.className = "hero-3d";
  canvas.setAttribute("aria-hidden", "true");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (e) {
    return; // WebGL нет — остаётся CSS-знак
  }
  hero.prepend(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const BLUE = 0x3B47FF, LIME = 0xC6F432, VIOLET = 0x8C94FF;

  // ---------- звезда-знак: астроида (четыре вогнутые дуги), выдавленная в объём
  const shape = new THREE.Shape();
  const N = 120, R = 1.35;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = R * Math.pow(Math.cos(t), 3);
    const y = R * Math.pow(Math.sin(t), 3);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const starGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.32, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 6, curveSegments: 4
  });
  starGeo.center();
  const starMat = new THREE.MeshStandardMaterial({ color: BLUE, metalness: 0.35, roughness: 0.25, emissive: 0x1a1f8c, emissiveIntensity: dark ? 0.6 : 0.25 });
  const star = new THREE.Mesh(starGeo, starMat);

  // Маленькая лаймовая искра рядом — как ✦ в логотипе ventorme.ai.
  const spark = new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({ color: LIME, metalness: 0.2, roughness: 0.35, emissive: 0x4a6400, emissiveIntensity: 0.35 }));
  spark.scale.setScalar(0.34);

  // ---------- каркасная сфера-орбита и облако частиц
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.25, 1),
    new THREE.MeshBasicMaterial({ color: VIOLET, wireframe: true, transparent: true, opacity: dark ? 0.22 : 0.16 })
  );

  const COUNT = 420;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const cBlue = new THREE.Color(BLUE), cLime = new THREE.Color(LIME), cViolet = new THREE.Color(VIOLET);
  for (let i = 0; i < COUNT; i++) {
    // кольцо-тор вокруг звезды с разбросом
    const a = Math.random() * Math.PI * 2;
    const r = 2.6 + (Math.random() - 0.5) * 1.6;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 1.1;
    pos[i * 3 + 2] = Math.sin(a) * r;
    const c = Math.random() < 0.18 ? cLime : (Math.random() < 0.5 ? cBlue : cViolet);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  ptsGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(ptsGeo, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
  points.rotation.x = 0.35;

  const rig = new THREE.Group();     // всё вместе двигается за курсором
  rig.add(wire, points, star, spark);
  scene.add(rig);

  scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.55 : 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 6);
  scene.add(key);
  const rim = new THREE.PointLight(LIME, 18, 12);
  rim.position.set(-3, -2, 3);
  scene.add(rim);

  // ---------- размер и место: на телефоне сцена справа сверху, за заголовком;
  // на широком экране — между текстом и панелью.
  let wide = false;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    wide = w >= 700;
    if (wide) { rig.position.set(0.6, 0.6, 0); rig.scale.setScalar(1.05); }
    else { rig.position.set(1.95, 1.45, 0); rig.scale.setScalar(0.5); }
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---------- курсор (только мышь) и мягкая инерция
  let tx = 0, ty = 0, cx = 0, cy = 0;
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // ---------- рисуем только когда видно
  let visible = true, raf = 0;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(hero);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });

  const clock = new THREE.Clock();
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;

    star.rotation.y = t * 0.6;
    star.rotation.x = Math.sin(t * 0.7) * 0.25;
    star.position.y = Math.sin(t * 1.1) * 0.12;
    spark.position.set(Math.cos(t * 0.9) * 1.6, 0.9 + Math.sin(t * 1.3) * 0.2, Math.sin(t * 0.9) * 1.6);
    spark.rotation.z = -t * 1.4;
    wire.rotation.y = -t * 0.12;
    wire.rotation.x = t * 0.07;
    points.rotation.y = t * 0.18;

    rig.rotation.y = cx * 0.35;
    rig.rotation.x = cy * 0.25;
    renderer.render(scene, camera);
  }

  requestAnimationFrame(() => {
    canvas.classList.add("is-on");
    document.documentElement.classList.add("has-3d");
  });
  loop();

  initStars(THREE, starGeo, dark);
}

/* ---------------------------------------------------- фон из 3D-звёзд
   Отдельный холст на весь экран, позади всего содержимого: мелкие искры
   на разной глубине и десяток объёмных звёзд-знаков. При прокрутке фон
   сдвигается медленнее страницы (параллакс), на компьютере — за курсором.
   Один вызов отрисовки на искры, плотность пикселей занижена, на телефоне
   рисуем каждый второй кадр: фон не должен сажать батарею. */
function initStars(THREE, starGeo, dark) {
  const canvas = document.createElement("canvas");
  canvas.className = "stars-bg";
  canvas.setAttribute("aria-hidden", "true");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  } catch (e) { return; }
  document.body.prepend(canvas);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.25));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
  camera.position.z = 12;

  // Текстура искры: четырёхлучевая звёздочка с мягким свечением, рисуется
  // на маленьком canvas один раз — без картинок и запросов.
  const tc = document.createElement("canvas");
  tc.width = tc.height = 64;
  const g = tc.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.beginPath();
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const x = 32 + 30 * Math.pow(Math.cos(t), 3), y = 32 + 30 * Math.pow(Math.sin(t), 3);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.fill();
  g.globalCompositeOperation = "lighter";
  g.fillStyle = "rgba(255,255,255,.9)";
  g.beginPath(); g.arc(32, 32, 3.5, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(tc);

  const COUNT = coarse ? 380 : 700;
  const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3);
  const palette = dark
    ? [new THREE.Color(0xF2F3F8), new THREE.Color(0x8C94FF), new THREE.Color(0xC6F432)]
    : [new THREE.Color(0x3B47FF), new THREE.Color(0x8C94FF), new THREE.Color(0x9BC21F)];
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 44;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 70 - 14;   // ниже — на всю длину страницы
    pos[i * 3 + 2] = -Math.random() * 30;
    const c = palette[Math.random() < 0.12 ? 2 : (Math.random() < 0.55 ? 0 : 1)];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.42, map: tex, vertexColors: true, transparent: true,
    opacity: dark ? 0.9 : 0.55, depthWrite: false, sizeAttenuation: true
  }));
  scene.add(dust);

  // Объёмные звёзды-знаки на разной глубине.
  const mats = [
    new THREE.MeshStandardMaterial({ color: 0x3B47FF, metalness: 0.3, roughness: 0.3, transparent: true, opacity: dark ? 0.85 : 0.5 }),
    new THREE.MeshStandardMaterial({ color: 0x8C94FF, metalness: 0.3, roughness: 0.35, transparent: true, opacity: dark ? 0.8 : 0.45 }),
    new THREE.MeshStandardMaterial({ color: 0xC6F432, metalness: 0.2, roughness: 0.4, transparent: true, opacity: dark ? 0.8 : 0.55 })
  ];
  const stars3d = [];
  const N3 = coarse ? 7 : 12;
  for (let i = 0; i < N3; i++) {
    const m = new THREE.Mesh(starGeo, mats[i % 3]);
    m.position.set((Math.random() - 0.5) * 26, 6 - i * (60 / N3) + Math.random() * 3, -4 - Math.random() * 14);
    m.scale.setScalar(0.25 + Math.random() * 0.35);
    m.userData = { sx: 0.2 + Math.random() * 0.5, sy: 0.3 + Math.random() * 0.6, ph: Math.random() * 6 };
    scene.add(m);
    stars3d.push(m);
  }
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 6, 8);
  scene.add(key);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  let mx = 0, my = 0, cx = 0, cy = 0;
  if (!coarse) {
    window.addEventListener("pointermove", (e) => {
      mx = (e.clientX / window.innerWidth - 0.5);
      my = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
  }

  const clock = new THREE.Clock();
  let raf = 0, frame = 0;
  function loop() {
    cancelAnimationFrame(raf);
    if (document.hidden) return;
    raf = requestAnimationFrame(loop);
    if (coarse && (frame++ & 1)) return;   // телефон: 30 кадров в секунду
    const t = clock.getElapsedTime();
    const scroll = window.scrollY || window.pageYOffset || 0;
    cx += (mx - cx) * 0.04; cy += (my - cy) * 0.04;
    camera.position.x = cx * 1.6;
    camera.position.y = -scroll * 0.012 - cy * 1.2;   // параллакс: фон едет медленнее
    camera.lookAt(camera.position.x * 0.5, camera.position.y, 0);
    dust.rotation.z = t * 0.01;
    for (const m of stars3d) {
      const u = m.userData;
      m.rotation.x = t * u.sx + u.ph;
      m.rotation.y = t * u.sy + u.ph;
    }
    renderer.render(scene, camera);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });
  requestAnimationFrame(() => canvas.classList.add("is-on"));
  loop();
}
