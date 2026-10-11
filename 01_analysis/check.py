#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Проверка цифр кейса Ventorme по таблицам Т1-Т11.

Зачем нужен: все проценты в causes.md и в презентации набиты руками. Критерий
"верно прочитаны цифры" - основной в разборе (40 баллов). Этот скрипт
пересчитывает каждую цифру из CSV, сверяет с тем, что написано в causes.md,
и отдельно проверяет, какие различия статистически значимы, а какие - шум.

Запуск:
    python3 01_analysis/check.py            # отчёт в терминал
    python3 01_analysis/check.py --md       # то же + перезапись 01_analysis/numbers.md

Если какая-то строка помечена РАСХОЖДЕНИЕ - цифру в causes.md надо исправить
(или исправить ожидаемое значение здесь, если причина в округлении).
"""

import csv
import math
import os
import sys

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

OUT = []


def say(line=""):
    print(line)
    OUT.append(line)


# ---------------------------------------------------------------- загрузка CSV

def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as fh:
        return [row for row in csv.DictReader(fh)]


def index(rows, key):
    """Словарь по первому столбцу, строка 'Всего' выбрасывается."""
    return {r[key]: r for r in rows if r[key] != "Всего"}


def num(row, key):
    return float(row[key])


# ------------------------------------------------------------------ статистика

def wilson(k, n, z=1.96):
    """95% доверительный интервал для доли (метод Вильсона).
    Работает и при k=0, в отличие от обычной формулы."""
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, centre - half) * 100, min(1.0, centre + half) * 100)


def phi(x):
    """Функция распределения стандартного нормального."""
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def z_test(k1, n1, k2, n2):
    """Двусторонний тест равенства двух долей (объединённая дисперсия).
    Возвращает (z, p). Нужен, чтобы отличить реальную разницу от шума."""
    if n1 == 0 or n2 == 0:
        return (0.0, 1.0)
    p1, p2 = k1 / n1, k2 / n2
    p = (k1 + k2) / (n1 + n2)
    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    if se == 0:
        return (0.0, 1.0)
    z = (p1 - p2) / se
    return (z, 2 * (1 - phi(abs(z))))


def binom_at_most(k, n, p):
    """P(X <= k) для биномиального. Для случая 'ноль регистраций из 48'."""
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k + 1))


def verdict(p):
    if p < 0.001:
        return "значимо (p<0.001)"
    if p < 0.01:
        return f"значимо (p={p:.3f})"
    if p < 0.05:
        return f"значимо (p={p:.3f})"
    if p < 0.10:
        return f"на грани (p={p:.2f}) - называть причиной рано"
    return f"ШУМ (p={p:.2f}) - разницы не доказали"


# ------------------------------------------------------- сверка с causes.md

problems = []


def check(label, got, expected, tol=0.1, unit="%"):
    """Сверяет пересчитанное значение с тем, что написано в causes.md."""
    ok = abs(got - expected) <= tol
    mark = "ок" if ok else "РАСХОЖДЕНИЕ"
    if not ok:
        problems.append(f"{label}: в документах {expected}{unit}, пересчёт даёт {got:.1f}{unit}")
    say(f"  [{mark:>12}] {label}: {got:.1f}{unit} (в документах {expected}{unit})")


def pct(k, n):
    return k / n * 100 if n else 0.0


# ---------------------------------------------------------------------- данные

t1 = {r["action"]: r for r in load("T01_actions.csv")}
t2 = index(load("T02_devices.csv"), "device")
t3 = index(load("T03_sources.csv"), "source")
t4 = index(load("T04_source_x_device.csv"), "source")
t5 = index(load("T05_weeks.csv"), "week")
t6 = index(load("T06_scroll.csv"), "scroll_depth")
t7 = index(load("T07_visit_length.csv"), "first_visit_length")
t8 = {r["step"]: r for r in load("T08_quiz_funnel.csv")}
t8b = index(load("T08b_quiz_vs_no_quiz.csv"), "group")
t9 = index(load("T09_clicks.csv"), "element")
t10 = index(load("T10_language.csv"), "site_language")
t11 = {r["method"]: r for r in load("T11_signup_method.csv")}

ALL_N = num(t1["Все новые посетители главной"], "visitors")
ALL_R = num(t1["Зарегистрировались в течение 3 дней"], "visitors")
PH_N, PH_R = num(t2["Телефон"], "visitors"), num(t2["Телефон"], "registered")
DE_N, DE_R = num(t2["Компьютер"], "visitors"), num(t2["Компьютер"], "registered")

SRC = list(t4)
ph_n = {s: num(t4[s], "phone_visitors") for s in SRC}
ph_r = {s: num(t4[s], "phone_registered") for s in SRC}
de_n = {s: num(t4[s], "desktop_visitors") for s in SRC}
de_r = {s: num(t4[s], "desktop_registered") for s in SRC}


# =============================================================== 1. СВЕРКА
say("=" * 78)
say("1. СВЕРКА ЦИФР ИЗ causes.md С ТАБЛИЦАМИ")
say("=" * 78)

say("\nТ1-Т3 Общая картина")
check("общая конверсия", pct(ALL_R, ALL_N), 19.1)
check("конверсия телефона (Т2)", pct(PH_R, PH_N), 15.6)
check("конверсия компьютера (Т2)", pct(DE_R, DE_N), 32.8)
check("доля телефона в трафике (Т2)", pct(PH_N, ALL_N), 80.5)
check("доля Instagram в трафике (Т3)", pct(num(t3["Instagram"], "visitors"), ALL_N), 52.5)
check("конверсия Instagram (Т3)", pct(num(t3["Instagram"], "registered"), num(t3["Instagram"], "visitors")), 11.0)
check("конверсия Facebook (Т3)", pct(num(t3["Facebook"], "registered"), num(t3["Facebook"], "visitors")), 0.0)
check("не дошли до страницы регистрации (Т1)",
      100 - pct(num(t1["Открыли страницу регистрации или входа"], "visitors"), ALL_N), 74.8)

say("\nТ4 Источник x устройство")
check("прямой заход, телефон", pct(ph_r["Прямой заход"], ph_n["Прямой заход"]), 23.3)
check("прямой заход, компьютер", pct(de_r["Прямой заход"], de_n["Прямой заход"]), 23.4)
check("Instagram, телефон", pct(ph_r["Instagram"], ph_n["Instagram"]), 10.6)
check("Google, телефон", pct(ph_r["Google"], ph_n["Google"]), 36.8)
check("Google, компьютер", pct(de_r["Google"], de_n["Google"]), 53.7)
check("доля Instagram в телефонном трафике", pct(ph_n["Instagram"], PH_N), 64.0, tol=0.5)

ex = [s for s in SRC if s not in ("Instagram", "Facebook")]
ex_ph_n, ex_ph_r = sum(ph_n[s] for s in ex), sum(ph_r[s] for s in ex)
ex_de_n, ex_de_r = sum(de_n[s] for s in ex), sum(de_r[s] for s in ex)
check("без Instagram и Facebook: телефон", pct(ex_ph_r, ex_ph_n), 27.4)
check("без Instagram и Facebook: компьютер", pct(ex_de_r, ex_de_n), 33.8)

say("\nТ5 Недели")
w = t5["24-30 августа"]
check("неделя 24-30 авг: конверсия", pct(num(w, "registered"), num(w, "visitors")), 6.8)
check("неделя 24-30 авг: доля телефона", pct(num(w, "from_phone"), num(w, "visitors")), 88.9)
rest_n = ALL_N - num(w, "visitors")
rest_r = ALL_R - num(w, "registered")
check("без этой недели общая конверсия была бы", pct(rest_r, rest_n), 24.3)

say("\nТ6 Прокрутка")
ns = t6["Не прокручивали (только первый экран)"]
check("не прокручивали, телефон", pct(num(ns, "phone_registered"), num(ns, "phone_visitors")), 3.6)
check("не прокручивали, компьютер", pct(num(ns, "desktop_registered"), num(ns, "desktop_visitors")), 28.0)
q = t6["1-24%"]
check("прокрутили 1-24%, телефон", pct(num(q, "phone_registered"), num(q, "phone_visitors")), 29.5)
en = t6["До конца страницы"]
check("прокрутили до конца, телефон", pct(num(en, "phone_registered"), num(en, "phone_visitors")), 12.5)

say("\nТ7 Длина визита")
sh = t7["Меньше 10 секунд"]
check("короче 10 секунд, доля телефонов", pct(num(sh, "phone_visitors"), PH_N), 30.0)

say("\nТ8 Квиз")
st = num(t8["Начали отвечать"], "all_devices")
check("начали квиз, все устройства", pct(st, ALL_N), 14.4)
check("начали квиз, телефон", pct(num(t8["Начали отвечать"], "phone"), PH_N), 16.1)
check("начали квиз, компьютер", pct(num(t8["Начали отвечать"], "desktop"), DE_N), 7.0)
check("дошли до конца квиза, телефон",
      pct(num(t8["Дошли до конца"], "phone"), num(t8["Начали отвечать"], "phone")), 94.5)
qr = num(t8["Зарегистрировались (из начавших квиз)"], "all_devices")
check("доля всех регистраций через квиз", pct(qr, ALL_R), 50.8)
check("доля телефонных регистраций через квиз",
      pct(num(t8["Зарегистрировались (из начавших квиз)"], "phone"), PH_R), 68.8, tol=0.3)
check("телефон без квиза",
      pct(num(t8b["Не начинали квиз"], "phone_registered"), num(t8b["Не начинали квиз"], "phone_visitors")), 5.8)
ca = num(t8["Нажали кнопку регистрации в конце квиза"], "phone")
rg = num(t8["Зарегистрировались (из начавших квиз)"], "phone")
check("потеря на форме после квиза, телефон", 100 - pct(rg, ca), 20.0, tol=0.5)

say("\nТ9 Нажатия")
check("'Регистрация', телефон", pct(num(t9["Регистрация"], "phone_visitors"), PH_N), 0.8)
check("'Регистрация', компьютер", pct(num(t9["Регистрация"], "desktop_visitors"), DE_N), 11.1)
check("'Войти', телефон", pct(num(t9["Войти"], "phone_visitors"), PH_N), 1.0)
check("'Войти', компьютер", pct(num(t9["Войти"], "desktop_visitors"), DE_N), 9.8)
check("cookie 'Принять', телефон", pct(num(t9["Принять (баннер про cookie)"], "phone_visitors"), PH_N), 48.3)
check("cookie 'Принять', компьютер", pct(num(t9["Принять (баннер про cookie)"], "desktop_visitors"), DE_N), 34.4)
dead = t9["Элементы без текста: картинки иконки пустые места"]
check("мёртвые нажатия, телефон", pct(num(dead, "phone_visitors"), PH_N), 20.5)
check("мёртвые нажатия, компьютер", pct(num(dead, "desktop_visitors"), DE_N), 13.9)
gap_quiz = num(t9["Начать тест (несколько кнопок)"], "all_devices") - st
check("нажали 'Начать тест', но не начали квиз", gap_quiz, 90.0, tol=1.0, unit=" чел.")

say("\nТ10-Т11 Язык и способ входа")
check("русский", pct(num(t10["Русский"], "registered"), num(t10["Русский"], "visitors")), 18.4)
check("английский", pct(num(t10["Английский"], "registered"), num(t10["Английский"], "visitors")), 21.3)
check("казахский: посетителей", num(t10["Казахский"], "visitors"), 13.0, unit=" чел.")
check("доля регистраций через Google", pct(num(t11["Через Google"], "all_devices"), ALL_R), 55.3)

# "хотя бы N человек из Instagram зарегистрировались через Google"
g_ph = num(t11["Через Google"], "phone")
non_ig_ph_r = PH_R - ph_r["Instagram"]
check("из Instagram прошли через Google, не меньше", g_ph - non_ig_ph_r, 4.0, tol=0.5, unit=" чел.")


# ============================================ 2. ДЕКОМПОЗИЦИЯ РАЗРЫВА
say("\n" + "=" * 78)
say("2. ГЛАВНЫЙ РАСЧЁТ: СКОЛЬКО РАЗРЫВА ТЕЛЕФОН/КОМПЬЮТЕР - ЭТО СОСТАВ ИСТОЧНИКОВ")
say("=" * 78)
say("""
Метод: прямая стандартизация. Берём конверсии телефона по каждому источнику
и считаем, какой была бы общая конверсия телефона, если бы структура
источников у него была такая же, как у компьютера. Разницу между реальной и
стандартизованной конверсией даёт состав трафика, остаток - само устройство.""")


def decompose(keys, label):
    PN, PR = sum(ph_n[s] for s in keys), sum(ph_r[s] for s in keys)
    DN, DR = sum(de_n[s] for s in keys), sum(de_r[s] for s in keys)
    ph, de = pct(PR, PN), pct(DR, DN)
    std = sum(de_n[s] * (ph_r[s] / ph_n[s]) for s in keys if ph_n[s]) / DN * 100
    gap, comp, dev = de - ph, std - ph, de - std
    say(f"\n{label}")
    say(f"  телефон {ph:.1f}%   компьютер {de:.1f}%   разрыв {gap:.1f} п.п.")
    say(f"  телефон при структуре источников компьютера: {std:.1f}%")
    say(f"  -> состав источников: {comp:.1f} п.п. = {comp / gap * 100:.0f}% разрыва")
    say(f"  -> само устройство:   {dev:.1f} п.п. = {dev / gap * 100:.0f}% разрыва")
    return comp / gap * 100


full = decompose(SRC, "Все источники")
big = decompose(["Instagram", "Прямой заход", "Google", "Facebook"],
                "Без групп меньше 30 человек (выброшены Яндекс и 'Другие сайты')")
say(f"""
Устойчивость: {full:.0f}% и {big:.0f}% - вывод почти не меняется, когда убираем
мелкие и потому ненадёжные группы. Значит, он держится не на шуме.

Формулировка для презентации: две трети разрыва телефон/компьютер создаёт
не устройство, а то, какой трафик на это устройство приходит.""")


# ====================================== 3. ЗНАЧИМОСТЬ: ПРИЧИНА ИЛИ ШУМ
say("\n" + "=" * 78)
say("3. ПРИЧИНА ИЛИ СОВПАДЕНИЕ: ПРОВЕРКА КАЖДОГО УТВЕРЖДЕНИЯ")
say("=" * 78)
say("""
Правило: группа меньше 30 человек - проценты не используем. Для остальных
считаем, могла ли разница получиться случайно.""")

pairs = [
    ("Кнопка 'Регистрация': телефон vs компьютер (Т9)",
     num(t9["Регистрация"], "phone_visitors"), PH_N, num(t9["Регистрация"], "desktop_visitors"), DE_N),
    ("Первый экран без прокрутки: телефон vs компьютер (Т6)",
     num(ns, "phone_registered"), num(ns, "phone_visitors"),
     num(ns, "desktop_registered"), num(ns, "desktop_visitors")),
    ("Instagram vs прямой заход, оба с телефона (Т4)",
     ph_r["Instagram"], ph_n["Instagram"], ph_r["Прямой заход"], ph_n["Прямой заход"]),
    ("ПРОВЕРКА НАШЕГО ВЫВОДА: прямой заход, телефон vs компьютер (Т4)",
     ph_r["Прямой заход"], ph_n["Прямой заход"], de_r["Прямой заход"], de_n["Прямой заход"]),
    ("Google: телефон vs компьютер (Т4)",
     ph_r["Google"], ph_n["Google"], de_r["Google"], de_n["Google"]),
    ("Начали квиз vs не начинали, телефон (Т8b)",
     num(t8b["Начали квиз"], "phone_registered"), num(t8b["Начали квиз"], "phone_visitors"),
     num(t8b["Не начинали квиз"], "phone_registered"), num(t8b["Не начинали квиз"], "phone_visitors")),
    ("Английский vs русский (Т10)",
     num(t10["Английский"], "registered"), num(t10["Английский"], "visitors"),
     num(t10["Русский"], "registered"), num(t10["Русский"], "visitors")),
    ("Казахский vs русский (Т10) - мало данных",
     num(t10["Казахский"], "registered"), num(t10["Казахский"], "visitors"),
     num(t10["Русский"], "registered"), num(t10["Русский"], "visitors")),
    ("Неделя 24-30 авг vs остальные (Т5)",
     num(w, "registered"), num(w, "visitors"), rest_r, rest_n),
]

for label, k1, n1, k2, n2 in pairs:
    k1, n1, k2, n2 = int(k1), int(n1), int(k2), int(n2)
    z, p = z_test(k1, n1, k2, n2)
    lo1, hi1 = wilson(k1, n1)
    lo2, hi2 = wilson(k2, n2)
    small = " [<30 чел.!]" if min(n1, n2) < 30 else ""
    say(f"\n{label}{small}")
    say(f"  {pct(k1, n1):5.1f}% ({k1}/{n1}), 95% ДИ {lo1:.1f}-{hi1:.1f}%")
    say(f"  {pct(k2, n2):5.1f}% ({k2}/{n2}), 95% ДИ {lo2:.1f}-{hi2:.1f}%")
    say(f"  -> {verdict(p)}")

# Facebook: точный тест, потому что ноль успехов
fb_n = int(num(t3["Facebook"], "visitors"))
base = PH_R / PH_N
p_fb = binom_at_most(0, fb_n, base)
lo, hi = wilson(0, fb_n)
say(f"\nFacebook: 0 регистраций из {fb_n} (Т3) - точный биномиальный тест")
say(f"  если бы конверсия была как у телефона в целом ({base * 100:.1f}%),")
say(f"  вероятность случайно получить ноль = {p_fb * 100:.3f}%")
say(f"  95% ДИ для нуля из {fb_n}: {lo:.1f}-{hi:.1f}% -> {verdict(p_fb)}")

# Малые группы, по которым нельзя делать выводы
say("\nГруппы, по которым проценты использовать нельзя (меньше 30 человек):")
for s in SRC:
    for dev_label, n_, r_ in (("телефон", ph_n[s], ph_r[s]), ("компьютер", de_n[s], de_r[s])):
        if 0 < n_ < 30:
            lo, hi = wilson(int(r_), int(n_))
            say(f"  Т4 {s} / {dev_label}: {int(r_)}/{int(n_)} = {pct(r_, n_):.1f}%, "
                f"но 95% ДИ {lo:.0f}-{hi:.0f}% - сказать нечего")
kz_lo, kz_hi = wilson(int(num(t10['Казахский'], 'registered')), int(num(t10['Казахский'], 'visitors')))
say(f"  Т10 казахский: 4/13 = 30.8%, но 95% ДИ {kz_lo:.0f}-{kz_hi:.0f}% - это не вывод, а неосвоенный рынок")


# ================================================ 4. ЦЕНА ПРИЧИН
say("\n" + "=" * 78)
say("4. ЦЕНА ПРИЧИН В РЕГИСТРАЦИЯХ (ОЦЕНКА СВЕРХУ)")
say("=" * 78)
say("""
Каждая строка отвечает на вопрос "сколько регистраций потеряно", если
сравнить группу с сопоставимой группой, где проблемы нет. Это ОЦЕНКА СВЕРХУ:
мы допускаем, что проблему можно устранить полностью.

ВАЖНО: строки НЕЛЬЗЯ СКЛАДЫВАТЬ. Группы пересекаются - например, те, кто не
прокручивал на телефоне, это в основном те же люди из Instagram. Сумма дала бы
цифру больше реально возможной.""")

base_direct = ph_r["Прямой заход"] / ph_n["Прямой заход"]
ig_fb_n = ph_n["Instagram"] + ph_n["Facebook"]
ig_fb_r = ph_r["Instagram"] + ph_r["Facebook"]
c1 = ig_fb_n * base_direct - ig_fb_r

ns_ph_n, ns_ph_r = num(ns, "phone_visitors"), num(ns, "phone_registered")
ns_de_rate = num(ns, "desktop_registered") / num(ns, "desktop_visitors")
c2 = ns_ph_n * ns_de_rate - ns_ph_r

reg_page = num(t1["Открыли страницу регистрации или входа"], "visitors")
c4 = reg_page - ALL_R

say(f"""
Причина 1. Instagram и Facebook с телефона
  {int(ig_fb_n)} человек, {int(ig_fb_r)} регистраций ({pct(ig_fb_r, ig_fb_n):.1f}%).
  При конверсии прямого захода с телефона ({base_direct * 100:.1f}%) было бы
  {ig_fb_n * base_direct:.0f} -> ПОТЕРЯ ~{c1:.0f} регистраций (+{c1 / ALL_R * 100:.0f}% к текущим {int(ALL_R)}).

Причина 2. Первый экран на телефоне
  {int(ns_ph_n)} человек не прокручивали, {int(ns_ph_r)} регистраций ({pct(ns_ph_r, ns_ph_n):.1f}%).
  При конверсии таких же людей на компьютере ({ns_de_rate * 100:.1f}%) было бы
  {ns_ph_n * ns_de_rate:.0f} -> ПОТЕРЯ ~{c2:.0f} регистраций.
  (Пересекается с причиной 1: холодный трафик из Instagram как раз не прокручивает.)

Причина 3. Разрыв между кнопкой 'Начать тест' и квизом
  {int(gap_quiz)} человек нажали и не начали квиз (Т9 минус Т8).
  Это не оценка, а прямая потеря: проверить руками, куда ведут кнопки.

Причина 8. Страница регистрации и форма
  Открыли {int(reg_page)}, зарегистрировались {int(ALL_R)} -> {int(c4)} человек ({pct(c4, reg_page):.0f}%) ушли с формы.
  После квиза на телефоне: {int(ca)} нажали 'Создать аккаунт', дошли {int(rg)} ({100 - pct(rg, ca):.0f}% потеряно).""")


# ==================================================== итог
say("\n" + "=" * 78)
if problems:
    say(f"ИТОГ: найдено расхождений - {len(problems)}. Исправить перед сдачей:")
    for p_ in problems:
        say("  - " + p_)
else:
    say("ИТОГ: все цифры из causes.md сошлись с таблицами. Расхождений нет.")
say("=" * 78)

if "--md" in sys.argv:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "numbers.md")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("# Пересчёт всех цифр из таблиц (автоматически)\n\n")
        fh.write("Не редактировать руками: файл перезаписывается командой\n")
        fh.write("`python3 01_analysis/check.py --md`.\n\n")
        fh.write("```\n" + "\n".join(OUT) + "\n```\n")
    print(f"\nЗаписано: {path}")

sys.exit(1 if problems else 0)
