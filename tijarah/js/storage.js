// Data layer: in-memory store, Google Sheets sync, localStorage cache.

// IN-MEMORY / LOCAL CACHE DATA STORE
let appData = {
    tijarah_accounts: {},
    tijarah_login_history: [],
    tijarah_inventory: {},
    tijarah_sales_history: {},
    tijarah_customers: {},
    tijarah_invoices: {},
    tijarah_receipt_counter: 1,
    tijarah_monthly_archives: {},
    tijarah_yearly_archives: {}
};

// SYNC FUNCTIONS WITH GOOGLE SHEETS
async function fetchAllDataFromCloud() {
    if (!isCloudConfigured()) {
        loadFromLocalStorage();
        return;
    }
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getData`);
        const result = await response.json();
        if (result.status === "success" && result.data) {
            appData.tijarah_accounts = result.data.tijarah_accounts || getFallbackAccounts();
            appData.tijarah_login_history = result.data.tijarah_login_history || [];
            appData.tijarah_inventory = result.data.tijarah_inventory || getFallbackInventory();
            appData.tijarah_sales_history = result.data.tijarah_sales_history || {};
            appData.tijarah_customers = result.data.tijarah_customers || {};
            appData.tijarah_monthly_archives = result.data.tijarah_monthly_archives || {};
            appData.tijarah_yearly_archives = result.data.tijarah_yearly_archives || {};
            appData.tijarah_invoices = result.data.tijarah_invoices || {};
            appData.tijarah_receipt_counter = result.data.tijarah_receipt_counter || 1;
        } else {
            loadFromLocalStorage();
        }
    } catch (err) {
        console.warn("Could not reach cloud database, using local cache:", err);
        loadFromLocalStorage();
    }
}

async function saveKeyToCloud(key, value) {
    appData[key] = value;
    localStorage.setItem(key, JSON.stringify(value));

    if (!isCloudConfigured()) return;

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "saveData", key: key, value: value })
        });
    } catch (err) {
        console.error("Error saving to cloud:", err);
    }
}

function loadFromLocalStorage() {
    appData.tijarah_accounts = safeJsonParse(localStorage.getItem('tijarah_accounts'), getFallbackAccounts());
    appData.tijarah_login_history = safeJsonParse(localStorage.getItem('tijarah_login_history'), []);
    appData.tijarah_inventory = safeJsonParse(localStorage.getItem('tijarah_inventory'), getFallbackInventory());
    appData.tijarah_sales_history = safeJsonParse(localStorage.getItem('tijarah_sales_history'), {});
    appData.tijarah_customers = safeJsonParse(localStorage.getItem('tijarah_customers'), {});
    appData.tijarah_monthly_archives = safeJsonParse(localStorage.getItem('tijarah_monthly_archives'), {});
    appData.tijarah_yearly_archives = safeJsonParse(localStorage.getItem('tijarah_yearly_archives'), {});
    appData.tijarah_invoices = safeJsonParse(localStorage.getItem('tijarah_invoices'), {});
    appData.tijarah_receipt_counter = safeJsonParse(localStorage.getItem('tijarah_receipt_counter'), 1);
}

function getFallbackAccounts() {
    return {
        "DESK-CP-01": { name: "Desk Administrator", empid: "DESK-CP-01", password: "AbD3214@" }
    };
}

function getFallbackInventory() {
    return {
        "1001": { 
            name: "Ladies Designer Sandals", 
            category: "Ladies", 
            price: 2450.00, 
            colors: {
                "Red": { "36": 1, "37": 2, "38": 1, "39": 1 },
                "Black": { "37": 2, "38": 3, "39": 1 }
            }
        },
        "2002": { 
            name: "Gents Leather Shoes", 
            category: "Gents", 
            price: 3800.00, 
            colors: {
                "Brown": { "40": 1, "41": 2, "42": 1 },
                "Black": { "41": 2, "42": 2, "43": 1 }
            }
        }
    };
}

function getAccounts() { return appData.tijarah_accounts; }
function saveAccounts(accs) { saveKeyToCloud('tijarah_accounts', accs); }
function getCustomers() { return appData.tijarah_customers || {}; }
function saveCustomers(custs) { saveKeyToCloud('tijarah_customers', custs); }

function getInventory() { return appData.tijarah_inventory || {}; }
function saveInventory(inv) { saveKeyToCloud('tijarah_inventory', inv); }
function getSalesHistory() { return appData.tijarah_sales_history || {}; }
function saveSalesHistory(history) { saveKeyToCloud('tijarah_sales_history', history); }
function getMonthlyArchives() { return appData.tijarah_monthly_archives || {}; }
function saveMonthlyArchives(arc) { saveKeyToCloud('tijarah_monthly_archives', arc); }
function getYearlyArchives() { return appData.tijarah_yearly_archives || {}; }
function saveYearlyArchives(arc) { saveKeyToCloud('tijarah_yearly_archives', arc); }
function getInvoices() { return appData.tijarah_invoices || {}; }
function saveInvoices(invs) { saveKeyToCloud('tijarah_invoices', invs); }

// Active login lives in sessionStorage: it disappears when the tab is closed.
function getActiveUser() { return sessionStorage.getItem('tijarah_active_user'); }
function setActiveUser(empid) { sessionStorage.setItem('tijarah_active_user', empid); }
function clearActiveUser() { sessionStorage.removeItem('tijarah_active_user'); }
