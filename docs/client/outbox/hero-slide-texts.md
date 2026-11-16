# Hero slide texts — 3 photos from Raad Exhibition

Draft, 2026-11-16. For the owner to paste into admin → Hero slides. Nothing sent to the client.

**Limits used** (API `apps/api/src/content/content.service.ts`: title 120, subtitle 300, cta_label 40, alt 200, url 500). Our texts are far shorter so they fit on a phone: title ≤ 40, subtitle ≤ 90, cta_label ≤ 20, alt ≤ 150 characters.
**Script:** UZ is Latin, same style as `uz.ts` (apostrophe ʻ in `Toshkent`-type words as the site uses; `so‘m`).
**Claims used (all from current site texts):** "from 1 day" (`home.hero_subtitle`, `home.hero_stat_min`), "delivery across Tashkent" (`home.hero_stat_delivery`), "furniture, decor, light and sound" (`home.hero_subtitle`), fair-specific rental (`events.subtitle`, `fair.*`). No prices, discounts, stock numbers or free-cancellation claim used.
**CTA URLs:** category links on the site use the category id (`/catalog?category=<id>`), which is not stable text, so category-level links are not suggested. Real routes: `/catalog`, `/catalog?sort=popular` (used in the footer), `/events`.

## Recommended order
1. Slide 1 (trade-fair hall, chair + glass table): sets the exhibition context, links to `/events`.
2. Slide 2 (bright lounge): general catalog.
3. Slide 3 (bar): catalog, popular items.

---

## Slide 1 — cantilever chair, glass table, fair hall behind
**Placement:** text on the left (dark area), left-aligned, vertically centred.

| Field | RU (base) | UZ (`_uz`) | EN (`_en`) |
|---|---|---|---|
| title | Мебель для Вашего стенда | Stendingiz uchun mebel | Furniture for your stand |
| subtitle | Выберите выставку — привезём и подготовим всё под площадку. | Koʻrgazmani tanlang — hammasini maydonga yetkazib, tayyorlaymiz. | Pick your fair — we deliver and set up for the venue. |
| cta_label | Выбрать выставку | Koʻrgazmani tanlash | Choose a fair |
| cta_url | `/events` | `/events` | `/events` |
| alt | Белое кресло на хромированном каркасе и круглый стеклянный стол с растением и чашкой кофе, на фоне выставочного зала | Xrom oyoqli oq kreslo va oʻsimlik hamda qahva piyolasi turgan yumaloq shisha stol, orqada koʻrgazma zali | White chrome cantilever chair and a round glass table with a plant and a coffee cup, with an exhibition hall in the background |

Alternative headline: RU «Выставочный стенд начинается с мебели» · UZ «Koʻrgazma stendi mebeldan boshlanadi» · EN «A great stand starts with furniture»
Sources: `events.subtitle`, `events.title`, `fair.choose` (UZ «Ushbu ko‘rgazmani tanlash»). (UZ «maydon» = venue: check by a native speaker; the site uses «maydonga» in `events.subtitle`, so it is consistent.)

## Slide 2 — shell chair, round wooden table, bright lounge
**Placement:** text bottom-left or left third over the window light; if the area is bright, use the dark overlay in the admin preview. Orange pouf on the right stays visible.

| Field | RU (base) | UZ (`_uz`) | EN (`_en`) |
|---|---|---|---|
| title | Светлая зона отдыха на Вашем мероприятии | Tadbiringizda yorugʻ dam olish zonasi | A bright lounge for your event |
| subtitle | Мебель, декор, свет и звук — от 1 дня, с доставкой по Ташкенту. | Mebel, dekor, yorugʻlik va ovoz — 1 kundan, Toshkent boʻylab yetkazib berish bilan. | Furniture, decor, lighting and sound — from 1 day, delivered across Tashkent. |
| cta_label | Смотреть каталог | Katalogni koʻrish | View catalogue |
| cta_url | `/catalog` | `/catalog` | `/catalog` |
| alt | Белое кресло-ракушка и круглый стол на деревянных ножках с двумя капучино в светлой гостевой зоне с большими окнами и оранжевым пуфом | Yogʻoch oyoqli yumaloq stol yonidagi oq chigʻanoq kreslo, ikki chashka kapuchino; katta derazali yorugʻ zonada toʻq sariq puf | White shell chair and a round table on wooden legs with two cappuccinos, in a bright lounge with large windows and an orange pouf |

Alternative headline: RU «Уют, который запомнят гости» · UZ «Mehmonlar eslab qoladigan qulaylik» · EN «Comfort your guests will remember»
Sources: subtitle is `home.hero_subtitle` verbatim (RU/EN; UZ respelled with ʻ as in the other UZ keys), cta = `home.hero_slide_cta`.

## Slide 3 — white bar stools, lit bar counter, warm orange light
**Placement:** text on the left (dark area), left-aligned; keep the lit counter on the right free.

| Field | RU (base) | UZ (`_uz`) | EN (`_en`) |
|---|---|---|---|
| title | Барная зона для любого формата | Har qanday tadbir uchun bar zonasi | A bar area for any event |
| subtitle | Барные стулья, стойки и декор — подберём под Ваше мероприятие. | Bar stullari, peshtaxtalar va dekor — tadbiringizga mos tanlaymiz. | Bar stools, counters and decor, matched to your event. |
| cta_label | Подобрать | Tanlash | Browse |
| cta_url | `/catalog?sort=popular` | `/catalog?sort=popular` | `/catalog?sort=popular` |
| alt | Белые глянцевые барные стулья у подсвеченной барной стойки с тёплым оранжевым светом и вазой с цветами | Iliq toʻq sariq yorugʻlikdagi yoritilgan bar peshtaxtasi yonida oq yaltiroq bar stullari va gul solingan vaza | White glossy bar stools at a lit bar counter with warm orange light and a vase of flowers |

Alternative headline: RU «Место, где собираются гости» · UZ «Mehmonlar yigʻiladigan joy» · EN «Where your guests gather»
Notes: «Барные стулья» matches category `Барный стул` (`category_name.Барный стул`: UZ «Bar stuli», EN «Bar Stool»). «peshtaxta» (counter) and «Tanlash» (check by a native speaker). The site shows no bar counters as a category, so "counters" in the subtitle holds only if the catalog has them: owner/client to confirm, else use «Барные стулья и декор».

---

## Scan table

| Slide | RU title | UZ title | EN title |
|---|---|---|---|
| 1 | Мебель для Вашего стенда | Stendingiz uchun mebel | Furniture for your stand |
| 2 | Светлая зона отдыха на Вашем мероприятии | Tadbiringizda yorugʻ dam olish zonasi | A bright lounge for your event |
| 3 | Барная зона для любого формата | Har qanday tadbir uchun bar zonasi | A bar area for any event |

## Open questions
1. Does the catalog contain bar counters? If not, change slide 3 subtitle to «Барные стулья и декор — подберём под Ваше мероприятие.» (default).
2. Should slide 1 link to `/events` (default) or straight to `/catalog`?
3. Should a native speaker check the UZ lines marked above before publishing?
