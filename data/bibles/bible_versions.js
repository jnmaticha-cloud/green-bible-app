// Bible Versions Configuration
// This file defines all available Bible translations in the app

export const BIBLE_VERSIONS = {
    // English Versions
    ESV: {
        id: 'ESV',
        name: 'English Standard Version',
        language: 'English',
        code: 'eng',
        direction: 'ltr',
        available: true,
        file: 'esv_bible.json'
    },
    NIV: {
        id: 'NIV',
        name: 'New International Version',
        language: 'English',
        code: 'eng',
        direction: 'ltr',
        available: true,
        file: 'niv_bible.json'
    },
    KJV: {
        id: 'KJV',
        name: 'King James Version',
        language: 'English',
        code: 'eng',
        direction: 'ltr',
        available: true,
        file: 'kjv_bible.json'
    },
    NLT: {
        id: 'NLT',
        name: 'New Living Translation',
        language: 'English',
        code: 'eng',
        direction: 'ltr',
        available: true,
        file: 'nlt_bible.json'
    },
    NRSV: {
        id: 'NRSV',
        name: 'New Revised Standard Version',
        language: 'English',
        code: 'eng',
        direction: 'ltr',
        available: true,
        file: 'nrsv_bible.json'
    },
    NASB: {
        id: 'NASB',
        name: 'New American Standard Bible',
        language: 'English',
        code: 'eng',
        direction: 'ltr',
        available: true,
        file: 'nasb_bible.json'
    },
    AMP: {
        id: 'AMP',
        name: 'Amplified Bible',
        language: 'English',
        code: 'eng',
        direction: 'ltr',
        available: true,
        file: 'amp_bible.json'
    },
    
    // African Versions
    AFRIKAANS: {
        id: 'AFRIKAANS',
        name: 'Afrikaans Bible',
        language: 'Afrikaans',
        code: 'afr',
        direction: 'ltr',
        available: true,
        file: 'afrikaans_bible.json'
    },
    AMHARIC: {
        id: 'AMHARIC',
        name: 'Amharic Bible',
        language: 'Amharic',
        code: 'amh',
        direction: 'ltr',
        available: true,
        file: 'amharic_bible.json'
    },
    
    // Kenyan Local Languages
    SWAHILI: {
        id: 'SWAHILI',
        name: 'Biblia Takatifu (Swahili)',
        language: 'Swahili',
        code: 'swa',
        direction: 'ltr',
        available: true,
        file: 'swahili_bible.json'
    },
    EKEGUSII: {
        id: 'EKEGUSII',
        name: 'Ekegusii Bible',
        language: 'Ekegusii',
        code: 'guz',
        direction: 'ltr',
        available: true,
        file: 'ekegusii_bible.json'
    },
    KALENJIN: {
        id: 'KALENJIN',
        name: 'Kalenjin Bible',
        language: 'Kalenjin',
        code: 'kln',
        direction: 'ltr',
        available: true,
        file: 'kalenjin_bible.json'
    },
    KIKUYU: {
        id: 'KIKUYU',
        name: 'Kikuyu Bible',
        language: 'Kikuyu',
        code: 'kik',
        direction: 'ltr',
        available: true,
        file: 'kikuyu_bible.json'
    },
    KIMIIRU: {
        id: 'KIMIIRU',
        name: 'Kimiiru Bible',
        language: 'Kimiiru',
        code: 'mer',
        direction: 'ltr',
        available: true,
        file: 'kimiiru_bible.json'
    },
    LUHYA: {
        id: 'LUHYA',
        name: 'Luhya Bible',
        language: 'Luhya',
        code: 'luy',
        direction: 'ltr',
        available: true,
        file: 'luhya_bible.json'
    },
    LUO: {
        id: 'LUO',
        name: 'Dholuo Bible',
        language: 'Dholuo',
        code: 'luo',
        direction: 'ltr',
        available: true,
        file: 'luo_bible.json'
    },
    MAASAI: {
        id: 'MAASAI',
        name: 'Maasai Bible',
        language: 'Maasai',
        code: 'mas',
        direction: 'ltr',
        available: true,
        file: 'maasai_bible.json'
    }
};

// Helper functions
export function getAvailableVersions() {
    return Object.values(BIBLE_VERSIONS).filter(v => v.available);
}

export function getVersionById(id) {
    return BIBLE_VERSIONS[id.toUpperCase()];
}

export function getVersionsByLanguage(language) {
    return Object.values(BIBLE_VERSIONS).filter(v => 
        v.language.toLowerCase() === language.toLowerCase()
    );
}

export function getAllLanguages() {
    const languages = new Set();
    Object.values(BIBLE_VERSIONS).forEach(v => languages.add(v.language));
    return Array.from(languages);
}

export default BIBLE_VERSIONS;
