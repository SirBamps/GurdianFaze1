// Guardian Health Pharmacy - Inventory Management System
// Complete CRUD operations with jQuery

$(document).ready(function() {
    console.log("🏥 Inventory Management System Initialized");
    
    initializeInventory();
    loadInventoryData();
    setupEventListeners();
});

let currentTimeFilter = 'all';
let currentSearchTerm = '';

function initializeInventory() {
    // Load user data
    const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    $('#userName').text(userData.name || 'Admin User');
    
    // Set minimum date for expiry date
    const today = new Date().toISOString().split('T')[0];
    $('#expiryDate').attr('min', today);
    
    console.log("✅ Inventory system ready");

    function checkForHighlightedMedicine() {
    const highlightId = localStorage.getItem('highlightMedicine');
    if (highlightId) {
        // Scroll to and highlight the medicine
        $(`[data-medicine-id="${highlightId}"]`).addClass('highlight-row');
        localStorage.removeItem('highlightMedicine'); // Clear after use
    }
    }
}

function setupEventListeners() {
    // Search functionality
    $('#searchInput').on('input', function() {
        currentSearchTerm = $(this).val().toLowerCase();
        filterMedicines();
    });
    
    // Auto-calculate selling price
    $('#unitPrice').on('blur', function() {
        autoCalculateSellingPrice();
    });
    
    // Form submission
    $('#medicineForm').on('submit', function(e) {
        e.preventDefault();
        saveMedicine();
    });
    
    // File input change
    $('#csvFile').on('change', function() {
        validateFile(this);
    });
}

// LOAD INVENTORY DATA FUNCTION - THIS WAS MISSING!
function loadInventoryData() {
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    updateStatistics(medicines);
    renderMedicineTable(medicines);
    loadNotifications();
}

// Time-based filtering functions
function setTimeFilter(filter) {
    currentTimeFilter = filter;
    
    // Update active button states
    $('#filterAll, #filterMonthly, #filterWeekly, #filterExpired').removeClass('active');
    $(`#filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).addClass('active');
    
    filterMedicines();
    
    // Show filter notification
    const filterText = {
        'all': 'All Medicines',
        'monthly': 'Monthly View',
        'weekly': 'Weekly View',
        'expired': 'EXPIRED MEDICINES'
    }[filter];
    
    const filterType = filter === 'expired' ? 'danger' : 'info';
    showNotification(`Showing ${filterText}`, filterType);
}

function getFilteredMedicines(medicines) {
    let filtered = medicines;
    
    // Apply time filter
    const now = new Date();
    switch (currentTimeFilter) {
        case 'weekly':
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(med => new Date(med.dateAdded) >= oneWeekAgo);
            break;
        case 'monthly':
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(med => new Date(med.dateAdded) >= oneMonthAgo);
            break;
        case 'expired':
            filtered = filtered.filter(med => new Date(med.expiryDate) <= now);
            break;
        case 'all':
        default:
            // No time filter applied
            break;
    }
    
    // Apply search filter
    if (currentSearchTerm) {
        filtered = filtered.filter(medicine =>
            medicine.name.toLowerCase().includes(currentSearchTerm) ||
            medicine.batchNumber.toLowerCase().includes(currentSearchTerm) ||
            medicine.manufacturer.toLowerCase().includes(currentSearchTerm) ||
            (medicine.genericName && medicine.genericName.toLowerCase().includes(currentSearchTerm))
        );
    }
    
    return filtered;
}

function filterMedicines() {
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    const filteredMedicines = getFilteredMedicines(medicines);
    renderMedicineTable(filteredMedicines);
}

function updateStatistics(medicines) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    let nearExpiryCount = 0;
    let outOfStockCount = 0;
    
    medicines.forEach(medicine => {
        const expiryDate = new Date(medicine.expiryDate);
        if (expiryDate <= thirtyDaysFromNow) {
            nearExpiryCount++;
        }
        
        if (medicine.quantity <= 0) {
            outOfStockCount++;
        }
    });
    
    $('#totalMedicines').text(medicines.length);
    $('#nearExpiry').text(nearExpiryCount);
    $('#outOfStock').text(outOfStockCount);
}

function renderMedicineTable(medicines) {
    const tbody = $('#medicineTableBody');
    const emptyState = $('#emptyState');
    
    if (medicines.length === 0) {
        tbody.html('');
        emptyState.show();
        return;
    }
    
    emptyState.hide();
    
    let tableHTML = '';
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    medicines.forEach(medicine => {
        const expiryDate = new Date(medicine.expiryDate);
        let status = 'safe';
        let statusText = 'Safe';
        let rowClass = '';
        
        if (expiryDate <= now) {
            status = 'expired';
            statusText = 'Expired';
            rowClass = 'expired';
        } else if (expiryDate <= sevenDaysFromNow) {
            status = 'critical';
            statusText = 'Critical';
            rowClass = 'expiring-soon';
        } else if (expiryDate <= thirtyDaysFromNow) {
            status = 'warning';
            statusText = 'Warning';
            rowClass = 'expiring-soon';
        }
        
        tableHTML += `
            <tr class="${rowClass}" data-medicine-id="${medicine.id}">
                <td>
                    <strong>${escapeHtml(medicine.name)}</strong>
                    ${medicine.genericName ? `<br><small class="text-muted">${escapeHtml(medicine.genericName)}</small>` : ''}
                </td>
                <td>${escapeHtml(medicine.batchNumber)}</td>
                <td>
                    <span class="${medicine.quantity <= 10 ? 'text-danger fw-bold' : ''}">
                        ${medicine.quantity}
                    </span>
                </td>
                <td>${formatDate(medicine.expiryDate)}</td>
                <td>
                    <small>Store: ${escapeHtml(medicine.storeNumber)}</small><br>
                    <small>Shelf: ${escapeHtml(medicine.shelfNumber)}</small>
                </td>
                <td>
                    <span class="status-badge status-${status}">${statusText}</span>
                </td>
                <td>UGX ${medicine.unitPrice.toLocaleString()}</td>
                <td>
                    <button class="btn-action btn-view" onclick="viewMedicine('${medicine.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editMedicine('${medicine.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteMedicine('${medicine.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.html(tableHTML);
}

// CSV Import Functions
function validateFile(input) {
    const file = input.files[0];
    if (!file) return;
    
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        showNotification('Please select a CSV or Excel file!', 'danger');
        input.value = '';
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('File size must be less than 10MB!', 'danger');
        input.value = '';
        return;
    }
    
    showNotification('File selected and validated!', 'success');
}

function downloadTemplate() {
    const templateData = [
        ['Medicine Name', 'Batch Number', 'Quantity', 'Expiry Date', 'Store Number', 'Shelf Number', 'Unit Price', 'Manufacturer', 'Medicine Type'],
        ['Panadol 500mg', 'BATCH-2024-001', '100', '2024-12-31', 'STORE-001', 'SHELF-A1', '1500', 'GSK', 'tablet'],
        ['Amoxicillin 250mg', 'BATCH-2024-002', '50', '2024-11-30', 'STORE-001', 'SHELF-B2', '3000', 'Cipla', 'capsule']
    ];
    
    let csvContent = templateData.map(row => 
        row.map(field => `"${field}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pharmacy-stock-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Template downloaded successfully!', 'success');
}

function processImport() {
    const fileInput = $('#csvFile')[0];
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a file to import!', 'danger');
        return;
    }
    
    const importBtn = $('#importBtn');
    const originalText = importBtn.html();
    importBtn.prop('disabled', true);
    importBtn.html('<i class="fas fa-spinner fa-spin me-1"></i>Importing...');
    
    $('#importProgress').show();
    updateProgress(0, 'Reading file...');
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    // Read the file
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            updateProgress(25, 'Validating data...');
            
            let fileContent = e.target.result;
            let parsedData = [];
            
            // Parse CSV file
            if (fileExtension === 'csv') {
                parsedData = parseCSV(fileContent);
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                // For Excel files, we'll treat them as CSV for now
                // In production, you'd use a library like SheetJS
                parsedData = parseCSV(fileContent);
            }
            
            if (parsedData.length === 0) {
                throw new Error('No valid data found in file');
            }
            
            updateProgress(50, 'Processing records...');
            
            // Convert parsed data to medicine objects
            const importedMedicines = [];
            const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
            
            parsedData.forEach((row, index) => {
                // Skip header row if it exists
                if (index === 0 && isHeaderRow(row)) {
                    return;
                }
                
                // Validate row has required fields
                if (!row[0] || !row[1] || !row[2] || !row[3]) {
                    console.warn('Skipping invalid row:', row);
                    return;
                }
                
                const medicine = {
                    id: 'MED-' + Date.now() + '-' + index,
                    name: row[0]?.trim() || 'Unknown',
                    batchNumber: row[1]?.trim() || 'BATCH-' + Date.now(),
                    quantity: parseInt(row[2]) || 0,
                    expiryDate: formatExpiryDate(row[3]),
                    storeNumber: row[4]?.trim() || 'STORE-001',
                    shelfNumber: row[5]?.trim() || 'SHELF-A1',
                    unitPrice: parseFloat(row[6]) || 0,
                    manufacturer: row[7]?.trim() || 'Unknown Manufacturer',
                    type: (row[8]?.trim() || 'tablet').toLowerCase(),
                    sellingPrice: parseFloat(row[6]) * 1.25 || 0, // 25% markup
                    supplier: row[9]?.trim() || '',
                    dateAdded: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    addedBy: currentUser.name || 'System'
                };
                
                importedMedicines.push(medicine);
            });
            
            if (importedMedicines.length === 0) {
                throw new Error('No valid medicines found in file');
            }
            
            updateProgress(75, 'Saving to database...');
            
            // Save imported medicines
            setTimeout(() => {
                const existingMedicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
                const updatedMedicines = [...existingMedicines, ...importedMedicines];
                localStorage.setItem('pharmacy_medicines', JSON.stringify(updatedMedicines));
                
                updateProgress(100, 'Import completed!');
                
                setTimeout(() => {
                    $('#importModal').modal('hide');
                    showNotification(`Stock imported successfully! ${importedMedicines.length} medicine(s) added.`, 'success');
                    addActivity(`Imported ${importedMedicines.length} medicine(s) from ${file.name}`, null);
                    
                    // Reset form and reload data
                    fileInput.value = '';
                    importBtn.html(originalText);
                    importBtn.prop('disabled', false);
                    $('#importProgress').hide();
                    
                    loadInventoryData();
                }, 1000);
            }, 1000);
            
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Error importing file: ' + error.message, 'danger');
            importBtn.html(originalText);
            importBtn.prop('disabled', false);
            $('#importProgress').hide();
        }
    };
    
    reader.onerror = function() {
        showNotification('Error reading file. Please try again.', 'danger');
        importBtn.html(originalText);
        importBtn.prop('disabled', false);
        $('#importProgress').hide();
    };
    
    // Read file as text
    reader.readAsText(file);
}

// Helper function to parse CSV content
function parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Handle CSV with quotes
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim()); // Push last value
        
        result.push(values);
    }
    
    return result;
}

// Helper function to check if row is a header
function isHeaderRow(row) {
    const firstCell = row[0]?.toLowerCase() || '';
    return firstCell.includes('medicine') || firstCell.includes('name') || firstCell.includes('drug');
}

// Helper function to format expiry date
function formatExpiryDate(dateStr) {
    if (!dateStr) return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Try to parse different date formats
    const dateStr2 = dateStr.trim();
    
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr2)) {
        return dateStr2;
    }
    
    // Try parsing other formats
    const date = new Date(dateStr2);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    // Default to 1 year from now if parsing fails
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function updateProgress(percent, text) {
    $('#progressBar').css('width', percent + '%').text(percent + '%');
    $('#progressText').text(text);
}

// Barcode service message
function scanBarcode() {
    const barcodeMessage = `
        <div class="barcode-service-message">
            <i class="fas fa-barcode"></i>
            <h5>Barcode Scanning Service</h5>
            <p>This feature is currently under review by administration.</p>
            <p><small>Expected availability: Q1 2024</small></p>
        </div>
    `;
    
    // Create a temporary modal to show the message
    const tempModal = $(
        '<div class="modal fade" tabindex="-1">' +
        '<div class="modal-dialog modal-sm">' +
        '<div class="modal-content">' +
        '<div class="modal-body text-center py-4">' +
        barcodeMessage +
        '</div>' +
        '<div class="modal-footer">' +
        '<button type="button" class="btn btn-primary w-100" data-bs-dismiss="modal">Understood</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>'
    );
    
    $('body').append(tempModal);
    const modal = new bootstrap.Modal(tempModal[0]);
    modal.show();
    
    tempModal.on('hidden.bs.modal', function() {
        $(this).remove();
    });
}

function clearFilters() {
    $('#searchInput').val('');
    currentSearchTerm = '';
    setTimeFilter('all');
    showNotification('All filters cleared', 'info');
}

// CRUD Operations
function saveMedicine() {
    const medicineId = $('#editMedicineId').val();
    const isEdit = medicineId !== '';
    
    // Validate form
    if (!validateForm()) {
        showNotification('Please fill all required fields correctly!', 'danger');
        return;
    }
    
    // Collect form data
    const medicineData = {
        id: isEdit ? medicineId : 'MED-' + Date.now(),
        name: $('#medicineName').val().trim(),
        type: $('#medicineType').val(),
        manufacturer: $('#manufacturer').val().trim(),
        batchNumber: $('#batchNumber').val().trim(),
        quantity: parseInt($('#quantity').val()),
        unitPrice: parseFloat($('#unitPrice').val()),
        sellingPrice: parseFloat($('#sellingPrice').val()),
        storeNumber: $('#storeNumber').val().trim(),
        shelfNumber: $('#shelfNumber').val().trim(),
        expiryDate: $('#expiryDate').val(),
        supplier: $('#supplier').val().trim(),
        dateAdded: isEdit ? undefined : new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        addedBy: JSON.parse(localStorage.getItem('pharmacy_user') || '{}').name || 'System'
    };
    
    // Save to localStorage
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    
    if (isEdit) {
        // Update existing medicine
        const index = medicines.findIndex(med => med.id === medicineId);
        if (index !== -1) {
            medicineData.dateAdded = medicines[index].dateAdded; // Preserve original date
            medicines[index] = medicineData;
        }
    } else {
        // Add new medicine
        medicines.push(medicineData);
    }
    
    localStorage.setItem('pharmacy_medicines', JSON.stringify(medicines));
    
    // Show success message
    showNotification(`Medicine ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
    
    // Log activity
    addActivity(`${isEdit ? 'Updated' : 'Added'} medicine: ${medicineData.name}`, medicineData.addedBy);
    
    // Reload data and close modal
    loadInventoryData();
    $('#addMedicineModal').modal('hide');
    resetForm();
}

function validateForm() {
    let isValid = true;
    
    // Check all required fields
    $('#medicineForm [required]').each(function() {
        if (!$(this).val().trim()) {
            $(this).addClass('is-invalid');
            isValid = false;
        } else {
            $(this).removeClass('is-invalid');
        }
    });
    
    // Validate expiry date
    const expiryDate = new Date($('#expiryDate').val());
    const today = new Date();
    if (expiryDate <= today) {
        $('#expiryDate').addClass('is-invalid');
        isValid = false;
    }
    
    return isValid;
}

function autoCalculateSellingPrice() {
    const unitPrice = parseFloat($('#unitPrice').val()) || 0;
    const sellingPriceField = $('#sellingPrice');
    
    if (unitPrice > 0 && !sellingPriceField.val()) {
        // Add 25% markup as default
        const sellingPrice = Math.round(unitPrice * 1.25);
        sellingPriceField.val(sellingPrice);
    }
}

function viewMedicine(medicineId) {
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    const medicine = medicines.find(med => med.id === medicineId);
    
    if (!medicine) {
        showNotification('Medicine not found!', 'danger');
        return;
    }
    
    const expiryDate = new Date(medicine.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    let status = 'Safe';
    let statusClass = 'status-safe';
    if (daysUntilExpiry <= 0) {
        status = 'Expired';
        statusClass = 'status-expired';
    } else if (daysUntilExpiry <= 7) {
        status = 'Critical';
        statusClass = 'status-critical';
    } else if (daysUntilExpiry <= 30) {
        status = 'Warning';
        statusClass = 'status-warning';
    }
    
    const detailsHTML = `
        <div class="row">
            <div class="col-md-6">
                <strong>Medicine Name:</strong><br>
                ${escapeHtml(medicine.name)}
            </div>
            <div class="col-md-6">
                <strong>Type:</strong><br>
                ${escapeHtml(medicine.type)}
            </div>
        </div>
        <hr>
        <div class="row">
            <div class="col-md-6">
                <strong>Manufacturer:</strong><br>
                ${escapeHtml(medicine.manufacturer)}
            </div>
            <div class="col-md-6">
                <strong>Batch Number:</strong><br>
                ${escapeHtml(medicine.batchNumber)}
            </div>
        </div>
        <hr>
        <div class="row">
            <div class="col-md-4">
                <strong>Quantity:</strong><br>
                ${medicine.quantity}
            </div>
            <div class="col-md-4">
                <strong>Unit Price:</strong><br>
                UGX ${medicine.unitPrice.toLocaleString()}
            </div>
            <div class="col-md-4">
                <strong>Selling Price:</strong><br>
                UGX ${medicine.sellingPrice.toLocaleString()}
            </div>
        </div>
        <hr>
        <div class="row">
            <div class="col-md-6">
                <strong>Store Location:</strong><br>
                Store: ${escapeHtml(medicine.storeNumber)}<br>
                Shelf: ${escapeHtml(medicine.shelfNumber)}
            </div>
            <div class="col-md-6">
                <strong>Expiry Status:</strong><br>
                <span class="status-badge ${statusClass}">${status}</span><br>
                <small>Expires: ${formatDate(medicine.expiryDate)}</small><br>
                <small>(${daysUntilExpiry > 0 ? daysUntilExpiry + ' days left' : 'Expired'})</small>
            </div>
        </div>
        ${medicine.supplier ? `
        <hr>
        <div class="row">
            <div class="col-12">
                <strong>Supplier:</strong><br>
                ${escapeHtml(medicine.supplier)}
            </div>
        </div>
        ` : ''}
        <hr>
        <div class="row">
            <div class="col-12">
                <small class="text-muted">
                    Added: ${formatDate(medicine.dateAdded)} by ${medicine.addedBy}<br>
                    ${medicine.lastUpdated ? `Last Updated: ${formatDate(medicine.lastUpdated)}` : ''}
                </small>
            </div>
        </div>
    `;
    
    $('#medicineDetails').html(detailsHTML);
    $('#viewMedicineModal').modal('show');
}

function editMedicine(medicineId) {
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    const medicine = medicines.find(med => med.id === medicineId);
    
    if (!medicine) {
        showNotification('Medicine not found!', 'danger');
        return;
    }
    
    // Populate form with medicine data
    $('#editMedicineId').val(medicine.id);
    $('#medicineName').val(medicine.name);
    $('#medicineType').val(medicine.type);
    $('#manufacturer').val(medicine.manufacturer);
    $('#batchNumber').val(medicine.batchNumber);
    $('#quantity').val(medicine.quantity);
    $('#unitPrice').val(medicine.unitPrice);
    $('#sellingPrice').val(medicine.sellingPrice);
    $('#storeNumber').val(medicine.storeNumber);
    $('#shelfNumber').val(medicine.shelfNumber);
    $('#expiryDate').val(medicine.expiryDate);
    $('#supplier').val(medicine.supplier || '');
    
    // Update modal title
    $('#addMedicineModalLabel').html('<i class="fas fa-edit me-2"></i>Edit Medicine');
    
    // Show modal
    $('#addMedicineModal').modal('show');
}

function deleteMedicine(medicineId) {
    if (!confirm('Are you sure you want to delete this medicine? This action cannot be undone.')) {
        return;
    }
    
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    const medicineIndex = medicines.findIndex(med => med.id === medicineId);
    
    if (medicineIndex === -1) {
        showNotification('Medicine not found!', 'danger');
        return;
    }
    
    const medicineName = medicines[medicineIndex].name;
    medicines.splice(medicineIndex, 1);
    
    localStorage.setItem('pharmacy_medicines', JSON.stringify(medicines));
    
    showNotification('Medicine deleted successfully!', 'success');
    addActivity(`Deleted medicine: ${medicineName}`, null);
    
    loadInventoryData();
}

function filterByStatus(status) {
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    const now = new Date();
    
    let filteredMedicines = [];
    
    switch (status) {
        case 'expiring':
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            filteredMedicines = medicines.filter(med => {
                const expiryDate = new Date(med.expiryDate);
                return expiryDate <= thirtyDaysFromNow && expiryDate > now;
            });
            break;
        case 'expired':
            filteredMedicines = medicines.filter(med => {
                const expiryDate = new Date(med.expiryDate);
                return expiryDate <= now;
            });
            break;
        default:
            filteredMedicines = medicines;
    }
    
    renderMedicineTable(filteredMedicines);
    showNotification(`Showing ${status} medicines`, 'info');
}

function exportInventory() {
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    
    if (medicines.length === 0) {
        showNotification('No data to export!', 'warning');
        return;
    }
    
    // Simple CSV export
    let csv = 'Medicine Name,Batch Number,Quantity,Expiry Date,Store,Shelf,Status,Unit Price\n';
    
    medicines.forEach(medicine => {
        const expiryDate = new Date(medicine.expiryDate);
        const now = new Date();
        let status = 'Safe';
        
        if (expiryDate <= now) {
            status = 'Expired';
        } else if (expiryDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
            status = 'Critical';
        } else if (expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            status = 'Warning';
        }
        
        csv += `"${medicine.name}","${medicine.batchNumber}",${medicine.quantity},"${formatDate(medicine.expiryDate)}","${medicine.storeNumber}","${medicine.shelfNumber}","${status}",${medicine.unitPrice}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Inventory exported successfully!', 'success');
    addActivity('Exported inventory data', null);
}

function resetForm() {
    $('#medicineForm')[0].reset();
    $('#editMedicineId').val('');
    $('#addMedicineModalLabel').html('<i class="fas fa-pills me-2"></i>Add New Medicine');
    $('.is-invalid').removeClass('is-invalid');
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message, type) {
    const notification = $(
        '<div class="toast align-items-center text-white bg-' + (type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'info') + ' border-0 position-fixed top-0 end-0 m-3" role="alert">' +
        '<div class="d-flex">' +
        '<div class="toast-body">' +
        '<i class="fas fa-' + (type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle') + ' me-2"></i>' +
        message +
        '</div>' +
        '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>' +
        '</div>' +
        '</div>'
    );
    
    $('body').append(notification);
    const toast = new bootstrap.Toast(notification[0]);
    toast.show();
    
    notification.on('hidden.bs.toast', function() {
        $(this).remove();
    });
}

function addActivity(description, user) {
    const activities = JSON.parse(localStorage.getItem('pharmacy_activities') || '[]');
    const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    
    activities.push({
        description: description,
        user: user || userData.name || 'System',
        timestamp: new Date().toISOString()
    });

    if (activities.length > 50) {
        activities.splice(0, activities.length - 50);
    }

    localStorage.setItem('pharmacy_activities', JSON.stringify(activities));
}

function loadNotifications() {
    const notifications = JSON.parse(localStorage.getItem('pharmacy_notifications') || '[]');
    const notificationList = $('#notificationList');
    const notificationCount = $('#notificationCount');

    const expiryAlerts = notifications.filter(notif => 
        notif.type === 'expiry_alert' && !notif.read
    );

    notificationCount.text(expiryAlerts.length);

    if (expiryAlerts.length === 0) {
        notificationList.html(
            '<div class="dropdown-item text-center text-muted">' +
            '<small>No expiry alerts</small>' +
            '</div>'
        );
        return;
    }

    let notificationHTML = '';
    expiryAlerts.slice(0, 5).forEach(alert => {
        const alertClass = alert.priority === 'critical' ? 'danger' : 'warning';
        notificationHTML += 
            '<a class="dropdown-item" href="#">' +
            '<div class="d-flex align-items-center">' +
            '<div class="bg-' + alertClass + ' rounded p-1 me-2">' +
            '<i class="fas fa-exclamation-triangle text-white"></i>' +
            '</div>' +
            '<div>' +
            '<small class="fw-bold">' + alert.title + '</small>' +
            '<br><small class="text-muted">' + formatDate(alert.timestamp) + '</small>' +
            '</div>' +
            '</div>' +
            '</a>';
    });

    notificationList.html(notificationHTML);
}

// Navigation functions
function showProfile() {
    showNotification('Profile management will be implemented', 'info');
}

function showSettings() {
    showNotification('System settings will be implemented', 'info');
}

function showAlertCentre() {
    showNotification('Alert centre will be implemented', 'info');
}

function showReports() {
    showNotification('Reports will be implemented', 'info');
}

function showStaffManagement() {
    showNotification('Staff management will be implemented', 'info');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        showNotification('Logging out...', 'info');
        setTimeout(function() {
            alert('Logout successful. Redirecting to login page...');
        }, 1000);
    }
}