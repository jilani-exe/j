// Reports: month/year rollover, analytics + charts, daily / monthly reports, login history, printing.

let dailyChart = null;
let monthlyChart = null;

// Moves finished months into monthly archives and finished years into yearly archives.
function checkAndPerformAutomaticRollover() {
    const salesHistory = getSalesHistory();
    const monthlyArchives = getMonthlyArchives();
    const yearlyArchives = getYearlyArchives();
    const today = getDhakaDateStr();
    const currentMonth = today.substring(0, 7);
    const currentYear = parseInt(today.substring(0, 4), 10);

    // 1. Move days of finished months into their monthly archive (merge - never overwrite or lose days)
    let monthsChanged = false;
    for (const day of Object.keys(salesHistory)) {
        const month = day.substring(0, 7);
        if (month === currentMonth) continue;
        if (!monthlyArchives[month]) monthlyArchives[month] = {};
        monthlyArchives[month][day] = salesHistory[day];
        delete salesHistory[day];
        monthsChanged = true;
    }
    if (monthsChanged) {
        saveSalesHistory(salesHistory);
        saveMonthlyArchives(monthlyArchives);
    }

    // 2. Archive every finished year that has monthly data and is not archived yet
    let yearsChanged = false;
    new Set(Object.keys(monthlyArchives).map(m => m.substring(0, 4))).forEach(year => {
        if (parseInt(year, 10) >= currentYear || yearlyArchives[year]) return;
        const yearMonths = {};
        for (const [m, recs] of Object.entries(monthlyArchives)) {
            if (m.startsWith(year)) yearMonths[m] = recs;
        }
        yearlyArchives[year] = yearMonths;
        yearsChanged = true;
    });
    if (yearsChanged) saveYearlyArchives(yearlyArchives);
}

// REPORTING & ANALYTICS
function loadStockAnalytics() {
    let inventory = getInventory();
    let salesHistory = getSalesHistory();
    let todayStr = getDhakaDateStr();

    let grandStockCount = 0;
    let categoryStockRemaining = {};
    categoriesList.forEach(c => categoryStockRemaining[c] = 0);

    for (const product of Object.values(inventory)) {
        let cat = product.category || "Ladies";
        for (const sizes of Object.values(product.colors || {})) {
            for (const qty of Object.values(sizes)) {
                let count = (parseInt(qty) || 0);
                grandStockCount += count;
                if (categoryStockRemaining[cat] !== undefined) {
                    categoryStockRemaining[cat] += count;
                }
            }
        }
    }

    document.getElementById('stat-total-stock').innerText = `${grandStockCount} Units`;

    let todayData = salesHistory[todayStr] || { itemsSold: 0, revenue: 0, categories: {} };
    document.getElementById('stat-today-revenue').innerText = `BDT ${(todayData.revenue || 0).toFixed(2)}`;
    document.getElementById('stat-today-items').innerText = `${todayData.itemsSold || 0} Units`;

    const catContainer = document.getElementById('category-stats-container');
    catContainer.innerHTML = '';

    categoriesList.forEach(cat => {
        let catTodayData = (todayData.categories && todayData.categories[cat]) ? todayData.categories[cat] : { units: 0, revenue: 0 };
        let remStock = categoryStockRemaining[cat] || 0;

        catContainer.innerHTML += `
            <div>
                <h3 class="text-sm font-bold text-red-800 uppercase tracking-wider mb-2">${cat} Category Summary</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-5 rounded-xl shadow border border-red-100 text-center">
                        <h4 class="text-xs font-bold text-gray-500 uppercase">${cat} Sales Today</h4>
                        <div class="text-2xl font-extrabold text-red-600 mt-1">BDT ${catTodayData.revenue.toFixed(2)}</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow border border-red-100 text-center">
                        <h4 class="text-xs font-bold text-gray-500 uppercase">${cat} Sold Today</h4>
                        <div class="text-2xl font-extrabold text-red-600 mt-1">${catTodayData.units} Units</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow border border-red-100 text-center">
                        <h4 class="text-xs font-bold text-gray-500 uppercase">${cat} Stock Remaining</h4>
                        <div class="text-2xl font-extrabold text-red-600 mt-1">${remStock} Units</div>
                    </div>
                </div>
            </div>
        `;
    });

    if (!dailyChart || !monthlyChart) {
        initCharts();
    }
    updateCharts(salesHistory);
}

function initCharts() {
    if (typeof Chart === 'undefined') return;   // Chart.js failed to load (offline)
    const ctxDailyEl = document.getElementById('dailyChart');
    if (ctxDailyEl) {
        const ctxDaily = ctxDailyEl.getContext('2d');
        if (dailyChart) dailyChart.destroy();
        dailyChart = new Chart(ctxDaily, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Revenue (BDT)',
                    data: [],
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxMonthlyEl = document.getElementById('monthlyChart');
    if (ctxMonthlyEl) {
        const ctxMonthly = ctxMonthlyEl.getContext('2d');
        if (monthlyChart) monthlyChart.destroy();
        monthlyChart = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Monthly Revenue (BDT)',
                    data: [],
                    backgroundColor: '#dc2626'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function updateCharts(salesHistory) {
    if (!dailyChart || !monthlyChart) return;

    let dates = Object.keys(salesHistory).sort().slice(-7);
    let revenues = dates.map(d => salesHistory[d].revenue);

    dailyChart.data.labels = dates.length ? dates : ['No Sales Yet'];
    dailyChart.data.datasets[0].data = revenues.length ? revenues : [0];
    dailyChart.update();

    let monthlyArchives = getMonthlyArchives();
    let monthlyMap = {};
    
    for (const [mStr, days] of Object.entries(monthlyArchives)) {
        let rev = 0;
        for (const dRec of Object.values(days)) rev += (dRec.revenue || 0);
        monthlyMap[mStr] = rev;
    }

    for (const [dateStr, data] of Object.entries(salesHistory)) {
        let monthStr = dateStr.substring(0, 7);
        monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + (data.revenue || 0);
    }

    let months = Object.keys(monthlyMap).sort();
    let monthlyRevenues = months.map(m => monthlyMap[m]);

    monthlyChart.data.labels = months.length ? months : ['Current Month'];
    monthlyChart.data.datasets[0].data = monthlyRevenues.length ? monthlyRevenues : [0];
    monthlyChart.update();
}

function initDailyReportView() {
    let monthlyArchives = getMonthlyArchives();

    let select = document.getElementById('daily-archive-select');
    select.innerHTML = `<option value="active">Active Current Month</option>`;

    Object.keys(monthlyArchives).sort().reverse().forEach(m => {
        select.innerHTML += `<option value="${m}">Archive: ${m}</option>`;
    });

    loadDailyReportView();
}

function loadDailyReportView() {
    let mode = document.getElementById('daily-archive-select').value;
    let tbody = document.getElementById('daily-report-table-body');
    tbody.innerHTML = '';

    let records = {};
    if (mode === 'active') {
        records = getSalesHistory();
    } else {
        let monthlyArchives = getMonthlyArchives();
        records = monthlyArchives[mode] || {};
    }

    let dates = Object.keys(records).sort().reverse();
    if (dates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 font-semibold">No daily records found in this selection.</td></tr>`;
        return;
    }

    dates.forEach(d => {
        let entry = records[d];
        let catBreakdownStr = '';
        if (entry.categories) {
            for (const [cat, cData] of Object.entries(entry.categories)) {
                catBreakdownStr += `<span class="inline-block bg-red-100 text-red-900 px-2 py-0.5 rounded text-xs font-semibold mr-1 mb-1">${escapeHtml(cat)}: ${cData.units} Units (BDT ${cData.revenue.toFixed(2)})</span>`;
            }
        }

        tbody.innerHTML += `
            <tr class="border-b border-red-50 hover:bg-red-50/50">
                <td class="p-3 font-bold">${d}</td>
                <td class="p-3">${catBreakdownStr || 'No category data'}</td>
                <td class="p-3">${entry.orders}</td>
                <td class="p-3 font-bold text-red-700">BDT ${(entry.revenue || 0).toFixed(2)}</td>
            </tr>
        `;
    });
}

function loadMonthlyReportView() {
    let monthlyArchives = getMonthlyArchives();
    let salesHistory = getSalesHistory();

    let allMonthsData = {};
    for (const [mStr, days] of Object.entries(monthlyArchives)) {
        allMonthsData[mStr] = { ...days };
    }

    let currentMonthStr = getDhakaDateStr().substring(0, 7);
    if (!allMonthsData[currentMonthStr]) {
        allMonthsData[currentMonthStr] = { ...salesHistory };
    } else {
        for (const [d, rec] of Object.entries(salesHistory)) {
            allMonthsData[currentMonthStr][d] = rec;
        }
    }

    const tbody = document.getElementById('monthly-report-table-body');
    tbody.innerHTML = '';

    let sortedMonths = Object.keys(allMonthsData).sort().reverse();
    if (sortedMonths.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500 font-semibold">No monthly data saved yet.</td></tr>`;
    } else {
        sortedMonths.forEach(m => {
            let daysMap = allMonthsData[m];
            let monthTotalRev = 0;
            let monthCatSummary = {};

            for (const dayRec of Object.values(daysMap)) {
                monthTotalRev += (dayRec.revenue || 0);
                if (dayRec.categories) {
                    for (const [cat, cData] of Object.entries(dayRec.categories)) {
                        if (!monthCatSummary[cat]) monthCatSummary[cat] = { units: 0, revenue: 0 };
                        monthCatSummary[cat].units += cData.units;
                        monthCatSummary[cat].revenue += cData.revenue;
                    }
                }
            }

            let catString = '';
            for (const [cat, cData] of Object.entries(monthCatSummary)) {
                catString += `<span class="inline-block bg-red-100 text-red-900 px-2 py-0.5 rounded text-xs font-semibold mr-1 mb-1">${escapeHtml(cat)}: ${cData.units} Units (BDT ${cData.revenue.toFixed(2)})</span>`;
            }

            tbody.innerHTML += `
                <tr class="border-b border-red-50 hover:bg-red-50/50">
                    <td class="p-3 font-bold">${m}</td>
                    <td class="p-3">${catString || 'No sales'}</td>
                    <td class="p-3 font-bold text-red-700">BDT ${monthTotalRev.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    let yearlyArchives = getYearlyArchives();
    let yearlyContainer = document.getElementById('yearly-archives-container');
    yearlyContainer.innerHTML = '';

    let years = Object.keys(yearlyArchives).sort().reverse();
    if (years.length > 0) {
        let html = `<h3 class="font-bold text-red-700 text-sm uppercase mb-2">Yearly Archived Files (Dec 31st Archives)</h3>`;
        years.forEach(yr => {
            html += `<div class="p-3 bg-red-50 rounded-xl border border-red-200 mb-2 font-semibold text-sm">Year ${yr} Archive saved with ${Object.keys(yearlyArchives[yr]).length} months recorded.</div>`;
        });
        yearlyContainer.innerHTML = html;
    }
}

// HISTORY VIEW LOADER
function loadHistoryView() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    const history = getLoginHistory();

    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 font-semibold">No login/logout history records found.</td></tr>`;
        return;
    }

    history.forEach(item => {
        let dateStr = escapeHtml(item.timestamp);
        let actionBadge = item.action === 'Login'
            ? `<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">LOGIN</span>`
            : `<span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">${escapeHtml(String(item.action).toUpperCase())}</span>`;

        tbody.innerHTML += `
            <tr class="border-b border-red-50 hover:bg-red-50/50">
                <td class="p-3 text-sm font-mono">${dateStr}</td>
                <td class="p-3 font-bold text-red-800">${escapeHtml(item.empid)}</td>
                <td class="p-3 font-medium">${escapeHtml(item.name)}</td>
                <td class="p-3">${actionBadge}</td>
            </tr>
        `;
    });
}

function printReportSection(sectionId) {
    const section = document.getElementById(sectionId);
    const win = window.open('', '', 'height=700,width=900');
    if (!win) { alert('Please allow pop-ups to print reports.'); return; }

    win.document.write(`<html><head><title>TIJARAH - Print Report</title>
        <script src="https://cdn.tailwindcss.com/3.4.17"><\/script>
        <style>body { font-family: sans-serif; padding: 20px; background: white; } button, select { display: none !important; }</style>
        </head><body>
        <h1 style="font-size: 24px; font-weight: bold; color: #b91c1c; margin-bottom: 20px;">TIJARAH - Store Report</h1>
        ${section.innerHTML}
        </body></html>`);
    win.document.close();
    win.onload = () => setTimeout(() => { win.print(); win.close(); }, 800);
}
