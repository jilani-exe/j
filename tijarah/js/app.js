// App shell: dropdown menu, tab switching and start-up.

function toggleMenu() {
    const menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('hidden');
}

window.addEventListener('click', function(e) {
    const menu = document.getElementById('dropdown-menu');
    const btn = e.target.closest('button');
    if (!btn && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

const TAB_IDS = ['pos', 'customers', 'invoices', 'inventory', 'stock', 'daily-report', 'monthly-report', 'history', 'profile'];

// What to run when a tab is opened
const TAB_LOADERS = {
    'pos':            () => document.getElementById('barcode-input').focus(),
    'customers':      () => loadCustomerDirectory(),
    'invoices':       () => loadInvoicesDirectory(),
    'inventory':      () => loadInventoryTable(),
    'stock':          () => loadStockAnalytics(),
    'daily-report':   () => initDailyReportView(),
    'monthly-report': () => loadMonthlyReportView(),
    'history':        () => loadHistoryView(),
    'profile':        () => loadProfileForm()
};

function switchTab(tab) {
    TAB_IDS.forEach(id => {
        const el = document.getElementById('tab-' + id);
        if (el) el.classList.toggle('hidden', id !== tab);
    });
    if (TAB_LOADERS[tab]) TAB_LOADERS[tab]();
}

async function initStorage() {
    await fetchAllDataFromCloud();
    recoverUnfinishedSession();
    checkAndPerformAutomaticRollover();
    addColorBlock();
    loadInventoryTable();
    checkAuth();
    setupFastKeyboardShortcuts();
}

// Login is required on every fresh load / refresh.
localStorage.removeItem('tijarah_active_user');
localStorage.removeItem('active_user');
sessionStorage.removeItem('tijarah_active_user');

window.addEventListener('DOMContentLoaded', initStorage);
