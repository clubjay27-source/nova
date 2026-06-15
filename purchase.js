// js/purchase.js
import { auth, db } from "./firebase.js";
import {
    collection,
    query,
    where,
    onSnapshot,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { initPopup, showPopup } from "./utils.js";

initPopup();

// DOM Elements
const inrTab = document.getElementById('inrTab');
const usdtTab = document.getElementById('usdtTab');
const inrContent = document.getElementById('inrContent');
const usdtContent = document.getElementById('usdtContent');
const ordersList = document.getElementById('ordersList');
const loader = document.getElementById('loader');

// UPI Popup Elements
const upiPopupOverlay = document.getElementById('upiPopupOverlay');
const upiSelectionList = document.getElementById('upiSelectionList');
const cancelUpiBtn = document.getElementById('cancelUpiBtn');
const confirmUpiBtn = document.getElementById('confirmUpiBtn');

// USDT Tab Elements
const usdtAmountInput = document.getElementById('usdtAmount');
const depositAmountInput = document.getElementById('depositAmount');
const usdtNext = document.getElementById('usdtNext');

let usdtRate = 101.00;
let selectedOrder = null;
let currentUpiBound = null;
let rewardPercentConfig = 5.9; // Default 
let appSettings = {};
let autoRefreshTimer = null;
let currentRange = 'small'; // Default pill

let userOrderMin = null;
let userOrderMax = null;
let userRewardPercent = null;

// Load App Settings
async function loadAppSettings() {
    onSnapshot(doc(db, "settings", "app_settings"), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            appSettings = data;
            usdtRate = data.usdtPrice || 101.00;
            rewardPercentConfig = data.rewardPercent || 3.0;
            loadOrders();
        }
    });
}

// Auth Guard
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "login.html"; return; }

    // Listen to user configuration
    onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            userOrderMin = data.orderMin !== undefined ? data.orderMin : null;
            userOrderMax = data.orderMax !== undefined ? data.orderMax : null;
            userRewardPercent = data.rewardPercent !== undefined ? data.rewardPercent : null;
            loadOrders(); // Refresh orders based on new limits
        }
    });

    loadAppSettings();
    startAutoRefresh();
});

// Tab Switching
inrTab.addEventListener('click', () => {
    inrTab.classList.add('active');
    usdtTab.classList.remove('active');
    inrContent.style.display = 'block';
    usdtContent.style.display = 'none';
    loadOrders();
});

usdtTab.addEventListener('click', () => {
    usdtTab.classList.add('active');
    inrTab.classList.remove('active');
    usdtContent.style.display = 'block';
    inrContent.style.display = 'none';
});

// Range Pill Logic
document.querySelectorAll('.range-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.range-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentRange = pill.getAttribute('data-range');
        loadOrders();
    });
});

function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        if (inrContent.style.display !== 'none') {
            loadOrders();
        }
    }, 10000); // 10 seconds
}

// Load Orders
async function loadOrders() {
    if (!auth.currentUser) return;

    // Use dynamic ranges from appSettings or defaults
    let min = 2400, max = 10000; // Medium default

    if (currentRange === 'small') {
        min = appSettings.smallMin !== undefined ? appSettings.smallMin : 250;
        max = appSettings.smallMax !== undefined ? appSettings.smallMax : 1700;
    } else if (currentRange === 'medium') {
        min = appSettings.mediumMin !== undefined ? appSettings.mediumMin : 2400;
        max = appSettings.mediumMax !== undefined ? appSettings.mediumMax : 10000;
    } else if (currentRange === 'large') {
        min = appSettings.largeMin !== undefined ? appSettings.largeMin : 10000;
        max = appSettings.largeMax !== undefined ? appSettings.largeMax : 49000;
    }

    // Override with custom user limits if set
    if (userOrderMin !== null && userOrderMax !== null) {
        min = userOrderMin;
        max = userOrderMax;
    }

    const displayCount = appSettings.orderDisplayCount || 10;
    const ordersRef = collection(db, "orders");
    let q = query(ordersRef, where("status", "==", "available"));

    try {
        const snapshot = await getDocs(q);
        const displayedOrders = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const amt = Number(data.amount);
            if (amt >= min && amt <= max) {
                displayedOrders.push({ id: docSnap.id, ...data });
            }
        });

        // Add mock orders if needed
        while (displayedOrders.length < displayCount) {
            let randomAmt = Math.floor(Math.random() * (max - min + 1)) + min;
            displayedOrders.push({
                id: `mock_${displayedOrders.length}_${Date.now()}`,
                amount: randomAmt,
                rewardPercent: rewardPercentConfig,
                bonus: 6.0,
                isMock: true
            });
        }

        // Sort by amount ascending (lowest first) as requested by user
        displayedOrders.sort((a, b) => Number(a.amount) - Number(b.amount));

        // Limit to display count
        const finalOrders = displayedOrders.slice(0, displayCount);

        let listHtml = '';
        finalOrders.forEach(data => {
            const amt = Number(data.amount);
            const appliedRewardPercent = userRewardPercent !== null ? userRewardPercent : (data.rewardPercent || rewardPercentConfig);
            const reward = (amt * appliedRewardPercent / 100) + (data.bonus || 0);
            const walletTotal = amt + reward;

            listHtml += `
                <div class="order-card-new">
                    <div class="card-top">
                        <div class="amt-group">
                            <div class="icon-circle">
                                <i class="fa-solid fa-indian-rupee-sign"></i>
                            </div>
                            <div>
                                <div class="amt-val">${amt.toFixed(2)}<span class="currency-label">INR</span></div>
                            </div>
                        </div>
                        <button class="btn-buy buy-btn" data-id="${data.id}" data-amount="${amt}" data-reward="${reward}">Buy</button>
                    </div>

                    <div class="card-bottom">
                        <div class="info-col">
                            <div class="label-text">Income</div>
                            <div class="val-row">
                                ${reward.toFixed(2)}
                                <img src="coin.webp" class="coin-img">
                                <span class="formula">(${appliedRewardPercent}%+${data.bonus || 0})</span>
                            </div>
                        </div>
                        <div class="info-col">
                            <div class="label-text">Wallet</div>
                            <div class="val-row">
                                +${walletTotal.toFixed(2)}
                                <img src="coin.webp" class="coin-img">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        ordersList.innerHTML = listHtml;
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const amount = btn.getAttribute('data-amount');
                const reward = btn.getAttribute('data-reward');
                openUpiPopup(id, amount, reward);
            };
        });

    } catch (e) {
        console.error("Order load error:", e);
    }
}

// UPI Popup Logic
async function openUpiPopup(orderId, amount, reward) {
    selectedOrder = { id: orderId, amount: amount, reward: reward };
    upiSelectionList.innerHTML = '<div style="text-align: center; padding: 20px;">Loading UPI accounts...</div>';
    upiPopupOverlay.style.display = 'flex';

    try {
        const upiRef = collection(db, "users", auth.currentUser.uid, "payment");
        const snap = await getDocs(upiRef);

        if (snap.empty) {
            upiSelectionList.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: #EF4444; font-size: 13px; margin-bottom: 20px;">Add a UPI account first.</p>
                    <a href="tool.html" class="btn-buy" style="display: inline-block; text-decoration: none;">Go to Tools</a>
                </div>
            `;
            return;
        }

        let html = '';
        snap.forEach(docSnap => {
            const upi = docSnap.data();
            let logoUrl = "download.png";
            if (upi.platform === 'PhonePe') logoUrl = "down99.png";
            if (upi.platform === 'Paytm') logoUrl = "downloadpaytm.png";

            html += `
                <div class="upi-item" data-upi="${upi.upiId}" data-platform="${upi.platform}">
                    <div class="upi-item-left">
                        <img src="${logoUrl}" class="upi-app-logo">
                        <div class="upi-id-info">
                            <span class="upi-app-name" style="color: #1E293B;">${upi.platform}</span>
                            <span class="upi-id-label">${upi.upiId}</span>
                        </div>
                    </div>
                    <div class="radio-circle"></div>
                </div>
            `;
        });
        upiSelectionList.innerHTML = html;

        document.querySelectorAll('.upi-item').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.upi-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            };
        });
    } catch (error) {
        showPopup("Error loading UPI accounts");
    }
}

cancelUpiBtn.onclick = () => upiPopupOverlay.style.display = 'none';

confirmUpiBtn.onclick = async () => {
    const selectedItem = document.querySelector('.upi-item.selected');
    if (!selectedItem) { showPopup("Please select a tool account"); return; }
    const upiId = selectedItem.getAttribute('data-upi');
    const platform = selectedItem.getAttribute('data-platform');
    handleBuy(selectedOrder.id, selectedOrder.amount, upiId, platform);
};

async function handleBuy(orderId, amount, upiId, platform) {
    if (loader) loader.style.display = 'flex';
    try {
        if (orderId.startsWith('mock_')) {
            window.location.href = `payment.html?id=${orderId}&amount=${amount}&reward=${selectedOrder.reward}&type=INR&upi=${encodeURIComponent(upiId)}&platform=${encodeURIComponent(platform)}`;
            return;
        }
        const orderRef = doc(db, "orders", orderId);
        const success = await runTransaction(db, async (t) => {
            const snap = await t.get(orderRef);
            if (!snap.exists()) throw "Order expired";
            const qty = snap.data().quantity || 1;
            if (qty <= 0) throw "Sold out";
            t.update(orderRef, { quantity: qty - 1 });
            return true;
        });
        if (success) {
            window.location.href = `payment.html?id=${orderId}&amount=${amount}&reward=${selectedOrder.reward}&type=INR&upi=${encodeURIComponent(upiId)}&platform=${encodeURIComponent(platform)}`;
        }
    } catch (e) {
        showPopup(e);
    } finally {
        if (loader) loader.style.display = 'none';
        upiPopupOverlay.style.display = 'none';
    }
}

// USDT Logic
usdtAmountInput.oninput = () => {
    const amt = parseFloat(usdtAmountInput.value);
    depositAmountInput.value = isNaN(amt) ? '' : (amt * usdtRate).toFixed(2);
};

usdtNext.onclick = () => {
    const usdtAmt = parseFloat(usdtAmountInput.value);
    if (isNaN(usdtAmt) || usdtAmt < 100) { showPopup("Minimum 100 USDT"); return; }
    window.location.href = `payment.html?amount=${usdtAmt * usdtRate}&type=USDT&usdtAmount=${usdtAmt}`;
};
