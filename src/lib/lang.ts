export type Lang = 'EN' | 'ES';

export function getLang(): Lang {
  return localStorage.getItem('biocycle_lang') === 'es' ? 'ES' : 'EN';
}

export function setLang(lang: Lang): void {
  localStorage.setItem('biocycle_lang', lang.toLowerCase());
}
