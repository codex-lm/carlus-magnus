'use strict';
{
  const root = typeof window !== 'undefined' ? window : globalThis;
  const CM = root.CM = root.CM || {};
  const LANGUAGE_KEY = 'carlus-magnus:language:v1';
  const dictionary = new Map(), folded = new Map(), patterns = [], listeners = new Set();
  let locale = 'fr';
  try {
    const saved = root.localStorage?.getItem(LANGUAGE_KEY);
    if (saved === 'en' || saved === 'fr') locale = saved;
  } catch {}
  try {
    const requested = new URLSearchParams(root.location?.search || '').get('lang');
    if (requested === 'en' || requested === 'fr') {
      locale = requested;
      try { root.localStorage?.setItem(LANGUAGE_KEY, locale); } catch {}
    }
  } catch {}
  const I18N = CM.I18N = {
    get locale() { return locale; },
    choose(fr, en) { return locale === 'en' ? en : fr; },
    add(entries) {
      for (const [fr, en] of Object.entries(entries)) {
        dictionary.set(fr, en);
        folded.set(fr.toLocaleLowerCase('fr'), en);
      }
    },
    addPattern(expression, translate) { patterns.push([expression, translate]); },
    t(value) {
      const source = String(value ?? '');
      if (locale !== 'en' || !source) return source;
      if (dictionary.has(source)) return dictionary.get(source);
      const trimmed = source.trim();
      let translated;
      if (dictionary.has(trimmed)) translated = dictionary.get(trimmed);
      else {
        const base = folded.get(trimmed.toLocaleLowerCase('fr'));
        if (base !== undefined) {
          translated = trimmed === trimmed.toLocaleUpperCase('fr') ? base.toLocaleUpperCase('en')
            : trimmed === trimmed.toLocaleLowerCase('fr') ? base.toLocaleLowerCase('en') : base;
        }
      }
      if (translated !== undefined) return source.replace(trimmed, () => translated);
      for (const [expression, translate] of patterns) {
        expression.lastIndex = 0;
        const match = expression.exec(source);
        if (match) return translate(...match.slice(1));
      }
      return source;
    },
    setLocale(next) {
      if (next !== 'en' && next !== 'fr') return false;
      try { root.localStorage?.setItem(LANGUAGE_KEY, next); } catch {}
      try {
        const url = new URL(root.location.href);
        if (url.searchParams.has('lang')) {
          url.searchParams.set('lang', next);
          root.history?.replaceState(null, '', url.href);
        }
      } catch {}
      if (next === locale) return true;
      locale = next;
      for (const listener of listeners) listener(locale);
      return true;
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = I18N;
}
