// js/utils.js

export const showPopup = (msg) => {
    // Intercept Firebase Quota Error
    if (typeof msg === 'string' && (msg.includes('resource-exhausted') || msg.includes('quota-exceeded') || msg.includes('Quota exceeded'))) {
        const isAdmin = localStorage.getItem('adminSession') === 'active';
        msg = isAdmin ? "data limit khatam ho gaya hai wait kro 12:30AM ka" : "data limite expire pliz wait";
    }

    let toast = document.getElementById('toast-notification');
    if (!toast) {
        initPopup();
        toast = document.getElementById('toast-notification');
    }
    const text = document.getElementById('toast-text');
    const logoImg = document.getElementById('toast-logo');
    const iconContainer = document.getElementById('toast-icon');

    if (toast && text) {
        text.innerText = msg;
        if (logoImg) logoImg.style.display = 'none'; // Default no logo
        if (iconContainer) iconContainer.style.display = 'none'; // Default no icon
        toast.className = 'toast-notification show';

        const isQuotaError = typeof msg === 'string' && (msg.includes('data limit') || msg.includes('data limite'));
        if (toast.timeoutId) clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => {
            toast.className = toast.className.replace("show", "");
        }, isQuotaError ? 10000 : 3000);
    }
};

export const showLogoPopup = (msg, logoUrl) => {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        initPopup();
        toast = document.getElementById('toast-notification');
    }
    const text = document.getElementById('toast-text');
    const logoImg = document.getElementById('toast-logo');
    const iconContainer = document.getElementById('toast-icon');

    if (toast && text && logoImg) {
        text.innerText = msg;
        logoImg.src = logoUrl;
        logoImg.style.display = 'block';
        if (iconContainer) iconContainer.style.display = 'none';
        toast.className = 'toast-notification show';

        if (toast.timeoutId) clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => {
            toast.className = toast.className.replace("show", "");
        }, 4000);
    }
};

export const closePopup = () => {
    let toast = document.getElementById('toast-notification');
    if (toast) {
        toast.className = toast.className.replace("show", "");
    }
};

export const showError = (msg) => {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        initPopup();
        toast = document.getElementById('toast-notification');
    }
    const text = document.getElementById('toast-text');
    const logoImg = document.getElementById('toast-logo');
    const iconContainer = document.getElementById('toast-icon');

    if (toast && text && logoImg && iconContainer) {
        text.innerText = msg;
        logoImg.style.display = 'none';
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 60px;"></i>';
        iconContainer.style.display = 'block';
        toast.className = 'toast-notification show error';

        if (toast.timeoutId) clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => {
            toast.className = toast.className.replace("show", "");
        }, 4000);
    }
};

export const showToast = showPopup;

export const copyToClipboard = (text, successMsg = "Copied") => {
    navigator.clipboard.writeText(text).then(() => {
        showPopup(successMsg);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

export const initPopup = () => {
    if (!document.getElementById('toast-notification')) {
        const styleHtml = `
            <style>
                .toast-notification {
                    visibility: hidden;
                    min-width: 280px;
                    background-color: white;
                    color: #333;
                    text-align: center;
                    border-radius: 20px;
                    padding: 24px;
                    position: fixed;
                    z-index: 10000;
                    left: 50%;
                    top: 50%;
                    font-size: 15px;
                    font-family: 'Poppins', sans-serif;
                    transform: translate(-50%, -50%);
                    opacity: 0;
                    transition: opacity 0.3s, visibility 0.3s;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }
                .toast-notification.show {
                    visibility: visible;
                    opacity: 1;
                }
                .toast-logo {
                    width: 70px;
                    height: 70px;
                    object-fit: contain;
                }
                #toast-text {
                    font-weight: 600;
                    line-height: 1.4;
                    color: #1f2937;
                }
            </style>
        `;
        const popupHtml = `
            <div id="toast-notification" class="toast-notification">
                <div id="toast-icon" style="display:none;"></div>
                <img id="toast-logo" class="toast-logo" style="display:none;">
                <span id="toast-text"></span>
            </div>
        `;
        document.head.insertAdjacentHTML('beforeend', styleHtml);
        document.body.insertAdjacentHTML('beforeend', popupHtml);
    }
};

// FEATURE 3: Local Cache for Reads
export const getWithCache = async (key, firebaseCall, ttl = 60000) => {
    const cached = localStorage.getItem(key);
    const cacheTime = localStorage.getItem(`${key}_time`);

    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < ttl) {
        return JSON.parse(cached);
    }

    try {
        const data = await firebaseCall();
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(`${key}_time`, Date.now().toString());
        return data;
    } catch (error) {
        console.error("Cache fetch error:", error);
        if (cached) return JSON.parse(cached);
        throw error;
    }
};

// FEATURE 1 & 4 Helper: Track Usage (Client-side estimation)
// This is used to estimate usage since Firebase Client SDK doesn't expose quotas
export const trackUsage = async (db, type, count = 1) => {
    const today = new Date().toISOString().split("T")[0];
    const statsRef = doc(db, "system", "usage_stats", today, "data");

    // We use a non-blocking update to avoid slows
    // In a real app, this would be a Cloud Function to avoid extra client billing
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js").then(({ increment, setDoc }) => {
        setDoc(statsRef, {
            [type]: increment(count),
            lastUpdated: Date.now()
        }, { merge: true }).catch(() => { }); // Silently fail if quota already hit
    });
};
