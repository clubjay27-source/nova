// js/tool.js
import { auth, db } from "./firebase.js";
import { collection, addDoc, getDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { initPopup, showPopup, copyToClipboard } from "./utils.js";

initPopup();

// DOM Elements
const addUpiBtn = document.getElementById('addUpiBtn');
const addUpiModal = document.getElementById('addUpiModal');
const closeModal = document.getElementById('closeModal');
const platformOptions = document.querySelectorAll('.platform-option');
const upiList = document.getElementById('upiList');
const saveUpiBtn = document.getElementById('saveUpiBtn');
const upiIdInput = document.getElementById('upiIdInput');
const mobileNumberInput = document.getElementById('mobileNumberInput');
const loader = document.getElementById('loader');

const showStatusDesc = document.getElementById('showStatusDesc');
const statusDescOverlay = document.getElementById('statusDescOverlay');
const statusDescText = document.getElementById('statusDescText');
const closeStatusDesc = document.getElementById('closeStatusDesc');

let selectedPlatform = null;

// Auth Guard
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    loadUpis(user.uid);
});

// Status Description Popup
if (showStatusDesc) {
    showStatusDesc.addEventListener('click', async () => {
        const settingsSnap = await getDocs(query(collection(db, "settings")));
        let desc = "This is a demo status description.";
        settingsSnap.forEach(docSnap => {
            if (docSnap.id === "app_settings") desc = docSnap.data().statusDescription || desc;
        });
        statusDescText.textContent = desc;
        statusDescOverlay.style.display = 'flex';
    });
}
if (closeStatusDesc) {
    closeStatusDesc.addEventListener('click', () => {
        statusDescOverlay.style.display = 'none';
    });
}

// Load UPIs
function loadUpis(uid) {
    const q = collection(db, "users", uid, "payment");
    onSnapshot(q, (snapshot) => {
        upiList.innerHTML = '';
        if (snapshot.empty) {
            upiList.innerHTML = '<div style="text-align: center; color: var(--text-gray); padding: 40px;">No UPI accounts bound</div>';
            return;
        }

        snapshot.forEach(docSnap => {
            const upi = docSnap.data();
            const card = document.createElement('div');
            card.className = 'upi-card';

            let logoUrl = "download.png"; // Default to Navi logo
            if (upi.platform === 'PhonePe') logoUrl = "down99.png";
            if (upi.platform === 'Paytm') logoUrl = "downloadpaytm.png";
            if (upi.platform === 'GooglePay') logoUrl = "google-pay-tez-logo-png_seeklogo-370704.png"; // Kept original as not specified in instruction
            if (upi.platform === 'Amazon') logoUrl = "downloadamazone.png";
            if (upi.platform === 'Mobikwik') logoUrl = "downloadmmm.png";
            if (upi.platform === 'Airtel') logoUrl = "downloadAairtel.png";
            if (upi.platform === 'Navi') logoUrl = "download.png";
            if (upi.platform === 'Slice') logoUrl = "downloadslice.png";

            const isSelling = upi.isSelling === true;
            const isServerChecking = upi.sellingStatus === 'pending';
            const displayStatus = (isSelling || isServerChecking) ? 'online' : 'offline';

            card.innerHTML = `
                <div class="upi-card-top" style="margin-bottom: 12px;">
                    <div class="platform-info">
                        <div class="platform-logo">
                            <img src="${logoUrl}" alt="${upi.platform}">
                        </div>
                        <div class="upi-details">
                            <p style="font-weight: 800; font-size: 16px; color: #1E293B;">${upi.platform}</p>
                            <p style="color: #64748B; font-size: 13px; font-weight: 600;">${upi.upiId}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div class="status-badge" style="margin-bottom: 15px;">
                            <div class="status-dot ${displayStatus}"></div>
                            <span style="color: ${displayStatus === 'online' ? '#10B981' : '#EF4444'}">${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}</span>
                        </div>
                    </div>
                </div>

                <div class="toggle-row" style="margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <label class="toggle-switch">
                            <input type="checkbox" class="selling-toggle" data-id="${docSnap.id}" ${(isSelling || isServerChecking) ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <i class="fa-solid fa-gear delete-trigger-v2" data-id="${docSnap.id}" style="font-size: 20px; color: #64748B; cursor: pointer;"></i>
                </div>
            `;
            upiList.appendChild(card);

            const toggle = card.querySelector('.selling-toggle');
            toggle.onchange = async () => {
                const newState = toggle.checked;

                if (newState) {
                    const userSnap = await getDoc(doc(db, "users", uid));
                    const userData = userSnap.data();
                    const balance = userData.diamonds || 0;

                    if (balance <= 0) {
                        showPopup("Insufficient Diamond Balance to sell!");
                        toggle.checked = false;
                        return;
                    }

                    const totalPurchased = userData.stats?.totalPurchaseAmount || 0;
                    if (totalPurchased <= 0) {
                        showPopup("Please buy one order and selling start");
                        toggle.checked = false;
                        return;
                    }

                    if (userData.buyRechargeRequired > 0) {
                        showPopup(`Pliz buy Oder Rs ${userData.buyRechargeRequired}`);
                        toggle.checked = false;
                        return;
                    }

                    if (totalPurchased < 500) {
                        const remaining = 500 - totalPurchased;
                        showPopup(`Please buy ${remaining.toFixed(0)}rs का order and selling start`);
                        toggle.checked = false;
                        return;
                    }

                    try {
                        const sellReqObj = {
                            uid: uid,
                            email: userData.email || "N/A",
                            name: userData.name || "N/A",
                            userId: userData.userId || "N/A",
                            upiId: upi.upiId || "N/A",
                            platform: upi.platform || "N/A",
                            docId: docSnap.id,
                            sellAmount: Number(balance),
                            status: 'pending',
                            createdAt: Date.now(),
                            date: new Date().toISOString().split("T")[0]
                        };

                        await updateDoc(doc(db, "users", uid, "payment", docSnap.id), {
                            sellingStatus: 'pending',
                            isSelling: false
                        });

                        await addDoc(collection(db, "selling_requests"), sellReqObj);

                        // Add Inbox Notification
                        await addDoc(collection(db, "users", uid, "inbox"), {
                            title: "Selling Started",
                            message: `Request for ${balance} diamonds sent. Tracking: online`,
                            timestamp: Date.now(),
                            status: 'unread'
                        });

                        showPopup("Selling request for " + balance + " diamonds sent to admin!");
                        // toggle.disabled = true; // Removed so user can still interact
                    } catch (e) {
                        console.error(e);
                        showPopup("Failed: " + e.message);
                        toggle.checked = false;
                    }
                } else {
                    try {
                        const { getDocs, query, collection, where, writeBatch } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

                        await updateDoc(doc(db, "users", uid, "payment", docSnap.id), {
                            isSelling: false,
                            sellingStatus: 'off'
                        });

                        // Delete from global requests if still pending
                        const q = query(collection(db, "selling_requests"), where("docId", "==", docSnap.id), where("status", "==", "pending"));
                        const pendingReqs = await getDocs(q);

                        if (!pendingReqs.empty) {
                            const batch = writeBatch(db);
                            pendingReqs.forEach((d) => {
                                batch.delete(d.ref);
                            });
                            await batch.commit();
                            showPopup("Selling stopped and request cancelled.");
                        }

                    } catch (err) {
                        console.error("Error stopping sell: ", err);
                    }
                }
            };

            // Custom Delete Logic
            const deleteTrigger = card.querySelector('.delete-trigger-v2');
            deleteTrigger.onclick = () => {
                const overlay = document.getElementById('deleteConfirmOverlay');
                const confirmBtn = document.getElementById('confirmDeleteBtn');
                const cancelBtn = document.getElementById('cancelDeleteBtn');

                overlay.style.display = 'flex';

                confirmBtn.onclick = async () => {
                    await deleteDoc(doc(db, "users", uid, "payment", docSnap.id));
                    overlay.style.display = 'none';
                    showPopup("UPI ID deleted successfully");
                };

                cancelBtn.onclick = () => {
                    overlay.style.display = 'none';
                };
            };
        });
    });
}


