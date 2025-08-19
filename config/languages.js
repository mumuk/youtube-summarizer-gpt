// config/languages.js
// ISO 639-1 codes + удобные алиасы для summarizer

export const LANGUAGES = {
    en: { name: "English" },
    ru: { name: "Russian" },
    uk: { name: "Ukrainian" },
    es: { name: "Spanish" },
    fr: { name: "French" },
    de: { name: "German" },
    it: { name: "Italian" },
    pt: { name: "Portuguese" },
    zh: { name: "Chinese" },
    ja: { name: "Japanese" },
    ko: { name: "Korean" }
    // при необходимости добавляем дальше
};

// Функция для валидации
export function isSupportedLang(code) {
    return Object.prototype.hasOwnProperty.call(LANGUAGES, code);
}
