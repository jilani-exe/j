// Customer directory & leaderboard.

// CUSTOMER DIRECTORY & LEADERBOARD (RANKED BY TOTAL SPENT BDT)
function loadCustomerDirectory() {
    const customers = getCustomers();
    const tbody = document.getElementById('customers-table-body');
    tbody.innerHTML = '';

    let custList = Object.values(customers);

    // RANK BY TOTAL SPENT IN BDT
    custList.sort((a, b) => b.totalSpent - a.totalSpent);

    if (custList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500 font-semibold">No customer purchase records registered yet.</td></tr>`;
        return;
    }

    custList.forEach((cust, idx) => {
        let rankBadge = idx === 0 
            ? `<span class="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-extrabold text-xs">🥇 #1</span>`
            : idx === 1 
            ? `<span class="bg-gray-300 text-gray-900 px-2 py-0.5 rounded-full font-extrabold text-xs">🥈 #2</span>`
            : idx === 2 
            ? `<span class="bg-amber-600 text-white px-2 py-0.5 rounded-full font-extrabold text-xs">🥉 #3</span>`
            : `<span class="text-gray-500 font-bold">#${idx + 1}</span>`;

        tbody.innerHTML += `
            <tr class="border-b border-red-50 hover:bg-red-50/50 customer-row">
                <td class="p-3 font-bold">${rankBadge}</td>
                <td class="p-3 font-bold text-red-800 cust-name-cell">${escapeHtml(cust.name)}</td>
                <td class="p-3 font-mono text-sm cust-phone-cell">${escapeHtml(cust.phone)}</td>
                <td class="p-3 font-semibold">${cust.totalOrders}</td>
                <td class="p-3 font-extrabold text-red-600">BDT ${cust.totalSpent.toFixed(2)}</td>
                <td class="p-3 text-xs text-gray-600">${escapeHtml(cust.lastPurchase)}</td>
            </tr>
        `;
    });
}

function filterCustomerDirectory() {
    let filter = document.getElementById('customer-search-input').value.toLowerCase();
    let rows = document.querySelectorAll('.customer-row');

    rows.forEach(row => {
        let name = row.querySelector('.cust-name-cell').innerText.toLowerCase();
        let phone = row.querySelector('.cust-phone-cell').innerText.toLowerCase();
        if (name.includes(filter) || phone.includes(filter)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
