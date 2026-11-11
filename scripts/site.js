// Site behaviour shared by every page. Small on purpose: the page works without it.
// Becomes an Astro <script> at WEB-3.

// ---------- Mobile menu (WEB-5.5, WEB-5.6) ----------
const toggle = document.querySelector(".menu-toggle");
const menu = document.getElementById("main-menu");

if (toggle && menu) {
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
}

// was until 2026-10-13: the header line is now always on (header.css), so this is not needed.
// ---------- Header border after scrolling 10 px (WEB-5.4) ----------
// const header = document.querySelector(".site-header");
// if (header) {
//   const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
//   onScroll();
//   window.addEventListener("scroll", onScroll, { passive: true });
// }

// ---------- Fade sections in when they scroll into view (WEB-7.8) ----------
const items = document.querySelectorAll(".reveal-scroll");

// Entrances (2026-10-30, Krishna): sections alternate two styles, and the pieces inside arrive in turn (base.css).
// A list, quote, grid, text column, card set or media column is opened up so its own items take turns too.
const GROUP = /(^|\s)[\w]+-(list|grid|text|quote|cards|steps|media)(\s|$)/;
// Each page can pick its own pair with <body data-enter="…"> (2026-10-30, Krishna: not the same on every page).
// cards (Services): cards lift into place, then the next section settles from a touch larger. Default: slides from the sides.
const ENTRANCE_SETS = { cards: ["enter-lift", "enter-settle"] };
const ENTRANCES = ENTRANCE_SETS[document.body.dataset.enter] || ["enter-left", "enter-right"];
const CARD_PAGE = document.body.dataset.enter === "cards";
const CARD_SIDES = ["card-left", "card-right", "card-up"];
const isCard = (el) => ["ARTICLE", "DETAILS"].includes(el.tagName) || /card/.test(el.className);
items.forEach((section, n) => {
  // was until 2026-10-30 (Krishna: text moving in from the sides): section.classList.add(n % 2 ? "enter-focus" : "enter-rise");
  // was until 2026-10-30 (Krishna: not the same entrances on every page): section.classList.add(n % 2 ? "enter-right" : "enter-left");
  section.classList.add(ENTRANCES[n % 2]);
  const parts = [];
  for (const child of section.children) {
    const isGroup = ["UL", "OL", "BLOCKQUOTE"].includes(child.tagName) || GROUP.test(child.className);
    // On a card page, a wrapper holding a card set (Services: Optional extras) is opened too, so each extra is its own card (2026-10-30, Krishna)
    const inner = CARD_PAGE && !isGroup && !isCard(child)
      && [...child.children].find((c) => GROUP.test(c.className) && [...c.children].some(isCard));
    if (inner) {
      for (const c of child.children) parts.push(...(c === inner ? inner.children : [c]));
      continue;
    }
    parts.push(...(isGroup && child.children.length ? child.children : [child]));
  }
  // was until 2026-10-30 (Krishna: three different sides, each card only when it is scrolled to):
  // let cards = 0;
  //   if (["ARTICLE", "DETAILS"].includes(part.tagName) || /card/.test(part.className)) {
  //     part.classList.add(cards++ % 2 ? "card-right" : "card-left");
  //   }
  let cards = 0;   // cards on a card page take turns: from the left, from the right, up from below (base.css, Services, 2026-10-30)
  parts.forEach((part, i) => {
    // FAQ questions step in one after another from the same side, like stairs (2026-10-30, Krishna)
    if (CARD_PAGE && isCard(part)) {
      part.classList.add("is-card", part.tagName === "DETAILS" ? "card-step" : CARD_SIDES[cards++ % CARD_SIDES.length]);
    }
    part.classList.add("enter-part");
    // stagger, capped so long lists don't drag; a photo never queues behind the text (2026-10-30, Krishna: photos felt slow)
    const photo = part.querySelector("img") || part.tagName === "IMG";
    part.style.setProperty("--d", photo ? 0 : Math.min(i, 10));
    if (photo) part.classList.add("has-photo");   // a photo comes in from the side opposite the text (base.css)
  });
});

// ---------- First screen: the headline rises word by word, then the rest follows (base.css, 2026-10-30, Krishna) ----------
const intro = document.querySelector("main > section");
const introTitle = intro && intro.querySelector("h1");
if (introTitle && !intro.classList.contains("reveal-scroll")) {
  let w = 0;
  const walker = document.createTreeWalker(introTitle, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  texts.forEach((node) => {
    const bits = node.textContent.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    bits.forEach((bit) => {
      if (!bit) return;
      if (/^\s+$/.test(bit)) { frag.append(bit); return; }
      const word = document.createElement("span");
      const inner = document.createElement("span");
      word.className = "word";
      inner.textContent = bit;
      inner.style.setProperty("--d", w++);
      word.append(inner);
      frag.append(word);
    });
    node.replaceWith(frag);
  });
  // the text under the headline: each fading piece, or the pieces next to the headline when one block holds both
  const rest = [...intro.querySelectorAll(".reveal")].flatMap((el) =>
    el === introTitle ? [] : el.contains(introTitle) ? [...el.children].filter((c) => !c.contains(introTitle)) : [el]);
  rest.forEach((el, i) => { el.classList.add("intro-part"); el.style.setProperty("--d", i); });
  intro.classList.add("intro-enter");
}

// Once a piece (and its photo) has arrived, mark it so the browser can drop the extra layer (base.css, 2026-10-30).
document.addEventListener("animationend", (e) => {
  if (!["enter-left", "enter-right", "enter-lift", "enter-settle", "card-left", "card-right", "card-up", "card-step", "unveil", "unveil-left", "unveil-right", "unveil-up"].includes(e.animationName)) return;
  const part = e.target.closest(".enter-part");
  if (!part || part.classList.contains("entered")) return;
  const img = part.querySelector("img");
  if (e.target === part && img && !img.getAnimations().every((a) => a.playState === "finished")) return;
  part.classList.add("entered");
});

// Photos (2026-10-30, Krishna: they felt slow): each uncovers only once it has loaded, and a section's photos
// start loading a screen before the section arrives, so they are ready when it does.
document.querySelectorAll(".enter-part img").forEach((img) => {
  const ready = () => img.classList.add("is-loaded");
  if (img.complete && img.naturalWidth) ready();
  else { img.addEventListener("load", ready, { once: true }); img.addEventListener("error", ready, { once: true }); }
});
if ("IntersectionObserver" in window) {
  const early = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = "eager"; });
      early.unobserve(entry.target);
    }
  }, { rootMargin: "100% 0px 100% 0px" });
  items.forEach((el) => { if (el.querySelector("img")) early.observe(el); });
}

// How we work cards on Home (2026-11-05, Krishna: the same entrance as on desktop): where the cards stack (below 1200 px),
// each card waits until it is scrolled to and then slides in from its section's side, the way all five arrive together
// on desktop. Cards that come into view together still take turns (the card observer below). Wide screens unchanged.
if (window.matchMedia("(max-width: 74.99rem)").matches) {
  document.querySelectorAll(".journey-cards > .journey-card.enter-part").forEach((card) => {
    const fromRight = card.closest(".enter-right");
    card.classList.add("is-card", fromRight ? "card-slide-right" : "card-slide-left");
  });
}

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -10% 0px" });
  items.forEach((el) => io.observe(el));

  // Each card arrives on its own when it is scrolled to, not with its section (2026-10-30, Krishna).
  // Cards that come into view together still take turns.
  const cardIo = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry, i) => {
      entry.target.style.setProperty("--d", i);
      entry.target.classList.add("card-in");
      cardIo.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -15% 0px" });
  document.querySelectorAll(".is-card").forEach((card) => cardIo.observe(card));
} else {
  items.forEach((el) => el.classList.add("is-visible"));
  document.querySelectorAll(".is-card").forEach((card) => card.classList.add("card-in"));
}

// ---------- Demo phones on the Mobile apps card: play, repeat, pause (app-show.css, 2026-11-01, Krishna: make sure it goes on) ----------
// Starts once the card has arrived; after the last stamp and a short rest, the screen whites out and the round starts
// again. A Pause demo button stops it (anything moving longer than 5 seconds needs one), and it rests while off screen.
// With reduced motion no animation runs, so nothing repeats.
document.querySelectorAll(".app-stage").forEach((stage) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const card = stage.closest(".is-card") || stage;
  const REST = 1800; // ms on the points screen before the next round (was 2600 until 2026-11-01: felt like it had stopped)
  let userPaused = false, hidden = false, timer = 0;
  const setPaused = () => stage.classList.toggle("app-paused", userPaused || hidden);
  const later = (fn, ms) => { // a wait that also stops while paused
    const tick = () => { if (userPaused || hidden) { timer = setTimeout(tick, 250); return; } if ((ms -= 250) <= 0) fn(); else timer = setTimeout(tick, 250); };
    timer = setTimeout(tick, 250);
  };
  const start = () => { if (!stage.classList.contains("app-play")) stage.classList.add("app-play"); };
  if (card.classList.contains("card-in") || card === stage) start();
  else new MutationObserver((_, mo) => { if (card.classList.contains("card-in")) { mo.disconnect(); start(); } }).observe(card, { attributes: true, attributeFilter: ["class"] });

  let played = 0; // seconds this round has been playing (paused time not counted)
  const restart = () => {
    clearTimeout(timer);
    stage.classList.remove("app-play", "app-reset");
    void stage.offsetWidth; // restart every animation from the beginning
    stage.classList.add("app-again", "app-play");
    played = 0;
  };
  stage.addEventListener("animationend", (e) => {
    if (e.animationName === "stamp" && e.target.matches(".app-stamps .is-on:nth-child(8)")) {
      later(() => stage.classList.add("app-reset"), REST);
    } else if (e.animationName === "cover" && stage.classList.contains("app-reset")) {
      restart();
    }
  });
  // Backup (2026-11-01, Krishna: it must play forever): a round takes about 13 seconds; if one ever runs past 20
  // (an animation event missed, a tab woken from sleep), start the next round anyway.
  setInterval(() => {
    if (userPaused || hidden || !stage.classList.contains("app-play")) return;
    if (++played > 20) restart();
  }, 1000);

  // was until 2026-11-01 (Krishna: remove the Pause demo button):
  // const button = document.createElement("button");
  // button.type = "button";
  // button.className = "btn-link app-toggle";
  // button.textContent = "Pause demo";
  // button.addEventListener("click", () => {
  //   userPaused = !userPaused;
  //   button.textContent = userPaused ? "Play demo" : "Pause demo"; // the label says what a click does, so no aria-pressed
  //   setPaused();
  // });
  // stage.parentElement.append(button);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { hidden = !entry.isIntersecting; setPaused(); }).observe(stage);
  }
});

// ---------- Current year in the footer ----------
document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

// ---------- Live load time in the pain section (Home): proof, not a claim (2026-10-13) ----------
// Reads the browser's own timing for this page. Nothing is stored or sent anywhere.
// Shown only when the page loaded in under 2.5 seconds (our LCP target, RFA §11.1); otherwise the block stays hidden.
// was until 2026-10-14: under 3 seconds (2.7 s showed in a test, too slow to call "the standard we build to").
const speed = document.querySelector("[data-load-time]");
if (speed && window.performance && performance.getEntriesByType) {
  window.addEventListener("load", () => {
    setTimeout(() => { // loadEventEnd is only set once the load handlers have finished
      const nav = performance.getEntriesByType("navigation")[0];
      if (!nav || !nav.loadEventEnd) return;
      const seconds = nav.loadEventEnd / 1000;
      if (seconds >= 2.5) return; // was until 2026-10-14: 3
      speed.querySelector("[data-load-value]").textContent = seconds < 1 ? seconds.toFixed(2) : seconds.toFixed(1);
      speed.hidden = false;
    }, 0);
  });
}

// ---------- Prices in the visitor's currency (Services, 2026-10-21) ----------
// Krishna's prices are in AUD. care = the care plan for a website, 10% of its price per month (2026-10-21). The other currencies are rounded prices for the same packages:
// [CONFIRM] Krishna to approve each number before launch (rate card, BIZ-1.12). Market names never appear on the site.
// The currency is picked automatically from the device time zone (nothing is sent anywhere, nothing is stored).
// 2026-10-22 (Krishna: middle of the market, whole numbers): the middle of each market range Krishna gave, rounded to the nearest 1,000. Brand unchanged.
// 2026-10-22 (Krishna: 99 pricing, every price ends in 9s): each price one under the round number.
// 2026-10-22 (Krishna: packages US$1,000 lower, the same amount in each currency). Brand and care plan unchanged.
// The Premium upgrade has no price on the site (Krishna: Premium prices stay internal, see doc/rate-card-internal.md).
// 2026-10-22 (Krishna: standard prices from the global market table): USD set by Krishna, other currencies converted (about 1.5 AUD, 3.67 AED, 0.78 GBP), nearest 500, ending in 99.
// 2026-10-22 (Krishna: packages about 15% below the hourly value at US$75). USD set from doc/rate-card-internal.md; other currencies converted, nearest 500, ending in 99.
// 2026-10-31 (Krishna: website from US$3,499, web app from US$9,499): other currencies converted the same way (1.5 AUD, 3.67 AED, 0.78 GBP, nearest 500, ending in 99). [CONFIRM]
// webapp was AUD 19999, AED 49499, GBP 10499, USD 13499 until 2026-10-31
// 2026-10-31 (Krishna: mobile app from US$15,999), converted the same way; mobile was AUD 26999, AED 65999, GBP 13999, USD 17999 until 2026-10-31
// 2026-10-31 (Krishna: "do it", below local agencies, better quality): US$ base 3,499 · 11,999 · 17,999 converted as above;
// Australia's apps from a higher US$ base (16,499 · 23,499) because local prices there are about twice as high. Strategy in doc/rate-card-internal.md §1.
// Was the same day: AUD webapp 13999 mobile 23999 · AED 34999 58499 · GBP 7499 12499 · USD 9499 15999
// 2026-10-31 (Krishna: Brand up to 2k): Brand US$1,999, converted the same way; was AUD 1799, AED 4399, GBP 949, USD 1199
const PRICES = {
  AUD: { website: 4999, webapp: 24999, mobile: 34999, brand: 2999, care: 449 },   // website was 6499 until 2026-10-31; brand was 999 until 2026-10-22 (Krishna: Brand US$1,199 with the full brand kit); care was 299 until 2026-10-22 (Krishna: care plan from US$299 a month)
  AED: { website: 12999, webapp: 43999, mobile: 65999, brand: 7499, care: 1099 },   // website was 16499 until 2026-10-31; brand was 2499 until 2026-10-22 (Krishna: Brand US$1,199 with the full brand kit); care was 749 until 2026-10-22 (Krishna: care plan from US$299 a month)
  GBP: { website: 2499, webapp: 9499, mobile: 13999, brand: 1499, care: 249 },   // website was 3499 until 2026-10-31; brand was 549 until 2026-10-22 (Krishna: Brand US$1,199 with the full brand kit); care was 149 until 2026-10-22 (Krishna: care plan from US$299 a month)
  USD: { website: 3499, webapp: 11999, mobile: 17999, brand: 1999, care: 299 },   // website was 4499 until 2026-10-31; brand was 699 until 2026-10-22 (Krishna: Brand US$1,199 with the full brand kit); care was 199 until 2026-10-22 (Krishna: care plan from US$299 a month)
};
// was until 2026-10-22 (Krishna: packages about 15% below the hourly value at US$75):
// const PRICES = {
//   AUD: { website: 5999, webapp: 17999, mobile: 26999, brand: 999, care: 299 },
//   AED: { website: 14499, webapp: 43999, mobile: 65999, brand: 2499, care: 749 },
//   GBP: { website: 2999, webapp: 9499, mobile: 13999, brand: 549, care: 149 },
//   USD: { website: 3999, webapp: 11999, mobile: 17999, brand: 699, care: 199 },
// };
// was until 2026-10-22 (Krishna: standard prices from the global market table):
// const PRICES = {
//   AUD: { website: 8499, webapp: 17999, mobile: 26499, brand: 999, care: 299 },   // webapp was 22499 until 2026-10-22 (Krishna: web app from US$15,999)
//   AED: { website: 23999, webapp: 44999, mobile: 68999, brand: 2499, care: 749 },   // webapp was 55999 until 2026-10-22 (Krishna: web app from US$15,999)
//   GBP: { website: 4999, webapp: 11999, mobile: 16999, brand: 549, care: 149 },   // webapp was 13999 until 2026-10-22 (Krishna: web app from US$15,999)
//   USD: { website: 6999, webapp: 15999, mobile: 22999, brand: 699, care: 199 },   // webapp was 18999 until 2026-10-22 (Krishna: web app from US$15,999)
// };
// was until 2026-10-22 (Krishna: packages US$1,000 lower, the same amount in each currency):
// const PRICES = {
//   AUD: { website: 9999, webapp: 23999, mobile: 27999, brand: 999, care: 299 },
//   AED: { website: 27999, webapp: 59999, mobile: 72999, brand: 2499, care: 749 },
//   GBP: { website: 5999, webapp: 14999, mobile: 17999, brand: 549, care: 149 },
//   USD: { website: 7999, webapp: 19999, mobile: 23999, brand: 699, care: 199 },
// };
// was until 2026-10-22 (Krishna: 99 pricing, every price ends in 9s):
// const PRICES = {
//   AUD: { website: 10000, webapp: 24000, mobile: 28000, brand: 1000, care: 300 },   // care was 1000 until 2026-10-22 (Krishna: care plan from A$200 a month); 200 until 2026-10-22 (Krishna: the care plan is US$200 a month)
//   AED: { website: 28000, webapp: 60000, mobile: 73000, brand: 2500, care: 750 },   // care was 2800 until 2026-10-22 (Krishna: care plan from A$200 a month); 500 until 2026-10-22 (Krishna: the care plan is US$200 a month)
//   GBP: { website: 6000, webapp: 15000, mobile: 18000, brand: 550, care: 150 },   // care was 600 until 2026-10-22 (Krishna: care plan from A$200 a month); 100 until 2026-10-22 (Krishna: the care plan is US$200 a month)
//   USD: { website: 8000, webapp: 20000, mobile: 24000, brand: 700, care: 200 },   // care was 800 until 2026-10-22 (Krishna: care plan from A$200 a month); 130 until 2026-10-22 (Krishna: the care plan is US$200 a month)
// };
// was until 2026-10-22 (Krishna: middle of the market, whole numbers):
// const PRICES = {
//   AUD: { website: 5000, webapp: 10000, mobile: 15000, brand: 1000, care: 500 },
//   AED: { website: 12500, webapp: 25000, mobile: 37500, brand: 2500, care: 1250 },   // [CONFIRM]
//   GBP: { website: 2600, webapp: 5200, mobile: 7800, brand: 550, care: 260 },       // [CONFIRM]
//   USD: { website: 3300, webapp: 6600, mobile: 9900, brand: 700, care: 330 },       // [CONFIRM]
// };
const SYMBOL = { AUD: "A$", AED: "AED\u00a0", GBP: "£", USD: "US$" };

// The currency is set automatically from the device time zone; there is no picker (2026-10-21, Krishna).
if (document.querySelector("[data-price]")) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const code = zone.startsWith("Australia/") ? "AUD"
    : zone === "Asia/Dubai" ? "AED"
    : zone === "Europe/London" ? "GBP"
    : "USD";
  document.querySelectorAll("[data-price]").forEach((el) => {
    const value = PRICES[code][el.dataset.price];
    // was until 2026-11-02: if (value) el.textContent = SYMBOL[code] + value.toLocaleString("en");
    if (!value) return;
    // 2026-11-02 (Krishna: some space between US$ and the number): the big card prices get the symbol in its own span,
    // spaced in CSS (.price-symbol); prices inside sentences stay as plain text
    if (el.classList.contains("offer-amount")) {
      const symbol = document.createElement("span");
      symbol.className = "price-symbol";
      symbol.textContent = SYMBOL[code].trim();
      el.replaceChildren(symbol, value.toLocaleString("en"));
    } else {
      el.textContent = SYMBOL[code] + value.toLocaleString("en");
    }
  });
}

// was until 2026-10-21 (Krishna: no picker, detect it automatically): guess plus a "Prices in" picker, choice remembered in this browser
// const pick = document.querySelector(".currency-pick");
// if (pick) {
//   const select = pick.querySelector("select");
//   const guess = () => {
//     const zone = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
//     if (zone.startsWith("Australia/")) return "AUD";
//     if (zone === "Asia/Dubai") return "AED";
//     if (zone === "Europe/London") return "GBP";
//     return "USD";
//   };
//   let saved = null;
//   try { saved = localStorage.getItem("currency"); } catch (e) { /* storage blocked: guess instead */ }
//   const show = (code) => {
//     const list = PRICES[code] || PRICES.USD;
//     document.querySelectorAll("[data-price]").forEach((el) => {
//       const value = list[el.dataset.price];
//       if (value) el.textContent = SYMBOL[code] + value.toLocaleString("en");
//     });
//     select.value = code;
//   };
//   show(PRICES[saved] ? saved : guess());
//   select.addEventListener("change", () => {
//     show(select.value);
//     try { localStorage.setItem("currency", select.value); } catch (e) { /* not remembered, still shown */ }
//   });
//   pick.hidden = false;
// }

// A link to an FAQ answer (for example services.html#pay-instalments, 2026-11-02) opens that answer, so the reader
// lands on the text, not on a closed question.
const openLinkedAnswer = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id && document.getElementById(id);
  if (target && target.tagName === "DETAILS") target.open = true;
};
openLinkedAnswer();
window.addEventListener("hashchange", openLinkedAnswer);

// ---------- Home service cards come alive on phones (2026-11-04, Krishna: like the desktop hover) ----------
// Touch screens have no hover, so a card gets .is-live while it is in the middle of the screen (services.css).
const liveTags = document.querySelectorAll(".bookmarks .tag");
if (liveTags.length && "IntersectionObserver" in window && window.matchMedia("(hover: none)").matches) {
  const liveIo = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle("is-live", entry.isIntersecting);
  }, { rootMargin: "-30% 0px -30% 0px" });
  liveTags.forEach((tag) => liveIo.observe(tag));
}

// ---------- Work: selected projects open on tap on phones and touch screens (2026-11-05, Krishna: like the desktop view) ----------
// Desktop opens a project's details on hover (work.css). Where there is no hover, or the window is narrow, the details
// start closed and the project's name becomes a button: a tap slides them open (one at a time), a second tap closes.
const tapProjects = document.querySelectorAll(".projects .project");
if (tapProjects.length && window.matchMedia("(hover: none), (max-width: 40rem)").matches) {
  tapProjects.forEach((project, n) => {
    const head = project.querySelector(".project-head");
    const more = project.querySelector(".project-more");
    if (!head || !more) return;
    project.classList.add("is-tap");
    project.removeAttribute("tabindex");
    more.id = more.id || `project-more-${n + 1}`;
    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");
    head.setAttribute("aria-controls", more.id);
    head.setAttribute("aria-expanded", "false");
    const toggle = () => {
      const open = !project.classList.contains("is-open");
      tapProjects.forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector(".project-head")?.setAttribute("aria-expanded", "false");
      });
      if (open) { project.classList.add("is-open"); head.setAttribute("aria-expanded", "true"); }
    };
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });
}

// ---------- Contact form sent by Web3Forms without leaving the page (2026-11-07, Krishna: use Web3Forms for enquiries) ----------
// Without JavaScript the form still posts straight to Web3Forms, which shows its own thank you page.
document.querySelectorAll("form[data-web3forms]").forEach((form) => {
  const status = form.querySelector(".form-status");
  const button = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Tick groups where at least one box is needed (2026-11-07: What do you need?)
    const emptyGroup = [...form.querySelectorAll("[data-pick-one]")].find((g) => !g.querySelector("input:checked"));
    if (emptyGroup && status) {
      status.classList.add("is-error");
      status.textContent = emptyGroup.dataset.pickOne;
      emptyGroup.querySelector("input")?.focus();
      return;
    }
    if (!status) { form.submit(); return; }
    status.classList.remove("is-error");
    status.textContent = form.dataset.sending || "Sending your message…";   // 2026-11-09: each form can set its own lines
    if (button) button.disabled = true;
    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Send failed");
      form.reset();
      status.textContent = form.dataset.success || "Thank you. Your message is with us, and Krishna will reply within one business day.";
    } catch (err) {
      status.classList.add("is-error");
      status.textContent = "Sorry, that didn't send. Please try again, or email hello@aaurigotech.com.";
    } finally {
      if (button) button.disabled = false;
    }
  });
});

// ---------- Book a call: send each visitor to the booking page for their region (2026-11-07, RFA §5.3) ----------
// Every Book a call link is href="/book" data-book. /book is a redirect in _redirects (the fallback without JavaScript).
// Here we pick the page from the browser's time zone: nothing is sent or stored. Phase 1 has two pages, Sydney and
// Dubai hours; a visitor anywhere else gets the one whose business day is closest to theirs. Empty = keep /book.
const BOOKING = {
  au: "https://calendar.app.google/f6fuwhwytJMuiQ7f9",   // Google booking page (hello@), Discovery call, Sydney time (2026-11-08). Was "/contact" until the page existed
  ae: "https://aaurigotech.zohobookings.in/489336000000031010/#/489336000000031010",   // Zoho Bookings, Discovery call, Dubai 09:00 to 18:00 (2026-11-08)
};
(() => {
  const links = document.querySelectorAll("a[data-book]");
  if (!links.length) return;
  let zone = "";
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* old browser: keep /book */ }
  let region;
  if (zone.startsWith("Australia/")) region = "au";
  else if (/^Asia\/(Dubai|Muscat|Qatar|Bahrain|Kuwait|Riyadh)$/.test(zone)) region = "ae";
  else {
    // Nearest business day by UTC offset, going round the clock (Los Angeles is closer to Sydney than to Dubai).
    const offset = -new Date().getTimezoneOffset() / 60;
    const gap = (a, b) => { const d = Math.abs(a - b) % 24; return Math.min(d, 24 - d); };
    region = gap(offset, 10.5) < gap(offset, 4) ? "au" : "ae";
  }
  const url = BOOKING[region];
  if (url) links.forEach((a) => { a.href = url; });
})();

/* How we work video on Home (2026-11-09, Krishna: sound on demand only, optimised and fast to load; WEB-8.15).
   Nothing downloads with the page. When the video nears the screen we choose the file (1080p only for large, sharp
   screens on a good connection, 720p otherwise); once half of it is in view it plays muted. Sound starts only when the
   visitor asks for it. It pauses when scrolled away and resumes when back, unless the visitor paused it or it ended
   (it never loops). With reduced motion or data saver it never starts by itself: the poster waits for a tap. */
(function () {
  const v = document.querySelector(".how-video-player");
  if (!v) return;
  const btn = document.querySelector(".how-video-sound");
  const txt = btn && btn.querySelector(".how-video-sound-text");
  const conn = navigator.connection || {};
  const slow = /(^|-)(2g|3g)$/.test(conn.effectiveType || "");
  const saveData = !!conn.saveData;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const auto = !reduce && !saveData;
  // 1080p only when the frame itself is drawn wider than about 1100 real pixels (was the window width until 2026-11-09)
  const hdNow = () => !saveData && !slow && v.getBoundingClientRect().width * Math.min(devicePixelRatio || 1, 2) > 1100;
  // 2026-11-09 (Krishna: responsive on every screen, optimised): phones get the portrait 9:16 cut (same test as the CSS),
  // and browsers that can play AV1 get a file about 25% smaller. Names: how-we-work-v5-{portrait|720|1080}[-av1].mp4 (v5 since 2026-11-11, was v4)
  const portrait = matchMedia("(max-width: 40rem)").matches;
  const av1 = /probably|maybe/.test(v.canPlayType('video/mp4; codecs="av01.0.08M.08, mp4a.40.2"'));
  if (portrait && v.dataset.posterPortrait) v.poster = v.dataset.posterPortrait;
  let chosen = false, userStopped = false, autoPause = false;

  const choose = () => {
    if (chosen) return;
    chosen = true;
    v.src = v.dataset.src + (portrait ? "portrait" : hdNow() ? "1080" : "720") + (av1 ? "-av1" : "") + ".mp4";   // replaces the 720p <source> kept for visitors without JavaScript
  };
  const sync = () => {
    if (!btn) return;
    const on = !v.muted && v.volume > 0;
    btn.dataset.sound = on ? "on" : "off";
    txt.textContent = on ? "Turn sound off" : "Turn sound on";
  };

  v.muted = true;
  if (btn) {
    btn.hidden = false;
    btn.addEventListener("click", () => {
      choose();
      v.muted = !v.muted;
      if (!v.muted && v.volume === 0) v.volume = 1;
      if (!v.muted && v.paused) { userStopped = false; v.play().catch(() => {}); }
      sync();
    });
  }
  v.addEventListener("volumechange", sync);
  v.addEventListener("play", () => { userStopped = false; });
  v.addEventListener("pause", () => { if (!autoPause) userStopped = true; autoPause = false; });   // also true when it ends
  sync();

  if (!("IntersectionObserver" in window)) { choose(); return; }
  // pick the file a little before it arrives (setting src with preload none fetches nothing yet)
  new IntersectionObserver((entries, o) => {
    if (entries.some((e) => e.isIntersecting)) { choose(); o.disconnect(); }
  }, { rootMargin: "300px 0px" }).observe(v);
  // play when half of it is really on screen, pause when it leaves
  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.intersectionRatio >= .5) {
        if (auto && !userStopped && v.paused && !v.ended) { choose(); v.preload = "auto"; v.play().catch(() => {}); }
      } else if (!v.paused) {
        autoPause = true; v.pause();
      }
    });
  }, { threshold: [0, .5] }).observe(v);
})();

// ---------- Newsletter sign ups to Zoho Campaigns (2026-11-09, Krishna: newsletter on Zoho Campaigns) ----------
// Zoho answers without a CORS header, so the page cannot read the reply: we send it and tell the visitor the next step
// (single opt in: Zoho adds them straight away, double opt in is off, Krishna 2026-11-09). Without JavaScript the form posts to Zoho, which redirects
// back to /?subscribed=1#free-guide.
document.querySelectorAll("form[data-zoho-signup]").forEach((form) => {
  const status = form.querySelector(".form-status");
  const button = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!status) { form.submit(); return; }
    status.classList.remove("is-error");
    status.textContent = "Adding you to the list…";
    if (button) button.disabled = true;
    try {
      // was until 2026-11-09: await fetch(form.action, { method: "POST", mode: "no-cors", body: new URLSearchParams(new FormData(form)) });
      const data = new FormData(form);
      const res = await fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: data });
      if (res.status === 400) throw new Error("bad email");
      if (!res.ok) await signupFallback(data);   // Zoho keys not set or Zoho down: the sign up comes to hello@ instead
      form.reset();
      status.textContent = "";   // 2026-11-09: the pop up says it now (was the same words on one line)
      showThanks(form);
    } catch (err) {
      status.classList.add("is-error");
      status.textContent = err.message === "bad email"
        ? "Please check your email address and try again."
        : "Sorry, that didn't go through. Please try again, or email hello@aaurigotech.com.";
    } finally {
      if (button) button.disabled = false;
    }
  });
});
// Safety net (2026-11-09): if our function cannot reach Zoho, the sign up is emailed to hello@ by Web3Forms (same key as Contact).
async function signupFallback(data) {
  const body = new FormData();
  body.append("access_key", "a77c5cd0-b9ae-411d-a322-4763d78538ba");
  body.append("subject", "Newsletter sign up to add to Zoho (website fallback)");
  body.append("from_name", "Aaurigo Tech website");
  body.append("email", data.get("email"));
  body.append("page", data.get("page") || "");
  const res = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { Accept: "application/json" }, body });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.success) throw new Error("fallback failed");
}
if (new URLSearchParams(location.search).get("subscribed") === "1") {
  showThanks(null);
}

// Thank you pop up (2026-11-09, Krishna: a pop up on the screen, not one line; single opt in, so no "check your inbox"). A native dialog: focus moves into it,
// Escape and the button close it, and focus goes back to the form.
function showThanks(form) {
  let pop = document.querySelector(".thanks-pop");
  if (!pop) {
    pop = document.createElement("dialog");
    pop.className = "thanks-pop";
    pop.setAttribute("aria-labelledby", "thanks-pop-title");
    pop.innerHTML = `<div class="thanks-pop-body">
      <span class="thanks-pop-mark" aria-hidden="true">✓</span>
      <h2 class="thanks-pop-title" id="thanks-pop-title">You are on the list. <em>Welcome aboard.</em></h2>
      <p class="thanks-pop-text">Every issue now comes straight to your inbox: one email a month on how tech can grow your business. Leave any time with one click.</p>
      <p class="thanks-pop-line">Launch fast. Learn faster. Grow smarter.</p>
      <button class="btn btn-primary" type="button" data-close>Got it</button>
    </div>`;
    document.body.appendChild(pop);
    pop.querySelector("[data-close]").addEventListener("click", () => pop.close());
    pop.addEventListener("click", (e) => { if (e.target === pop) pop.close(); });   // a tap on the dark wash closes it
  }
  pop.addEventListener("close", () => form?.querySelector("input[type=email]")?.focus(), { once: true });
  if (typeof pop.showModal === "function") pop.showModal();
  else { const s = form?.querySelector(".form-status"); if (s) s.textContent = "Thank you. You are on the list."; }
}
