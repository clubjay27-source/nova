// js/ticker.js
import { db } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function initTicker() {
    // index.html has its own built-in marquee in the green header, skip duplicate
    const page = window.location.pathname.split('/').pop() || 'index.html';
    if (page === 'index.html' || page === '') return;

    const container = document.querySelector('.app-container') || document.body;

    const tickerDiv = document.createElement('div');
    tickerDiv.className = 'warning-ticker';
    tickerDiv.style.display = 'none';
    tickerDiv.innerHTML = `
        <div class="ticker-content" style="display: flex; gap: 20px; align-items: center;">
            <i class="fa-solid fa-volume-high ticker-icon" style="color: #EF4444;"></i>
            <span class="welcome-marquee">Welcome to 999 pay! &nbsp;&nbsp;&nbsp; Saare transactions safe and secure hain. &nbsp;&nbsp;&nbsp;</span>
            <span class="ticker-text" id="globalTickerText" style="display: none;"></span>
        </div>
    `;

    // Avoid double injection
    if (document.querySelector('.warning-ticker')) return;

    // Inject into fixed section if exists, else body
    const fixedSection = document.querySelector('.fixed-top-section');
    if (fixedSection) {
        fixedSection.prepend(tickerDiv);
    } else {
        document.body.prepend(tickerDiv);
    }

    const tickerTextEl = document.getElementById('globalTickerText');

    onSnapshot(doc(db, "settings", "app_settings"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const page = window.location.pathname.split('/').pop() || 'index.html';
            let msg = "";

            if (page === 'index.html' || page === '') msg = data.globalTicker;
            else if (page === 'purchase.html') msg = data.purchaseTicker;
            else if (page === 'profile.html') msg = data.profileTicker;
            else if (page === 'tool.html') msg = data.toolTicker;
            else if (page === 'payment.html') msg = data.paymentTicker;
            else msg = data.globalTicker; // Fallback

            if (!msg || msg.trim() === "") {
                tickerDiv.style.display = 'none';
            } else {
                tickerDiv.style.display = 'flex';
                tickerTextEl.textContent = msg;
            }
        }
    });
}

// Support both DOMContentLoaded and immediate call if script is deferred
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTicker);
} else {
    initTicker();
}
