// Point of sale: barcode scanning, cart, discounts, checkout and receipt.

let currentDiscountPercent = 0;
let cart = [];
let pendingScanBarcode = null;
let pendingScanQty = 1;
let receiptFromNewSale = false;   // true only for a receipt of the sale that was just completed

// POS SCANNER, AUTO-FILL & KEYBOARD NAVIGATION
document.getElementById('barcode-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const barcode = this.value.trim();
        const scanQty = parseInt(document.getElementById('scan-qty').value) || 1;
        this.value = '';
        if (barcode) handleScannedBarcode(barcode, scanQty);
    }
});

// AUTO-FILL NAME FROM PHONE NUMBER
document.getElementById('cust-phone').addEventListener('input', function() {
    const phone = this.value.trim();
    if (phone.length >= 3) {
        const customers = getCustomers();
        if (customers[phone]) {
            document.getElementById('cust-name').value = customers[phone].name || '';
        }
    }
});

// Track the double-enter for printing/closing receipts
let receiptEnterCount = 0; 

// Global Event Listener for Modals (Receipt, Variant, Escape)
window.addEventListener('keydown', function(e) {
    const variantModal = document.getElementById('variant-modal');
    const receiptModal = document.getElementById('receipt-modal');

    // Receipt modal: 1st Enter clicks "Print", 2nd Enter clicks "Close"
    if (e.key === 'Enter' && !receiptModal.classList.contains('hidden')) {
        e.preventDefault();
        e.stopPropagation();

        // Select the buttons inside the open receipt modal
        const receiptButtons = receiptModal.querySelectorAll('.no-print button');

        receiptEnterCount++;
        if (receiptEnterCount === 1) {
            // 1st Enter clicks the "Print Thermal Receipt" button
            if (receiptButtons.length > 0) {
                receiptButtons[0].click();
            }
        } else {
            // 2nd Enter clicks the "Close" (cancel) button
            if (receiptButtons.length > 1) {
                receiptButtons[1].click();
            } else {
                closeReceipt();
            }
            receiptEnterCount = 0;
        }
        return;
    }

    // Variant selection modal: Enter confirms selection
    if (e.key === 'Enter' && !variantModal.classList.contains('hidden')) {
        e.preventDefault();
        confirmVariantSelection();
        return;
    }

    // Escape key closes any open modals
    if (e.key === 'Escape') {
        if (!variantModal.classList.contains('hidden')) closeVariantModal();
        if (!receiptModal.classList.contains('hidden')) closeReceipt();
    }
});

// FAST ENTER KEY FLOW (MOUSELESS OPERATION)
function setupFastKeyboardShortcuts() {
    document.getElementById('scan-qty').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('barcode-input').focus();
        }
    });

    document.getElementById('cust-phone').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('cust-name').focus();
        }
    });

    document.getElementById('cust-name').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('return-amount').focus();
        }
    });

    document.getElementById('return-amount').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('custom-disc-percent').focus();
        }
    });

    document.getElementById('custom-disc-percent').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            completeSale();
        }
    });
}

function handleScannedBarcode(barcode, qty) {
    let inventory = getInventory();
    if (!inventory[barcode]) {
        alert("Product with barcode '" + barcode + "' not found in inventory!");
        return;
    }

    let product = inventory[barcode];
    pendingScanBarcode = barcode;
    pendingScanQty = qty;
    openVariantModal(product);
}

function openVariantModal(product) {
    document.getElementById('modal-product-info').innerText = `${product.name} (Barcode: ${pendingScanBarcode})`;
    const colorSelect = document.getElementById('modal-color-select');
    colorSelect.innerHTML = '';
    
    let colors = Object.keys(product.colors || {}).filter(c => Object.values(product.colors[c] || {}).some(q => q > 0));
    if (colors.length === 0) {
        alert("Product has no available stock!");
        return;
    }

    colors.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        colorSelect.appendChild(opt);
    });

    updateModalSizes();
    document.getElementById('variant-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('modal-color-select').focus(), 100);
}

function updateModalSizes() {
    let inventory = getInventory();
    let product = inventory[pendingScanBarcode];
    let selectedColor = document.getElementById('modal-color-select').value;

    const sizeSelect = document.getElementById('modal-size-select');
    sizeSelect.innerHTML = '';

    let sizesObj = product.colors[selectedColor] || {};
    for (const [sz, qty] of Object.entries(sizesObj)) {
        if (qty > 0) {
            const opt = document.createElement('option');
            opt.value = sz;
            opt.textContent = `Size ${sz} (Stock: ${qty})`;
            sizeSelect.appendChild(opt);
        }
    }
}

function confirmVariantSelection() {
    let color = document.getElementById('modal-color-select').value;
    let size = document.getElementById('modal-size-select').value;
    
    if (!color || !size) {
        alert("Please select a valid color and size.");
        return;
    }

    addToCart(pendingScanBarcode, color, size, pendingScanQty);
    closeVariantModal();
}

function closeVariantModal() {
    document.getElementById('variant-modal').classList.add('hidden');
    pendingScanBarcode = null;
    pendingScanQty = 1;
    document.getElementById('barcode-input').focus();
}

function addToCart(barcode, color, size, qtyToAdd) {
    let inventory = getInventory();
    let product = inventory[barcode];
    let stockAvailable = (product.colors[color] && product.colors[color][size]) || 0;

    let cartItem = cart.find(item => item.barcode === barcode && item.color === color && item.size === size);
    let currentInCart = cartItem ? cartItem.qty : 0;

    if (currentInCart + qtyToAdd > stockAvailable) {
        alert(`Cannot add ${qtyToAdd}. Only ${stockAvailable - currentInCart} remaining in stock for ${color} / Size ${size}!`);
        return;
    }

    if (cartItem) {
        cartItem.qty += qtyToAdd;
    } else {
        cart.push({
            barcode: barcode,
            name: product.name,
            category: product.category,
            color: color,
            size: size,
            price: product.price,
            qty: qtyToAdd
        });
    }
    updateCartDisplay();
    document.getElementById('barcode-input').focus();
}

function updateCartQty(index, newQty) {
    let inventory = getInventory();
    let item = cart[index];
    let product = inventory[item.barcode];
    let stockAvailable = (product.colors[item.color] && product.colors[item.color][item.size]) || 0;

    if (newQty > stockAvailable) {
        alert(`Stock limit reached! Maximum available is ${stockAvailable}.`);
        item.qty = stockAvailable;
    } else if (newQty <= 0) {
        removeFromCart(index);
        return;
    } else {
        item.qty = newQty;
    }
    updateCartDisplay();
}

function setDiscount(percent) {
    currentDiscountPercent = percent;
    document.getElementById('custom-disc-percent').value = 0;
    [0, 10, 15, 30].forEach(p => {
        const btn = document.getElementById(`disc-${p}`);
        if (p === percent) {
            btn.className = "py-2 border border-red-300 rounded-lg font-bold text-sm bg-red-600 text-white";
        } else {
            btn.className = "py-2 border border-red-300 rounded-lg font-bold text-sm bg-white text-red-700 hover:bg-red-50";
        }
    });
    updateCartDisplay();
}

function applyCustomDiscount() {
    let customVal = Math.min(100, Math.max(0, parseFloat(document.getElementById('custom-disc-percent').value) || 0));
    currentDiscountPercent = customVal;
    [0, 10, 15, 30].forEach(p => {
        const btn = document.getElementById(`disc-${p}`);
        if (btn) btn.className = "py-2 border border-red-300 rounded-lg font-bold text-sm bg-white text-red-700 hover:bg-red-50";
    });
    updateCartDisplay();
}

function updateCartDisplay() {
    const tbody = document.getElementById('cart-table-body');
    tbody.innerHTML = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
        let itemSub = item.price * item.qty;
        subtotal += itemSub;
        tbody.innerHTML += `
            <tr class="border-b border-red-50 hover:bg-red-50/50">
                <td class="p-3 font-medium">${escapeHtml(item.name)}</td>
                <td class="p-3 text-xs text-gray-600">${escapeHtml(item.category)} / <span class="font-bold text-red-700">${escapeHtml(item.color)}</span> / Size ${escapeHtml(item.size)}</td>
                <td class="p-3">BDT ${item.price.toFixed(2)}</td>
                <td class="p-3">
                    <input type="number" value="${item.qty}" min="1" onchange="updateCartQty(${index}, parseInt(this.value) || 1)" 
                           class="w-16 p-1 border border-red-300 rounded text-center font-bold">
                </td>
                <td class="p-3 font-semibold">BDT ${itemSub.toFixed(2)}</td>
                <td class="p-3"><button onclick="removeFromCart(${index})" class="text-red-600 hover:text-red-800 font-semibold text-sm">Remove</button></td>
            </tr>
        `;
    });

    let discountAmount = (subtotal * currentDiscountPercent) / 100;
    let returnDeduction = Math.max(0, parseFloat(document.getElementById('return-amount').value) || 0);
    let grandTotal = subtotal - discountAmount - returnDeduction;
    if (grandTotal < 0) grandTotal = 0;

    document.getElementById('cart-subtotal').innerText = `BDT ${subtotal.toFixed(2)}`;
    document.getElementById('disc-percent-label').innerText = currentDiscountPercent;
    document.getElementById('cart-discount').innerText = `- BDT ${discountAmount.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `BDT ${grandTotal.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function clearCart() {
    cart = [];
    setDiscount(0);
    document.getElementById('scan-qty').value = 1;
    document.getElementById('cust-phone').value = '';
    document.getElementById('cust-name').value = '';
    document.getElementById('return-amount').value = 0;
    document.getElementById('custom-disc-percent').value = 0;
    updateCartDisplay();
    document.getElementById('barcode-input').focus();
}



function completeSale() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }

    const phone = document.getElementById('cust-phone').value.trim();
    const name = document.getElementById('cust-name').value.trim();
    const activeEmpId = getActiveUser();
    const accounts = getAccounts();
    const currentUser = accounts[activeEmpId] || { name: "Cashier", empid: activeEmpId || "N/A" };

    let inventory = getInventory();
    let totalUnitsSoldInOrder = 0;
    let subtotal = 0;
    let categoryBreakdown = {};

    cart.forEach(item => {
        let itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        totalUnitsSoldInOrder += item.qty;

        if (!categoryBreakdown[item.category]) {
            categoryBreakdown[item.category] = { units: 0, revenue: 0 };
        }
        categoryBreakdown[item.category].units += item.qty;

        if (inventory[item.barcode] && inventory[item.barcode].colors[item.color]) {
            if (inventory[item.barcode].colors[item.color][item.size] !== undefined) {
                inventory[item.barcode].colors[item.color][item.size] -= item.qty;
            }
        }
    });

    let discountAmount = (subtotal * currentDiscountPercent) / 100;
    let returnDeduction = Math.max(0, parseFloat(document.getElementById('return-amount').value) || 0);
    let grandTotal = subtotal - discountAmount - returnDeduction;
    if (grandTotal < 0) grandTotal = 0;

    let discountFactor = subtotal > 0 ? ((subtotal - discountAmount) / subtotal) : 1;
    cart.forEach(item => {
        let discountedItemRevenue = (item.price * item.qty) * discountFactor;
        categoryBreakdown[item.category].revenue += discountedItemRevenue;
    });

    saveInventory(inventory);

    // SERIALIZE RECEIPT STARTING FROM 00000001
    let counter = appData.tijarah_receipt_counter || 1;
    let invoiceNo = String(counter).padStart(8, '0');
    appData.tijarah_receipt_counter = counter + 1;
    saveKeyToCloud('tijarah_receipt_counter', appData.tijarah_receipt_counter);

    let todayStr = getDhakaDateStr();
    let itemsSummaryStr = cart.map(item => `${item.name} (${item.color}/Sz ${item.size}) x${item.qty}`).join(' | ');

    // SAVE TO INVOICES
    let invoices = getInvoices();
    invoices[invoiceNo] = {
        invoiceNo: invoiceNo,
        timestamp: new Date().toISOString(),
        cashierId: currentUser.empid,
        cashierName: currentUser.name,
        customerName: name || "Walk-in Customer",
        customerPhone: phone || "N/A",
        itemsSummary: itemsSummaryStr,
        subtotal: subtotal,
        discountRate: currentDiscountPercent,
        returnAmount: returnDeduction,
        total: grandTotal,
        cartItems: JSON.parse(JSON.stringify(cart))
    };

    // Prune local records older than 180 days
    let cutoff = Date.now() - (180 * 24 * 60 * 60 * 1000);
    for (let invKey in invoices) {
        let invTime = new Date(invoices[invKey].timestamp).getTime();
        if (invTime < cutoff) {
            delete invoices[invKey];
        }
    }
    saveInvoices(invoices);

    // Sales History & Customer records
    let salesHistory = getSalesHistory();
    if (!salesHistory[todayStr]) {
        salesHistory[todayStr] = { orders: 0, itemsSold: 0, revenue: 0, categories: {} };
    }
    salesHistory[todayStr].orders += 1;
    salesHistory[todayStr].itemsSold += totalUnitsSoldInOrder;
    salesHistory[todayStr].revenue += grandTotal;
    if (!salesHistory[todayStr].categories) salesHistory[todayStr].categories = {};
    for (const [cat, data] of Object.entries(categoryBreakdown)) {
        if (!salesHistory[todayStr].categories[cat]) salesHistory[todayStr].categories[cat] = { units: 0, revenue: 0 };
        salesHistory[todayStr].categories[cat].units += data.units;
        salesHistory[todayStr].categories[cat].revenue += data.revenue;
    }
    saveSalesHistory(salesHistory);

    if (phone || name) {
        let custKey = phone || name;
        let customers = getCustomers();
        if (!customers[custKey]) {
            customers[custKey] = { name: name || "Walk-in Customer", phone: phone || "N/A", totalSpent: 0, totalOrders: 0, lastPurchase: todayStr };
        }
        customers[custKey].name = name || customers[custKey].name;
        customers[custKey].phone = phone || customers[custKey].phone;
        customers[custKey].totalSpent += grandTotal;
        customers[custKey].totalOrders += 1;
        customers[custKey].lastPurchase = todayStr;
        saveCustomers(customers);
    }

    // Populate Receipt Modal
    let receiptItemsHtml = '';
    cart.forEach(item => {
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

    document.getElementById('receipt-invoice-no').innerText = `Invoice #: ${invoiceNo}`;
    document.getElementById('receipt-date').innerText = new Date().toLocaleString();
    document.getElementById('receipt-customer-info').innerText = (name || phone) ? `Customer: ${name || 'Walk-in'}${phone ? ' (' + phone + ')' : ''}` : `Customer: Walk-in`;
    document.getElementById('receipt-seller-info').innerText = `Sold by: ${currentUser.name} (${currentUser.empid})`;
    document.getElementById('receipt-items').innerHTML = receiptItemsHtml;
    document.getElementById('receipt-subtotal').innerText = `BDT ${subtotal.toFixed(2)}`;
    document.getElementById('receipt-disc-rate').innerText = currentDiscountPercent;
    document.getElementById('receipt-discount').innerText = `- BDT ${discountAmount.toFixed(2)}`;

    const returnRow = document.getElementById('receipt-return-row');
    if (returnDeduction > 0) {
        returnRow.style.display = 'flex';
        document.getElementById('receipt-return-amount').innerText = `- BDT ${returnDeduction.toFixed(2)}`;
    } else {
        returnRow.style.display = 'none';
    }

    document.getElementById('receipt-total').innerText = `BDT ${grandTotal.toFixed(2)}`;
    receiptEnterCount = 0;
    receiptFromNewSale = true;
    
    if (document.activeElement) document.activeElement.blur(); // Removes focus from background buttons
    document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceipt() {
    document.getElementById('receipt-modal').classList.add('hidden');
    // Only wipe the cart after a NEW sale. Re-printing an old invoice must not erase a sale in progress.
    if (receiptFromNewSale) clearCart();
    receiptFromNewSale = false;
    setTimeout(() => document.getElementById('barcode-input').focus(), 100);
}
