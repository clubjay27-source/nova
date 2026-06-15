// js/main.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initPopup, showPopup } from "./utils.js";

initPopup();

const sellingToggle = document.getElementById('sellingToggle');
const todayPurchase = document.getElementById('todayPurchase');
const todaySell = document.getElementById('todaySell');
const ourUsdtPrice = document.getElementById('ourUsdtPrice');
const marketUsdtPrice = document.getElementById('marketUsdtPrice');

// Auth Guard & User Data
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (!user.emailVerified) {
        window.location.href = "login.html";
        return;
    }

    // Load User Data & UPI
    const userRef = doc(db, "users", user.uid);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.isBlocked) {
                auth.signOut();
                window.location.href = "login.html";
                return;
            }

            if (sellingToggle) sellingToggle.checked = data.isSelling || false;

            // Check for bound UPI
            if (data.upiId) {
                const upiBox = document.getElementById("upiBox");
                const addUpiBtn = document.getElementById("addUpiBtn");

                if (upiBox) {
                    upiBox.innerHTML = `
                        <div style="background: white; padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                            <div style="width: 40px; height: 40px; background: #F5F3FF; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 20px;">
                                <i class="fa-solid fa-building-columns"></i>
                            </div>
                            <div>
                                <p style="font-weight: 700; font-size: 14px; color: var(--text-dark);">${data.platform || 'UPI'}</p>
                                <p style="font-size: 12px; color: var(--text-gray);">${data.upiId}</p>
                            </div>
                        </div>
                    `;
                }
                if (addUpiBtn) addUpiBtn.style.display = "none";
            }

            const splash = document.getElementById('splashScreen');
            if (splash) {
                splash.classList.add('splash-hidden');
                setTimeout(() => splash.remove(), 500);
            }
        }
    });

    loadAppSettings();

    // Call today stats
    loadTodayStats(user);
});

// Toggle Selling Status
if (sellingToggle) {
    sellingToggle.addEventListener('change', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const newState = sellingToggle.checked;
        if (!newState) {
            // Uncheck handled via tool.js / if you want, you can update local doc but we don't know which payment doc.
            // Simplified: just update user doc
            await updateDoc(doc(db, "users", user.uid), { isSelling: false });
            return;
        }

        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            const balance = userData.diamonds || 0;

            if (balance <= 0) {
                showPopup("Insufficient Diamond Balance to sell!");
                sellingToggle.checked = false;
                return;
            }

            const totalPurchased = userData.stats?.totalPurchaseAmount || 0;
            if (totalPurchased <= 0) {
                showPopup("Please buy first order");
                sellingToggle.checked = false;
                return;
            }

            // Get payment methods
            const { getDocs, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const paySnap = await getDocs(collection(db, "users", user.uid, "payment"));
            if (paySnap.empty) {
                showPopup("Please bind a payment method in Tool first");
                sellingToggle.checked = false;
                setTimeout(() => window.location.href = "tool.html", 1500);
                return;
            }

            const upiDoc = paySnap.docs[0];
            const upiData = upiDoc.data();

            await updateDoc(doc(db, "users", user.uid, "payment", upiDoc.id), {
                sellingStatus: 'pending',
                isSelling: false
            });

            await addDoc(collection(db, "selling_requests"), {
                uid: user.uid,
                email: userData.email || '',
                name: userData.name || '',
                userId: userData.userId || '',
                upiId: upiData.upiId,
                platform: upiData.platform,
                docId: upiDoc.id,
                sellAmount: balance,
                status: 'pending',
                createdAt: Date.now(),
                date: new Date().toISOString().split("T")[0]
            });

            await addDoc(collection(db, "users", user.uid, "inbox"), {
                title: "Selling Started",
                message: `Request for ${balance} diamonds sent. Tracking: online`,
                timestamp: Date.now(),
                status: 'unread'
            });

            await updateDoc(doc(db, "users", user.uid), { isSelling: true });

            showPopup(`Selling request for ${balance} diamonds sent to admin!`);
            sellingToggle.disabled = true;
        } catch (error) {
            console.error("Error updating selling status:", error);
            showPopup("Failed to send request");
            sellingToggle.checked = !sellingToggle.checked;
        }
    });
}

async function loadAppSettings() {
    try {
        const settingsRef = doc(db, "settings", "app_settings");
        onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                if (ourUsdtPrice) ourUsdtPrice.textContent = settings.usdtPrice || "101.00";
                if (marketUsdtPrice) marketUsdtPrice.textContent = settings.marketPrice || "94.13";
            }
        });
    } catch (error) {
        console.error("Error loading settings:", error);
    }
}

// 1. FIX BANNER NOT SHOWING
const bannerImg = document.getElementById("homeBanner")

onSnapshot(doc(db, "settings", "banner"), (snap) => {
    if (!bannerImg) return
    if (snap.exists()) {
        const data = snap.data()
        if (data.image) {
            bannerImg.src = data.image
        }
    }
})

// 2. FIX TUTORIALS LOADING + 7. ENSURE TUTORIAL LOADER HIDES
const tutorialsRef = collection(db, "tutorials")
const q = query(tutorialsRef, orderBy("createdAt", "desc"), limit(5))

const loader = document.getElementById("tutorialLoader")
const tutorialContainer = document.getElementById("tutorialList")

onSnapshot(q, (snap) => {
    if (loader) loader.style.display = "none"
    if (!tutorialContainer) return;
    tutorialContainer.innerHTML = ""
    snap.forEach(doc => {
        const data = doc.data()
        tutorialContainer.innerHTML += `
    <div class="tutorial-card">
        <h3>${data.title}</h3>
        <a href="${data.link}" target="_blank">Watch Tutorial</a>
    </div>
    `
    })
})

// 5. IMPLEMENT TODAY PURCHASE + SELLING
async function loadTodayStats(user) {
    const today = new Date().toISOString().slice(0, 10);
    const q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        where("date", "==", today)
    );
    const snap = await getDocs(q);
    let total = 0;
    snap.forEach(doc => {
        total += doc.data().amount || 0;
    });

    const todayPurchaseEl = document.getElementById("todayPurchase");
    const todaySellingEl = document.getElementById("todaySelling");
    if (todayPurchaseEl) todayPurchaseEl.textContent = total;
    if (todaySellingEl) todaySellingEl.textContent = total;
}

// 3. ADD DRAGGABLE CUSTOMER SUPPORT ICON
const support = document.getElementById("supportIcon")

if (support) {
    let dragging = false
    support.addEventListener("mousedown", () => dragging = true)

    document.addEventListener("mousemove", (e) => {
        if (!dragging) return
        support.style.left = e.pageX + "px"
        support.style.top = e.pageY + "px"
    })

    document.addEventListener("mouseup", () => dragging = false)

    support.addEventListener("click", () => {
        window.location.href = "customer_service.html"
    })
}
