// Login history, sign-up / login / logout, profiles and admin tools.

function getLoginHistory() {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const history = (appData.tijarah_login_history || []).filter(item => {
        const t = parseTimestamp(item.timestamp).getTime();
        return isNaN(t) || t > ninetyDaysAgo;
    });
    appData.tijarah_login_history = history;
    return history;
}

// opts.timestamp: use this time instead of "now"; opts.skipSheet: do not post to the Google Sheet log
function recordHistory(empid, name, action, opts = {}) {
    const history = getLoginHistory();
    const newLog = { empid, name, action, timestamp: opts.timestamp || getDhakaFormattedTime() };
    history.unshift(newLog);
    saveKeyToCloud('tijarah_login_history', history);

    if (isCloudConfigured() && !opts.skipSheet) {
        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "logHistoryEvent", value: newLog })
        }).catch(err => console.error("Error logging history:", err));
    }
}

// If the last session ended without a manual logout (tab closed / crash), log it once.
function recoverUnfinishedSession() {
    const lingering = localStorage.getItem('tijarah_session_active');
    const pending = safeJsonParse(localStorage.getItem('tijarah_pending_logout'), null);
    if (!lingering && !pending) return;

    const user = getAccounts()[(pending && pending.empid) || lingering];
    if (user) {
        recordHistory(user.empid, user.name, 'Logout (Tab Closed)', {
            timestamp: pending ? pending.timestamp : undefined,
            skipSheet: !!pending   // the beacon already sent it to the sheet
        });
    }
    localStorage.removeItem('tijarah_session_active');
    localStorage.removeItem('tijarah_pending_logout');
}

// Tab closed / refreshed while logged in: remember the exact time and notify the sheet.
window.addEventListener('beforeunload', function () {
    const empid = getActiveUser();
    const user = empid && getAccounts()[empid];
    if (!user) return;

    const entry = { empid: user.empid, name: user.name, action: "Logout (Tab Closed)", timestamp: getDhakaFormattedTime() };
    localStorage.setItem('tijarah_pending_logout', JSON.stringify(entry));
    if (isCloudConfigured() && navigator.sendBeacon) {
        navigator.sendBeacon(APPS_SCRIPT_URL, JSON.stringify({ action: "logHistoryEvent", value: entry }));
    }
});

function checkAuth() {
    const activeEmpId = getActiveUser();
    const accounts = getAccounts();

    if (activeEmpId && accounts[activeEmpId]) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        loadProfileForm();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }
}

function toggleAuthMode(mode) {
    if (mode === 'signup') {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
    } else {
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    }
}

function handleSignUp(e) {
    e.preventDefault();
    const secCode = document.getElementById('signup-sec-code').value.trim();
    const name = document.getElementById('signup-name').value.trim();
    const empid = document.getElementById('signup-empid').value.trim();
    const password = document.getElementById('signup-password').value;

    if (secCode !== SECURITY_REG_CODE) {
        alert("Invalid Security Registration Code!");
        return;
    }

    let accounts = getAccounts();
    if (accounts[empid]) {
        alert("An account with this Employee ID already exists!");
        return;
    }

    accounts[empid] = { name, empid, password };
    saveAccounts(accounts);
    setActiveUser(empid);
    localStorage.setItem('tijarah_session_active', empid); // Track active session
    recordHistory(empid, name, 'Login');

    alert("Registration successful! Logging you in...");
    document.getElementById('signup-form').reset();
    checkAuth();
    switchTab('pos');
}

function handleLogin(e) {
    e.preventDefault();
    const idInput = document.getElementById('login-id').value.trim();
    const passInput = document.getElementById('login-password').value;
    const accounts = getAccounts();

    let foundAccount = accounts[idInput];

    if (!foundAccount) {
        for (const acc of Object.values(accounts)) {
            if (acc.name.toLowerCase() === idInput.toLowerCase()) {
                foundAccount = acc;
                break;
            }
        }
    }

    if (foundAccount && foundAccount.password === passInput) {
        setActiveUser(foundAccount.empid);
        localStorage.setItem('tijarah_session_active', foundAccount.empid); // Track active session
        recordHistory(foundAccount.empid, foundAccount.name, 'Login');
        document.getElementById('login-form').reset();
        checkAuth();
        switchTab('pos');
    } else {
        alert("Invalid Credentials or Profile not found!");
    }
}

function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
        const activeEmpId = getActiveUser();
        const accounts = getAccounts();
        if (activeEmpId && accounts[activeEmpId]) {
            recordHistory(activeEmpId, accounts[activeEmpId].name, 'Logout');
        }
        clearActiveUser();
        localStorage.removeItem('tijarah_session_active'); // Clear active session flag
        checkAuth();
    }
}

function loadProfileForm() {
    const activeEmpId = getActiveUser();
    const accounts = getAccounts();
    const user = accounts[activeEmpId];

    if (user) {
        document.getElementById('prof-name').value = user.name;
        document.getElementById('prof-empid').value = user.empid;
        document.getElementById('prof-badge-empid').innerText = user.empid;

        const nameInput = document.getElementById('prof-name');
        const empidInput = document.getElementById('prof-empid');
        const subTitle = document.getElementById('prof-subtitle');
        const submitBtn = document.getElementById('prof-submit-btn');
        const labelName = document.getElementById('label-prof-name');
        const labelEmpId = document.getElementById('label-prof-empid');
        const adminMgmtPanel = document.getElementById('admin-profile-management');

        if (activeEmpId === 'DESK-CP-01') {
            document.getElementById('kchaao-btn').classList.remove('hidden');
            nameInput.removeAttribute('readonly');
            nameInput.className = "w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white text-gray-800 font-semibold";
            empidInput.removeAttribute('readonly');
            empidInput.className = "w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white text-gray-800 font-semibold";
            subTitle.innerText = "Privileged Admin Account";
            submitBtn.innerText = "Save Profile Changes";
            labelName.innerText = "Full Name (Editable)";
            labelEmpId.innerText = "Employee ID (Editable)";
            
            adminMgmtPanel.classList.remove('hidden');
            loadAllProfilesTable();
        } else {
            document.getElementById('kchaao-btn').classList.add('hidden');
            nameInput.setAttribute('readonly', true);
            nameInput.className = "w-full p-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-700 font-semibold cursor-not-allowed";
            empidInput.setAttribute('readonly', true);
            empidInput.className = "w-full p-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-700 font-semibold cursor-not-allowed";
            subTitle.innerText = "View profile info & update security settings";
            submitBtn.innerText = "Update Password";
            labelName.innerText = "Full Name (Permanent)";
            labelEmpId.innerText = "Employee ID (Permanent)";

            adminMgmtPanel.classList.add('hidden');
        }
    }
}

function loadAllProfilesTable() {
    const accounts = getAccounts();
    const tbody = document.getElementById('all-profiles-table-body');
    tbody.innerHTML = '';

    for (const [empid, acc] of Object.entries(accounts)) {
        tbody.innerHTML += `
            <tr class="border-b border-red-50 hover:bg-red-50/50">
                <td class="p-3 font-bold text-red-800">${escapeHtml(acc.empid)}</td>
                <td class="p-3 font-medium">${escapeHtml(acc.name)}</td>
                <td class="p-3">
                    <button data-id="${escapeHtml(acc.empid)}" onclick="openEditProfileModal(this.dataset.id)" class="text-red-600 hover:underline mr-3 font-semibold text-sm">Edit</button>
                    <button data-id="${escapeHtml(acc.empid)}" onclick="deleteSystemProfile(this.dataset.id)" class="text-gray-500 hover:text-red-700 font-semibold text-sm">Delete</button>
                </td>
            </tr>
        `;
    }
}

function openEditProfileModal(targetEmpId) {
    const accounts = getAccounts();
    const acc = accounts[targetEmpId];
    if (!acc) return;

    document.getElementById('edit-orig-empid').value = acc.empid;
    document.getElementById('edit-name').value = acc.name;
    document.getElementById('edit-empid').value = acc.empid;
    document.getElementById('edit-pass').value = '';
    document.getElementById('edit-profile-modal').classList.remove('hidden');
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.add('hidden');
}

function saveEditedProfile(e) {
    e.preventDefault();
    const origEmpId = document.getElementById('edit-orig-empid').value;
    const newName = document.getElementById('edit-name').value.trim();
    const newEmpId = document.getElementById('edit-empid').value.trim();
    const newPass = document.getElementById('edit-pass').value;

    let accounts = getAccounts();

    if (origEmpId !== newEmpId && accounts[newEmpId]) {
        alert("An account with this Employee ID already exists!");
        return;
    }

    let user = accounts[origEmpId];
    if (!user) { alert("Profile not found!"); return; }
    delete accounts[origEmpId];

    user.name = newName;
    user.empid = newEmpId;
    if (newPass) user.password = newPass;

    accounts[newEmpId] = user;
    saveAccounts(accounts);

    const activeEmpId = getActiveUser();
    if (activeEmpId === origEmpId) {
        setActiveUser(newEmpId);
    }

    alert("Profile updated successfully!");
    closeEditProfileModal();
    loadProfileForm();
}

function deleteSystemProfile(targetEmpId) {
    if (confirm(`Are you sure you want to delete profile ${targetEmpId}?`)) {
        let accounts = getAccounts();
        delete accounts[targetEmpId];
        saveAccounts(accounts);

        const activeEmpId = getActiveUser();
        if (activeEmpId === targetEmpId) {
            alert("You deleted your own active account! Logging out...");
            clearActiveUser();
            checkAuth();
        } else {
            alert("Profile deleted successfully.");
            loadAllProfilesTable();
        }
    }
}

function updateProfile(e) {
    e.preventDefault();
    const activeEmpId = getActiveUser();
    let accounts = getAccounts();
    
    const newName = document.getElementById('prof-name').value.trim();
    const newEmpId = document.getElementById('prof-empid').value.trim();
    const newPass = document.getElementById('prof-pass').value;

    if (activeEmpId === 'DESK-CP-01') {
        if (!newName || !newEmpId) {
            alert("Name and Employee ID cannot be blank!");
            return;
        }
        if (activeEmpId !== newEmpId && accounts[newEmpId]) {
            alert("An account with this Employee ID already exists!");
            return;
        }

        let user = accounts[activeEmpId];
        delete accounts[activeEmpId];

        user.name = newName;
        user.empid = newEmpId;
        if (newPass) user.password = newPass;

        accounts[newEmpId] = user;
        saveAccounts(accounts);
        setActiveUser(newEmpId);

        alert("Profile updated successfully!");
        document.getElementById('prof-pass').value = '';
        loadProfileForm();
    } else {
        if (!newPass) {
            alert("Please enter a new password to update!");
            return;
        }
        if (accounts[activeEmpId]) {
            accounts[activeEmpId].password = newPass;
            saveAccounts(accounts);
            alert("Password updated successfully!");
            document.getElementById('prof-pass').value = '';
        }
    }
}

async function triggerKchaaoReset() {
const activeEmpId = getActiveUser();
if (activeEmpId !== 'DESK-CP-01') {
    alert("Unauthorized action!");
    return;
}

// Only a single safety confirmation box
const confirmed = confirm("⚠️ WARNING: You are about to perform a KCHAAO SYSTEM RESET.\n\nThis will wipe out all sales history, invoices, customer records, and login history.\n\nINVENTORY AND EMPLOYEE PROFILES WILL REMAIN UNTOUCHED.\n\nClick OK to proceed with the reset.");
if (!confirmed) return;

// Reset local cache records (keeping profiles & inventory intact)
appData.tijarah_login_history = [];
appData.tijarah_sales_history = {};
appData.tijarah_customers = {};
appData.tijarah_invoices = {};
appData.tijarah_receipt_counter = 1;
appData.tijarah_monthly_archives = {};
appData.tijarah_yearly_archives = {};

// Save wiped records locally
localStorage.setItem('tijarah_login_history', JSON.stringify([]));
localStorage.setItem('tijarah_sales_history', JSON.stringify({}));
localStorage.setItem('tijarah_customers', JSON.stringify({}));
localStorage.setItem('tijarah_invoices', JSON.stringify({}));
localStorage.setItem('tijarah_receipt_counter', JSON.stringify(1));
localStorage.setItem('tijarah_monthly_archives', JSON.stringify({}));
localStorage.setItem('tijarah_yearly_archives', JSON.stringify({}));

// Send reset request to Google Apps Script
try {
    await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "kchaaoReset" })
    });
} catch (err) {
    console.error("Error executing Kchaao reset on cloud:", err);
}

alert("KCHAAO! All sales, customer, history, and invoice records have been completely wiped out.\n\nYour Inventory and Employee Profiles are intact and ready for a fresh start!");
location.reload();
}
