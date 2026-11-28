const STORAGE_KEY = "grades-ua-theme";
const listeners = new Set();

export const getTheme = () => document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export function setTheme(theme) {
    if (theme === getTheme()) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    listeners.forEach(listener => listener(theme));
}

export function onThemeChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
