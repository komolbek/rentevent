/**
 * Manual dark/light mode. The visitor's choice is `system | light | dark`,
 * kept in localStorage; the effective theme is what ends up as the `.dark`
 * class on <html>. `themeInitScript()` is inlined in <head> and applies the
 * choice before first paint; the helpers below are used by the header toggle.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export const THEME_KEY = 'theme';
export const THEME_CHANGE_EVENT = 're-theme-change';
export const THEME_CHOICES: ThemeChoice[] = ['system', 'light', 'dark'];

/** Browser UI colour (`<meta name="theme-color">`) per effective theme. */
export const THEME_COLORS: Record<EffectiveTheme, string> = {
  light: '#F2562B',
  dark: '#0e0e11',
};

/** Anything that is not a known value (null, old data, tampering) means `system`. */
export function parseTheme(raw: unknown): ThemeChoice {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

export function resolveTheme(choice: ThemeChoice, systemDark: boolean): EffectiveTheme {
  if (choice === 'light') return 'light';
  if (choice === 'dark') return 'dark';
  return systemDark ? 'dark' : 'light';
}

export function readStoredTheme(): ThemeChoice {
  try {
    return parseTheme(window.localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Puts the effective theme on <html> and the theme-color meta. */
export function applyTheme(choice: ThemeChoice): EffectiveTheme {
  const effective = resolveTheme(choice, systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  root.style.colorScheme = effective;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', THEME_COLORS[effective]));
  return effective;
}

/** Saves and applies a choice, and tells other components in this tab. */
export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // storage blocked: the choice still applies until reload
  }
  applyTheme(choice);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/**
 * Source of the inline <head> script. Self-contained (it runs before any
 * bundle) and mirrors resolveTheme/applyTheme above. Besides the first-paint
 * apply it keeps `system` live (OS change) and follows other tabs (`storage`).
 */
export function themeInitScript(): string {
  return `(function(){
var K=${JSON.stringify(THEME_KEY)},C=${JSON.stringify(THEME_COLORS)};
var mq=null;try{mq=window.matchMedia('(prefers-color-scheme: dark)');}catch(e){}
function get(){try{var v=localStorage.getItem(K);return v==='light'||v==='dark'?v:'system';}catch(e){return 'system';}}
function apply(){
var c=get(),d=c==='dark'||(c==='system'&&!!mq&&mq.matches),r=document.documentElement;
r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';
var m=document.querySelectorAll('meta[name="theme-color"]');
for(var i=0;i<m.length;i++)m[i].setAttribute('content',d?C.dark:C.light);
}
apply();
if(mq){var f=function(){if(get()==='system')apply();};
if(mq.addEventListener)mq.addEventListener('change',f);else if(mq.addListener)mq.addListener(f);}
window.addEventListener('storage',function(e){if(e.key===null||e.key===K){apply();window.dispatchEvent(new Event(${JSON.stringify(THEME_CHANGE_EVENT)}));}});
document.addEventListener('DOMContentLoaded',apply);
})();`;
}
