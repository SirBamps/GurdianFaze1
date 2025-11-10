// Guardian Health Pharmacy - Alert Centre Management
// Polished and fully coordinated with inventory

$(document).ready(function() {
    console.log("🚨 Alert Centre System Initialized");
    
    initializeAlertCentre();
    loadAlertData();
    setupAlertEventListeners();
});

let currentAlertFilter = 'all';
let currentAlerts = [];

function initializeAlertCentre() {
    const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    $('#userName').text(userData.name || 'Admin User');
    
    console.log("✅ Alert Centre ready - Connected to inventory data");
}

function setupAlertEventListeners() {
    // Search functionality for future implementation
    $('#alertSearch').on('input', function() {
        filterAlertsBySearch($(this).val());
    });
    
    // Refresh button
    $('.alert-actions .btn').on('click', function() {
        if ($(this).text().includes('Refresh')) {
            refreshAlerts();
        }
    });
}

function loadAlertData() {
    console.log("📊 Loading alert data from inventory...");
    
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    
    // Generate alerts from medicine data
    generateAlertsFromMedicines(medicines);
    
    // Update statistics
    updateAlertStatistics();
    
    // Render alerts based on current filter
    renderAlerts();
    
    // Update notification count in header
    updateHeaderNotifications();
    
    console.log(`✅ Loaded ${currentAlerts.length} alerts from ${medicines.length} medicines`);
}

function generateAlertsFromMedicines(medicines) {
    currentAlerts = [];
    const now = new Date();
    
    medicines.forEach(medicine => {
        const expiryDate = new Date(medicine.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        let alertType = '';
        let priority = '';
        
        if (expiryDate <= now) {
            alertType = 'expired';
            priority = 'critical';
        } else if (daysUntilExpiry <= 7) {
            alertType = 'critical';
            priority = 'high';
        } else if (daysUntilExpiry <= 30) {
            alertType = 'warning';
            priority = 'medium';
        } else {
            return; // No alert needed for safe medicines
        }
        
        const alert = {
            id: 'ALERT-' + medicine.id + '-' + Date.now(),
            medicineId: medicine.id,
            medicineName: medicine.name,
            batchNumber: medicine.batchNumber,
            expiryDate: medicine.expiryDate,
            daysUntilExpiry: daysUntilExpiry,
            quantity: medicine.quantity,
            storeNumber: medicine.storeNumber,
            shelfNumber: medicine.shelfNumber,
            unitPrice: medicine.unitPrice,
            manufacturer: medicine.manufacturer,
            medicineType: medicine.type,
            alertType: alertType,
            priority: priority,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'System'
        };
        
        currentAlerts.push(alert);
    });
    
    // Save alerts to localStorage for persistence
    saveAlertsToStorage();
}

function saveAlertsToStorage() {
    localStorage.setItem('pharmacy_alerts', JSON.stringify(currentAlerts));
}

function loadAlertsFromStorage() {
    return JSON.parse(localStorage.getItem('pharmacy_alerts') || '[]');
}

function updateAlertStatistics() {
    const criticalCount = currentAlerts.filter(alert => alert.alertType === 'critical' && alert.status === 'active').length;
    const warningCount = currentAlerts.filter(alert => alert.alertType === 'warning' && alert.status === 'active').length;
    const expiredCount = currentAlerts.filter(alert => alert.alertType === 'expired' && alert.status === 'active').length;
    const resolvedCount = currentAlerts.filter(alert => alert.status === 'resolved').length;
    
    // Update statistics cards
    $('#criticalAlerts').text(criticalCount);
    $('#warningAlerts').text(warningCount);
    $('#expiredAlerts').text(expiredCount);
    $('#resolvedAlerts').text(resolvedCount);
    
    // Update section headers
    $('#criticalCount').text(criticalCount);
    $('#warningCount').text(warningCount);
    $('#expiredCount').text(expiredCount);
    
    // Update notification badge
    updateHeaderNotifications();
}

function updateHeaderNotifications() {
    const totalActiveAlerts = currentAlerts.filter(alert => alert.status === 'active').length;
    $('#notificationCount').text(totalActiveAlerts);
}

function renderAlerts() {
    const activeAlerts = currentAlerts.filter(alert => alert.status === 'active');
    
    renderAlertSection('critical', activeAlerts.filter(alert => alert.alertType === 'critical'));
    renderAlertSection('warning', activeAlerts.filter(alert => alert.alertType === 'warning'));
    renderAlertSection('expired', activeAlerts.filter(alert => alert.alertType === 'expired'));
    
    // Show empty state if no active alerts
    if (activeAlerts.length === 0) {
        $('#emptyAlertsState').show();
        $('.alert-section').hide();
    } else {
        $('#emptyAlertsState').hide();
        // Show sections based on current filter
        applyCurrentFilter();
    }
}

function renderAlertSection(sectionType, alerts) {
    const container = $(`#${sectionType}AlertsContainer`);
    
    if (alerts.length === 0) {
        container.html(`
            <div class="text-center text-muted py-4">
                <i class="fas fa-check-circle fa-2x mb-2"></i>
                <p>No ${sectionType} alerts</p>
                <small class="text-muted">All ${sectionType} items are managed</small>
            </div>
        `);
        return;
    }
    
    let alertsHTML = '';
    
    alerts.forEach(alert => {
        const daysText = alert.daysUntilExpiry > 0 ? 
            `${alert.daysUntilExpiry} days` : 
            '<strong class="text-danger">EXPIRED</strong>';
            
        const progressWidth = Math.max(0, Math.min(100, (alert.daysUntilExpiry / 30) * 100));
        const riskValue = alert.quantity * alert.unitPrice;
        
        alertsHTML += `
            <div class="alert-card ${sectionType}" data-alert-id="${alert.id}" data-medicine-id="${alert.medicineId}">
                <div class="urgency-indicator"></div>
                <div class="alert-header-row">
                    <div class="alert-title">${escapeHtml(alert.medicineName)}</div>
                    <span class="alert-badge badge-${sectionType}">
                        ${sectionType.toUpperCase()}
                    </span>
                </div>
                
                <div class="alert-details">
                    <div class="alert-detail">
                        <span class="label">Batch Number:</span>
                        <span class="value">${escapeHtml(alert.batchNumber)}</span>
                    </div>
                    <div class="alert-detail">
                        <span class="label">Manufacturer:</span>
                        <span class="value">${escapeHtml(alert.manufacturer || 'N/A')}</span>
                    </div>
                    <div class="alert-detail">
                        <span class="label">Expiry Date:</span>
                        <span class="value">${formatDate(alert.expiryDate)}</span>
                    </div>
                    <div class="alert-detail">
                        <span class="label">Time Left:</span>
                        <span class="value ${alert.daysUntilExpiry <= 0 ? 'text-danger fw-bold' : ''}">
                            ${daysText}
                        </span>
                    </div>
                    <div class="alert-detail">
                        <span class="label">Location:</span>
                        <span class="value">${escapeHtml(alert.storeNumber)} / ${escapeHtml(alert.shelfNumber)}</span>
                    </div>
                    <div class="alert-detail">
                        <span class="label">Quantity:</span>
                        <span class="value">${alert.quantity} units</span>
                    </div>
                    <div class="alert-detail">
                        <span class="label">Risk Value:</span>
                        <span class="value text-danger">UGX ${riskValue.toLocaleString()}</span>
                    </div>
                </div>
                
                ${sectionType !== 'expired' ? `
                <div class="expiry-progress">
                    <div class="progress-bar-${sectionType}" style="width: ${100 - progressWidth}%"></div>
                </div>
                ` : ''}
                
                <div class="alert-actions">
                    <button class="btn-alert btn-alert-resolve" onclick="resolveAlert('${alert.id}')">
                        <i class="fas fa-check me-1"></i>Mark Resolved
                    </button>
                    <button class="btn-alert btn-alert-view" onclick="viewMedicineInInventory('${alert.medicineId}')">
                        <i class="fas fa-eye me-1"></i>View Stock
                    </button>
                    <button class="btn-alert btn-alert-remove" onclick="removeMedicineFromShelves('${alert.medicineId}')">
                        <i class="fas fa-trash me-1"></i>Remove
                    </button>
                </div>
            </div>
        `;
    });
    
    container.html(alertsHTML);
}

function applyCurrentFilter() {
    if (currentAlertFilter === 'all') {
        $('.alert-section').show();
    } else {
        $('.alert-section').hide();
        $(`.${currentAlertFilter}-alerts`).show();
    }
}

function filterAlerts(filterType) {
    currentAlertFilter = filterType;
    
    // Update active button states
    $('.filter-tabs .btn').removeClass('active');
    $(`.filter-tabs .btn:contains(${filterType.charAt(0).toUpperCase() + filterType.slice(1)})`).addClass('active');
    
    applyCurrentFilter();
    
    const filterText = {
        'all': 'All Alerts',
        'critical': 'Critical Alerts',
        'warning': 'Warning Alerts', 
        'expired': 'Expired Items',
        'resolved': 'Resolved Alerts'
    }[filterType];
    
    showNotification(`Showing ${filterText}`, 'info');
}

function filterAlertsBySearch(searchTerm) {
    // Future implementation for search functionality
    console.log("Search functionality to be implemented:", searchTerm);
}

// Alert Action Functions
function resolveAlert(alertId) {
    const alertIndex = currentAlerts.findIndex(alert => alert.id === alertId);
    
    if (alertIndex !== -1) {
        currentAlerts[alertIndex].status = 'resolved';
        currentAlerts[alertIndex].resolvedAt = new Date().toISOString();
        currentAlerts[alertIndex].resolvedBy = JSON.parse(localStorage.getItem('pharmacy_user') || '{}').name || 'System';
        
        saveAlertsToStorage();
        
        showNotification(`Alert resolved for ${currentAlerts[alertIndex].medicineName}`, 'success');
        addActivity(`Resolved alert for: ${currentAlerts[alertIndex].medicineName}`, null);
        
        refreshAlerts();
    }
}

function viewMedicineInInventory(medicineId) {
    // Save medicine ID to highlight in inventory
    localStorage.setItem('highlightMedicine', medicineId);
    
    // Navigate to inventory page
    window.location.href = 'inventory.html';
}

function removeMedicineFromShelves(medicineId) {
    if (!confirm('Are you sure you want to remove this medicine from shelves? This will delete it from inventory.')) {
        return;
    }
    
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    const medicineIndex = medicines.findIndex(med => med.id === medicineId);
    
    if (medicineIndex !== -1) {
        const medicineName = medicines[medicineIndex].name;
        medicines.splice(medicineIndex, 1);
        localStorage.setItem('pharmacy_medicines', JSON.stringify(medicines));
        
        // Also resolve any alerts for this medicine
        currentAlerts = currentAlerts.filter(alert => alert.medicineId !== medicineId);
        saveAlertsToStorage();
        
        showNotification(`${medicineName} removed from inventory`, 'success');
        addActivity(`Removed medicine from shelves: ${medicineName}`, null);
        
        refreshAlerts();
    }
}

// Bulk Actions
function sendBulkAlerts() {
    const criticalAlerts = currentAlerts.filter(alert => alert.alertType === 'critical' && alert.status === 'active');
    
    if (criticalAlerts.length === 0) {
        showNotification('No critical alerts to send', 'warning');
        return;
    }
    
    showNotification(`Sending ${criticalAlerts.length} critical alerts to staff...`, 'info');
    
    // Simulate sending alerts
    setTimeout(() => {
        showNotification(`Bulk alerts sent to ${criticalAlerts.length} staff members`, 'success');
        addActivity('Sent bulk critical alerts to staff', null);
    }, 2000);
}

function clearAllAlerts() {
    const activeAlerts = currentAlerts.filter(alert => alert.status === 'active');
    
    if (activeAlerts.length === 0) {
        showNotification('No active alerts to clear', 'info');
        return;
    }
    
    if (!confirm(`Are you sure you want to mark all ${activeAlerts.length} active alerts as resolved?`)) {
        return;
    }
    
    currentAlerts.forEach(alert => {
        if (alert.status === 'active') {
            alert.status = 'resolved';
            alert.resolvedAt = new Date().toISOString();
            alert.resolvedBy = JSON.parse(localStorage.getItem('pharmacy_user') || '{}').name || 'System';
        }
    });
    
    saveAlertsToStorage();
    
    showNotification(`All ${activeAlerts.length} alerts marked as resolved`, 'success');
    addActivity('Cleared all active alerts', null);
    refreshAlerts();
}

function refreshAlerts() {
    showNotification('Refreshing alerts data...', 'info');
    loadAlertData();
    
    setTimeout(() => {
        showNotification('Alerts data refreshed', 'success');
    }, 1000);
}

function exportAlerts() {
    if (currentAlerts.length === 0) {
        showNotification('No alerts to export', 'warning');
        return;
    }
    
    let csv = 'Medicine Name,Batch Number,Expiry Date,Days Left,Alert Type,Status,Location,Quantity,Risk Value\n';
    
    currentAlerts.forEach(alert => {
        const daysLeft = alert.daysUntilExpiry > 0 ? alert.daysUntilExpiry : 'EXPIRED';
        const riskValue = alert.quantity * alert.unitPrice;
        
        csv += `"${alert.medicineName}","${alert.batchNumber}","${formatDate(alert.expiryDate)}","${daysLeft}","${alert.alertType}","${alert.status}","${alert.storeNumber}/${alert.shelfNumber}","${alert.quantity}","UGX ${riskValue.toLocaleString()}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Alerts exported successfully!', 'success');
    addActivity('Exported alerts report', null);
}

function checkInventoryForAlerts() {
    showNotification('Scanning inventory for new alerts...', 'info');
    
    setTimeout(() => {
        loadAlertData();
        showNotification('Inventory scan completed', 'success');
    }, 1500);
}

// Bulk Action Modal Functions
function resolveAllCritical() {
    const criticalAlerts = currentAlerts.filter(alert => alert.alertType === 'critical' && alert.status !== 'resolved');
    
    if (criticalAlerts.length === 0) {
        showNotification('No critical alerts to resolve', 'info');
        return;
    }
    
    criticalAlerts.forEach(alert => {
        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
        alert.resolvedBy = JSON.parse(localStorage.getItem('pharmacy_user') || '{}').name || 'System';
    });
    
    saveAlertsToStorage();
    
    showNotification(`Resolved ${criticalAlerts.length} critical alerts`, 'success');
    addActivity('Resolved all critical alerts in bulk', null);
    refreshAlerts();
    $('#bulkActionsModal').modal('hide');
}

function notifyAllStaff() {
    const activeAlerts = currentAlerts.filter(alert => alert.status === 'active');
    
    if (activeAlerts.length === 0) {
        showNotification('No active alerts to notify', 'info');
        return;
    }
    
    showNotification(`Sending notifications for ${activeAlerts.length} alerts to all staff...`, 'info');
    
    setTimeout(() => {
        showNotification('All staff members notified successfully', 'success');
        addActivity('Sent notifications to all staff', null);
        $('#bulkActionsModal').modal('hide');
    }, 2000);
}

function generateBulkDisposal() {
    const expiredAlerts = currentAlerts.filter(alert => alert.alertType === 'expired' && alert.status !== 'resolved');
    
    if (expiredAlerts.length === 0) {
        showNotification('No expired items for disposal report', 'info');
        return;
    }
    
    showNotification(`Generating disposal report for ${expiredAlerts.length} expired items...`, 'info');
    
    // Create disposal report content
    let reportContent = `GUARDIAN HEALTH PHARMACY - DISPOSAL REPORT\n`;
    reportContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    reportContent += `EXPIRED ITEMS FOR DISPOSAL:\n\n`;
    
    expiredAlerts.forEach((alert, index) => {
        reportContent += `${index + 1}. ${alert.medicineName} (Batch: ${alert.batchNumber})\n`;
        reportContent += `   Quantity: ${alert.quantity} units\n`;
        reportContent += `   Expired: ${formatDate(alert.expiryDate)}\n`;
        reportContent += `   Location: ${alert.storeNumber}/${alert.shelfNumber}\n\n`;
    });
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disposal-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification(`Bulk disposal report generated for ${expiredAlerts.length} items`, 'success');
    addActivity('Generated bulk disposal report', null);
    $('#bulkActionsModal').modal('hide');
}

function scheduleStockCheck() {
    showNotification('Scheduling comprehensive stock check...', 'info');
    
    setTimeout(() => {
        showNotification('Stock check scheduled for next business day', 'success');
        addActivity('Scheduled comprehensive stock check', null);
        $('#bulkActionsModal').modal('hide');
    }, 1500);
}

// Utility Functions
function escapeHtml(text) {
    if (!text) return '';
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

// Navigation functions
function showProfile() {
    showNotification('Profile management will be implemented', 'info');
}

function showSettings() {
    showNotification('System settings will be implemented', 'info');
}

function showReports() {
    window.location.href = 'reports.html';
}

function showStaffManagement() {
    window.location.href = 'staff.html';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        showNotification('Logging out...', 'info');
        setTimeout(function() {
            alert('Logout successful. Redirecting to login page...');
        }, 1000);
    }
}

// Auto-refresh alerts every 3 minutes
setInterval(function() {
    loadAlertData();
}, 180000);