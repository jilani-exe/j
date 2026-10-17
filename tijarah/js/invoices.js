// Invoices tab: list, search and re-print saved receipts.

function loadInvoicesDirectory() {
    const invoices = getInvoices();
    const tbody = document.getElementById('invoices-table-body');
    tbody.innerHTML = '';

    let invList = Object.values(invoices);
    invList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (invList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 font-semibold">No invoices recorded yet.</td></tr>`;
        return;
    }

    invList.forEach(inv => {
        let dateStr = new Date(inv.timestamp).toLocaleString();
        tbody.innerHTML += `
            <tr class="border-b border-red-50 hover:bg-red-50/50 invoice-row">
                <td class="p-3 font-mono font-bold text-red-800 inv-no-cell">${escapeHtml(inv.invoiceNo)}</td>
                <td class="p-3 text-xs">${dateStr}</td>
                <td class="p-3 font-medium inv-cust-cell">${escapeHtml(inv.customerName)} (${escapeHtml(inv.customerPhone)})</td>
                <td class="p-3 text-xs">${escapeHtml(inv.cashierName)}</td>
                <td class="p-3 text-xs max-w-xs truncate">${escapeHtml(inv.itemsSummary)}</td>
                <td class="p-3 font-extrabold text-red-600">BDT ${inv.total.toFixed(2)}</td>
                <td class="p-3">
                    <button data-id="${escapeHtml(inv.invoiceNo)}" onclick="printSavedInvoice(this.dataset.id)" class="text-red-600 hover:underline font-semibold text-sm">Print</button>
                </td>
            </tr>
        `;
    });
}

function filterInvoicesDirectory() {
    let filter = document.getElementById('invoice-search-input').value.toLowerCase();
    let rows = document.querySelectorAll('.invoice-row');

    rows.forEach(row => {
        let invNo = row.querySelector('.inv-no-cell').innerText.toLowerCase();
        let cust = row.querySelector('.inv-cust-cell').innerText.toLowerCase();
        if (invNo.includes(filter) || cust.includes(filter)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function printSavedInvoice(invoiceNo) {
    const invoices = getInvoices();
    const inv = invoices[invoiceNo];
    if (!inv) return;

    let receiptItemsHtml = '';
    (inv.cartItems || []).forEach(item => {
        let sub = item.price * item.qty;
        receiptItemsHtml += `
            <div class="flex justify-between border-b border-dashed border-gray-300 pb-1 mb-1">
                <div>
                    <div class="font-bold">${escapeHtml(item.name)}</div>
                    <div class="text-[9px] text-gray-600">${escapeHtml(item.color)} / Sz ${escapeHtml(item.size)}</div>
                    <div class="text-[9px]">BDT ${item.price.toFixed(2)} × ${item.qty}</div>
                </div>
                <div class="font-bold text-right self-center">
                    BDT ${sub.toFixed(2)}
                </div>
            </div>`;
    });

    document.getElementById('receipt-invoice-no').innerText = `Invoice #: ${inv.invoiceNo}`;
    document.getElementById('receipt-date').innerText = new Date(inv.timestamp).toLocaleString();
    document.getElementById('receipt-customer-info').innerText = `Customer: ${inv.customerName} (${inv.customerPhone})`;
    document.getElementById('receipt-seller-info').innerText = `Sold by: ${inv.cashierName} (${inv.cashierId})`;
    document.getElementById('receipt-items').innerHTML = receiptItemsHtml;
    document.getElementById('receipt-subtotal').innerText = `BDT ${inv.subtotal.toFixed(2)}`;
    document.getElementById('receipt-disc-rate').innerText = inv.discountRate;
    document.getElementById('receipt-discount').innerText = `- BDT ${((inv.subtotal * inv.discountRate)/100).toFixed(2)}`;

    const returnRow = document.getElementById('receipt-return-row');
    if (inv.returnAmount > 0) {
        returnRow.style.display = 'flex';
        document.getElementById('receipt-return-amount').innerText = `- BDT ${inv.returnAmount.toFixed(2)}`;
    } else {
        returnRow.style.display = 'none';
    }

    document.getElementById('receipt-total').innerText = `BDT ${inv.total.toFixed(2)}`;
    receiptFromNewSale = false;
    receiptEnterCount = 0;
    document.getElementById('receipt-modal').classList.remove('hidden');
}
