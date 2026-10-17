// Inventory management tab: add / edit / delete products, colors and size stock.

function onCategoryChange() {
    const currentBlocks = document.querySelectorAll('.color-block');
    let savedColorNames = [];
    currentBlocks.forEach(b => savedColorNames.push(b.querySelector('.color-name-input').value));
    
    document.getElementById('colors-container').innerHTML = '';
    if (savedColorNames.length === 0) {
        addColorBlock();
    } else {
        savedColorNames.forEach(c => addColorBlock(c));
    }
}

function addColorBlock(colorName = '', sizeQuantities = {}) {
    const cat = document.getElementById('inv-category').value;
    const sizes = shoeSizes[cat] || ["Standard"];
    
    const container = document.getElementById('colors-container');
    const block = document.createElement('div');
    block.className = "color-block p-4 border border-red-200 bg-red-50/50 rounded-xl space-y-3";

    let sizeInputsHtml = '';
    sizes.forEach(sz => {
        let qtyVal = sizeQuantities[sz] !== undefined ? sizeQuantities[sz] : 0;
        sizeInputsHtml += `
            <div class="flex items-center space-x-1 bg-white p-1.5 border border-red-200 rounded-lg">
                <span class="text-xs font-bold text-gray-700 w-12 text-center">Sz ${sz}:</span>
                <input type="number" min="0" value="${qtyVal}" data-size="${sz}" class="size-qty-input w-16 p-1 text-center font-bold text-sm border border-red-300 rounded focus:ring-1 focus:ring-red-500">
            </div>
        `;
    });

    block.innerHTML = `
        <div class="flex justify-between items-center gap-2 border-b border-red-200 pb-2">
            <div class="flex items-center gap-2">
                <label class="text-xs font-bold text-red-800 uppercase">Color Name:</label>
                <input type="text" placeholder="e.g. Red, Black" value="${escapeHtml(colorName)}" class="color-name-input p-1.5 border border-red-300 rounded-lg font-bold text-sm focus:ring-2 focus:ring-red-500">
            </div>
            <button onclick="this.closest('.color-block').remove()" class="text-red-600 hover:text-red-800 font-bold text-xs bg-red-100 px-3 py-1.5 rounded-lg">Remove Color</button>
        </div>
        <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Enter Quantity per Size for this Color:</label>
            <div class="flex flex-wrap gap-2">${sizeInputsHtml}</div>
        </div>
    `;
    container.appendChild(block);
}

// Smart Enter navigation for Inventory Form
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    const target = e.target;
    
    // 1. Barcode -> Name
    if (target.id === 'inv-barcode') {
        e.preventDefault();
        document.getElementById('inv-name').focus();
    }
    // 2. Name -> Category
    else if (target.id === 'inv-name') {
        e.preventDefault();
        document.getElementById('inv-category').focus();
    }
    // 3. Category -> Price
    else if (target.id === 'inv-category') {
        e.preventDefault();
        document.getElementById('inv-price').focus();
    }
    // 4. Price -> First Color Name input
    else if (target.id === 'inv-price') {
        e.preventDefault();
        const firstColorInput = document.querySelector('.color-name-input');
        if (firstColorInput) firstColorInput.focus();
    }
    // 5. Inside Color Blocks and Size Inputs
    else if (target.classList.contains('color-name-input') || target.classList.contains('size-qty-input')) {
        e.preventDefault();
        
        // Gather all interactive inputs inside the colors container sequentially
        const allColorBlocks = document.querySelectorAll('.color-block');
        let allInputs = [];
        
        allColorBlocks.forEach(block => {
            allInputs.push(block.querySelector('.color-name-input'));
            block.querySelectorAll('.size-qty-input').forEach(szInp => {
                allInputs.push(szInp);
            });
        });
        
        let currentIndex = allInputs.indexOf(target);
        if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
            // Move to the next size or next color block input
            allInputs[currentIndex + 1].focus();
        } else {
            // If we are at the very last size input, jump to the Save Product button
            const saveBtn = document.querySelector("button[onclick='saveProduct()']");
            if (saveBtn) saveBtn.focus();
        }
    }
});

function saveProduct() {
    const barcode = document.getElementById('inv-barcode').value.trim();
    const name = document.getElementById('inv-name').value.trim();
    const category = document.getElementById('inv-category').value;
    const price = parseFloat(document.getElementById('inv-price').value);

    if (!barcode || !name || isNaN(price) || price < 0) {
        alert("Please fill out Barcode, Product Name, and Price correctly!");
        return;
    }

    const colorBlocks = document.querySelectorAll('.color-block');
    if (colorBlocks.length === 0) {
        alert("Please add at least one color!");
        return;
    }

    let colorsData = {};
    let hasValidColor = false;

    colorBlocks.forEach(block => {
        let colorName = block.querySelector('.color-name-input').value.trim();
        if (!colorName) return;

        let sizeMap = {};
        let inputs = block.querySelectorAll('.size-qty-input');
        inputs.forEach(inp => {
            let sz = inp.getAttribute('data-size');
            let q = parseInt(inp.value) || 0;
            if (q > 0) sizeMap[sz] = q;
        });

        colorsData[colorName] = sizeMap;
        hasValidColor = true;
    });

    if (!hasValidColor) {
        alert("Please specify a Color Name and enter stock for at least one size!");
        return;
    }

    let inventory = getInventory();
    inventory[barcode] = { name, category, price, colors: colorsData };
    saveInventory(inventory);

    alert("Product saved to inventory successfully!");
    clearInventoryForm();
    loadInventoryTable();
}

function loadInventoryTable() {
    const inventory = getInventory();
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';

    const keys = Object.keys(inventory);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 font-semibold">No items in inventory database yet. Add one above!</td></tr>`;
        return;
    }

    for (const [barcode, product] of Object.entries(inventory)) {
        let breakdownHtml = '';
        let grandTotalStock = 0;

        for (const [color, sizes] of Object.entries(product.colors || {})) {
            let sizeStrArr = [];
            for (const [sz, qty] of Object.entries(sizes)) {
                if (qty > 0) {
                    sizeStrArr.push(`${sz}-${qty}`);
                    grandTotalStock += qty;
                }
            }
            if (sizeStrArr.length > 0) {
                breakdownHtml += `<div class="mb-1"><span class="font-bold text-red-700">${escapeHtml(color)}:</span> <span class="bg-red-100 text-red-900 px-2 py-0.5 rounded text-xs font-mono">${sizeStrArr.join(', ')}</span></div>`;
            }
        }

        tbody.innerHTML += `
            <tr class="border-b border-red-50 hover:bg-red-50/50">
                <td class="p-3 font-mono text-sm font-bold text-red-800">${escapeHtml(barcode)}</td>
                <td class="p-3 font-medium">${escapeHtml(product.name)}</td>
                <td class="p-3 text-xs font-semibold">${escapeHtml(product.category)}</td>
                <td class="p-3 font-semibold">BDT ${product.price.toFixed(2)}</td>
                <td class="p-3 text-xs">${breakdownHtml || '<span class="text-gray-400">Out of Stock</span>'}</td>
                <td class="p-3 font-bold text-red-700">${grandTotalStock}</td>
                <td class="p-3">
                    <button data-id="${escapeHtml(barcode)}" onclick="editProduct(this.dataset.id)" class="text-red-600 hover:underline mr-3 font-semibold text-sm">Edit</button>
                    <button data-id="${escapeHtml(barcode)}" onclick="deleteProduct(this.dataset.id)" class="text-gray-500 hover:text-red-700 font-semibold text-sm">Delete</button>
                </td>
            </tr>
        `;
    }
}

function editProduct(barcode) {
    const inventory = getInventory();
    const product = inventory[barcode];
    if (!product) return;
    document.getElementById('inv-barcode').value = barcode;
    document.getElementById('inv-name').value = product.name;
    document.getElementById('inv-category').value = product.category;
    document.getElementById('inv-price').value = product.price;

    document.getElementById('colors-container').innerHTML = '';
    for (const [colorName, sizeQuantities] of Object.entries(product.colors || {})) {
        addColorBlock(colorName, sizeQuantities);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(barcode) {
    if (confirm("Are you sure you want to delete this product?")) {
        let inventory = getInventory();
        delete inventory[barcode];
        saveInventory(inventory);
        loadInventoryTable();
    }
}

function clearInventoryForm() {
    document.getElementById('inv-barcode').value = '';
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-price').value = '';
    document.getElementById('inv-category').value = 'Ladies';
    document.getElementById('colors-container').innerHTML = '';
    addColorBlock();
}
