export class TranslationManager {
    constructor() {
        this.apiUrl = 'https://api.mymemory.translated.net/get';
        this.sourceLang = 'zh';
        this.targetLang = 'en';
    }

    async translate(text) {
        if (!text || text.trim() === '') return '';

        try {
            const response = await fetch(`${this.apiUrl}?q=${encodeURIComponent(text)}&langpair=${this.sourceLang}|${this.targetLang}`);
            const data = await response.json();

            if (data && data.responseData) {
                return data.responseData.translatedText;
            }
            return 'Translation Error';
        } catch (error) {
            console.error('Translation error:', error);
            return 'Error';
        }
    }

    setLanguagePair(source, target) {
        this.sourceLang = source;
        this.targetLang = target;
    }
}
