import { onLanguageChange } from "./i18n.js";
import { onThemeChange } from "./theme.js";

// pages re-render on language or theme change, since charts read strings and colors at render time
export function onSettingsChange(listener) {
    const offLanguage = onLanguageChange(listener);
    const offTheme = onThemeChange(listener);
    return () => { offLanguage(); offTheme(); };
}
