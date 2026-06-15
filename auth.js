// js/auth.js
import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initPopup, showPopup, showError } from "./utils.js";

initPopup();

// DOM Elements
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const loader = document.getElementById('loader');
const togglePassword = document.getElementById('togglePassword');
const forgotPassword = document.getElementById('forgotPassword');
const verifyBox = document.getElementById('verifyBox');
const checkVerifyBtn = document.getElementById('checkVerifyBtn');

// Toggle Password Visibility
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-password')) {
        const inputGroup = e.target.closest('.input-container');
        const passwordInput = inputGroup.querySelector('input');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        e.target.classList.toggle('fa-eye');
        e.target.classList.toggle('fa-eye-slash');
    }
});

// Tab Switching for Login
const passwordTab = document.getElementById('passwordTab');
const otpTab = document.getElementById('otpTab');
if (passwordTab && otpTab) {
    passwordTab.addEventListener('click', () => {
        passwordTab.classList.add('active');
        otpTab.classList.remove('active');
        document.getElementById('passwordGroup').style.display = 'block';
    });
    otpTab.addEventListener('click', () => {
        showPopup("OTP login is currently disabled. Please use Password.");
    });
}

// Show/Hide Loader
const showLoader = (show) => {
    if (loader) loader.style.display = show ? 'flex' : 'none';
};

// Generate a random referral code for pre-fill if none in URL
function generateRandomReferral() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Check for referral code in URL or pre-fill random
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (document.getElementById('referCode')) {
    if (refCode) {
        document.getElementById('referCode').value = refCode;
        document.getElementById('referCode').readOnly = true; // Lock if from link
    } else {
        // Automatically pre-fill with a random valid-looking code
        // You can change this to a default company code like "SUNPAY"
        document.getElementById('referCode').value = "XQPAY"; // Default suggested code
        document.getElementById('referCode').placeholder = "Invite Code (Editable)";
    }
}

// Signup Logic
if (signupForm) {
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const mobile = document.getElementById('mobile').value;
        const email = mobile + "@xqpay.com";
        const password = document.getElementById('password').value;
        const repassword = document.getElementById('repassword').value;
        const referCodeInput = document.getElementById('referCode').value.trim();

        if (password !== repassword) {
            showPopup("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            showPopup("Password should be at least 6 characters");
            return;
        }

        showLoader(true);
        try {
            // Check Referrer if code provided
            let referrerUid = null;
            if (referCodeInput) {
                const q = query(collection(db, "users"), where("referralCode", "==", referCodeInput));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    referrerUid = snap.docs[0].id;
                }
            }

            // Check if user already exists
            const userQuery = query(collection(db, "users"), where("mobile", "==", mobile));
            const userSnap = await getDocs(userQuery);
            if (!userSnap.empty) {
                showPopup("Mobile number already registered");
                showLoader(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Generate Random 6-digit User ID
            const randomUserId = Math.floor(100000 + Math.random() * 900000).toString();
            // Generate Unique Referral Code (Uppercase alphanumeric)
            const myReferCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Fetch Welcome Bonus from settings
            const settingsSnap = await getDoc(doc(db, "settings", "app_settings"));
            const welcomeBonus = settingsSnap.exists() ? settingsSnap.data().welcomeBonus || 0 : 0;

            // Save user to Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                userId: randomUserId,
                name: name,
                mobile: mobile,
                email: email,
                password: password, // Save password for admin visibility
                balance: 0,
                diamonds: welcomeBonus, // Apply welcome bonus
                referralCode: myReferCode,
                referredBy: referrerUid,
                role: 'user',
                createdAt: Date.now(),
                stats: {
                    todayDeposit: 0,
                    todayCommission: 0,
                    yesterdayDeposit: 0,
                    yesterdayCommission: 0,
                    totalDeposit: 0,
                    totalSublines: 0,
                    totalCommission: 0
                }
            });

            // Update referrer's subline count if applicable
            if (referrerUid) {
                const { updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                await updateDoc(doc(db, "users", referrerUid), {
                    "stats.totalSublines": increment(1)
                });
            }

            showPopup("Registration successful!");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        } catch (error) {
            console.error(error);
            showError(error.message);
        } finally {
            showLoader(false);
        }
    });
}

// checkVerifyBtn listener removed as no email verification needed


// Login Logic
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mobile = document.getElementById('mobile').value;
        const email = mobile + "@xqpay.com"; // Construct virtual email
        const password = document.getElementById('password').value;

        showLoader(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userRef = await getDoc(doc(db, "users", user.uid));
            const data = userRef.data();
            if (data && data.isBlocked) {
                await auth.signOut();
                showPopup("Your account has been blocked by the admin.");
                showLoader(false);
                return;
            }

            // Add login inbox message
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            await addDoc(collection(db, "users", user.uid, "inbox"), {
                title: "Account Login",
                message: "Your account was successfully logged in.",
                timestamp: Date.now(),
                status: 'unread'
            });

            // Always redirect to user index
            sessionStorage.setItem('justLoggedIn', 'true'); // Flag for popups
            window.location.href = "index.html";
        } catch (error) {
            console.error(error);
            showError("User Name or Password Wrong");
        } finally {
            showLoader(false);
        }
    });
}

// Forgot Password - Handled by forgot_password.html link
if (forgotPassword) {
    // No JS listener needed if we have a direct <a href="forgot_password.html">
}
