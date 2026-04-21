export function getTablerCssVar(name: string, fallback: string): string {
  const css = getComputedStyle(document.documentElement);
  const val = css.getPropertyValue(name).trim();
  return val || fallback;
}

export function getDefaultTablerPalette(): string[] {
  return [
    getTablerCssVar('--tblr-purple', '#6f42c1'),
    getTablerCssVar('--tblr-green', '#2fb344'),
    getTablerCssVar('--tblr-yellow', '#f59f00'),
    getTablerCssVar('--tblr-red', '#d63939'),
    getTablerCssVar('--tblr-primary', '#206bc4'),
  ];
}