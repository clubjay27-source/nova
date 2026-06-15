// js/lang.js

export const translations = {
    en: {
        home: "Home",
        purchase: "Purchase",
        team: "Team",
        profile: "Profile",
        total_commission: "Total Commission(Diamond)",
        today_purchase: "Today Purchase",
        today_sell: "Today Sell",
        purchase_rupee: "Purchase with Rupee",
        purchase_usdt: "Purchase with USDT",
        tutorial: "Tutorial",
        view_all: "Go Now",
        learn_more: "Learn more",
        diamond_balance: "Diamond Balance",
        today_earnings: "Today's earnings",
        withdrawal_in_transaction: "Withdrawal(In transaction)",
        today_withdraw: "Today withdraw",
        in_withdraw_upi_tool: "In withdraw UPI tool",
        pending_buys: "Pending Buys",
        bills: "Bills",
        buy: "Buy history",
        sell: "Sell history",
        service: "Service",
        other_functions: "Other functions",
        bonus: "Bonus",
        inbox: "Inbox",
        password: "Password",
        pin: "Pin",
        language: "Language",
        settings: "Settings",
        logout: "Log out",
        select_language: "Select Language",
        close: "Close",
        admin: "ad"
    },
    hi: {
        home: "होम",
        purchase: "खरीदें",
        team: "टीम",
        profile: "प्रोफाइल",
        total_commission: "कुल कमीशन (हीरा)",
        today_purchase: "आज की खरीद",
        today_sell: "आज की बिक्री",
        purchase_rupee: "रुपये से खरीदें",
        purchase_usdt: "USDT से खरीदें",
        tutorial: "ट्यूटोरियल",
        view_all: "अभी देखें",
        learn_more: "अधिक जानें",
        diamond_balance: "डायमंड बैलेंस",
        today_earnings: "आज की कमाई",
        withdrawal_in_transaction: "निकासी (प्रक्रिया में)",
        today_withdraw: "आज की निकासी",
        in_withdraw_upi_tool: "UPI टूल में निकासी",
        pending_buys: "लंबित खरीदारी",
        bills: "बिल्स",
        buy: "खरीद इतिहास",
        sell: "बिक्री इतिहास",
        service: "सेवा",
        other_functions: "अन्य कार्य",
        bonus: "बोनस",
        inbox: "इनबॉक्स",
        password: "पासवर्ड",
        pin: "पिन",
        language: "भाषा",
        settings: "सेटिंग्स",
        logout: "लॉग आउट",
        select_language: "भाषा चुनें",
        close: "बंद करें",
        admin: "ad"
    }
};

export function setLanguage(lang) {
    localStorage.setItem('app_lang', lang);
    document.querySelectorAll("[data-key]").forEach(el => {
        const key = el.getAttribute("data-key");
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
}

// Auto-apply on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const lang = localStorage.getItem('app_lang') || 'en';
        setLanguage(lang);
    });
    // Immediately apply if already loaded
    const lang = localStorage.getItem('app_lang') || 'en';
    setTimeout(() => setLanguage(lang), 100);
}
