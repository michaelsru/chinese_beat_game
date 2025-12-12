export class TranslationManager {
    constructor() {
        this.apiUrl = 'https://api.mymemory.translated.net/get';
        this.sourceLang = 'zh';
        this.targetLang = 'en';
    }

    async translate(text) {
        if (!text || text.trim() === '') return '';

        try {
            // Use Google Translate undocumented API (better accuracy for CN->EN)
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${this.sourceLang}&tl=${this.targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            const data = await response.json();

            // Google returns an array of arrays. data[0] contains the translation segments.
            // data[0][0][0] is the first segment translation.
            // We join all segments to get the full sentence.
            if (data && data[0]) {
                return data[0].map(segment => segment[0]).join('');
            }
            return 'Translation Error';
        } catch (error) {
            console.error('Google Translation error:', error);
            // Fallback to MyMemory if Google fails
            return this.translateFallback(text);
        }
    }

    async translateFallback(text) {
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${this.sourceLang}|${this.targetLang}`);
            const data = await response.json();
            if (data && data.responseData) {
                return data.responseData.translatedText;
            }
        } catch (e) {
            console.error('Fallback error:', e);
        }
        return 'Error';
    }

    setLanguagePair(source, target) {
        this.sourceLang = source;
        this.targetLang = target;
    }
}
