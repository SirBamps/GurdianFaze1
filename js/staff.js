// Guardian Health Pharmacy - Staff Management System
// FIXED: Now properly stores and retrieves staff data

$(document).ready(function() {
    console.log("👥 Staff Management System Initialized");
    
    initializeStaffManagement();
    loadStaffData();
    setupEventListeners();
});

let staffData = [];
let currentEditingId = null;

function initializeStaffManagement() {
    // Load user data
    const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    $('#userName').text(userData.name || 'Admin User');
    
    // Initialize default staff if none exists
    initializeDefaultStaff();
    
    console.log("✅ Staff management system ready");
}

function initializeDefaultStaff() {
    const existingStaff = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    
    if (existingStaff.length === 0) {
        // Create default admin account
        const defaultStaff = [
            {
                id: 1,
                name: "Isimbi Gloria",
                email: "admin@guardianpharmacy.com",
                role: "admin",
                phone: "+256700000000",
                status: "active",
                permissions: {
                    inventory: true,
                    alerts: true,
                    reports: true,
                    staff: true
                },
                password: "admin123",
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            }
        ];
        
        localStorage.setItem('pharmacy_staff', JSON.stringify(defaultStaff));
        console.log("✅ Default admin staff created");
    }
}

function setupEventListeners() {
    // Search functionality
    $('#staffSearch').on('input', filterStaffTable);
    $('#roleFilter').on('change', filterStaffTable);
    $('#statusFilter').on('change', filterStaffTable);
    
    // Form validation
    $('#createStaffForm').on('submit', function(e) {
        e.preventDefault();
        createStaffAccount();
    });
    
    $('#editStaffForm').on('submit', function(e) {
        e.preventDefault();
        updateStaffAccount();
    });
    
    $('#changePasswordForm').on('submit', function(e) {
        e.preventDefault();
        updateStaffPassword();
    });
    
    // Password strength indicator
    $('#staffPassword, #newPassword').on('input', function() {
        checkPasswordStrength($(this).val(), $(this).attr('id'));
    });
    
    // Auto-generate staff ID
    $('#staffName').on('blur', function() {
        autoGenerateEmail();
    });
}

function loadStaffData() {
    staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    console.log(`📊 Loaded ${staffData.length} staff members`);
    updateStaffTable();
    updateStaffStats();
}

function updateStaffTable() {
    const tbody = $('#staffTableBody');
    tbody.empty();
    
    if (staffData.length === 0) {
        $('#staffTable').addClass('d-none');
        $('#emptyState').removeClass('d-none');
        return;
    }
    
    $('#staffTable').removeClass('d-none');
    $('#emptyState').addClass('d-none');
    
    staffData.forEach(staff => {
        const row = createStaffRow(staff);
        tbody.append(row);
    });
}

function createStaffRow(staff) {
    const statusBadge = staff.status === 'active' 
        ? '<span class="badge bg-success status-badge">Active</span>'
        : '<span class="badge bg-secondary status-badge">Inactive</span>';
    
    const roleBadge = staff.role === 'admin' 
        ? '<span class="badge role-badge badge-admin">Administrator</span>'
        : '<span class="badge role-badge badge-pharmacist">Pharmacist</span>';
    
    const lastLogin = staff.lastLogin 
        ? new Date(staff.lastLogin).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : 'Never';
    
    return `
        <tr class="staff-row" data-staff-id="${staff.id}">
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                        ${getInitials(staff.name)}
                    </div>
                    <div>
                        <div class="fw-bold">${escapeHtml(staff.name)}</div>
                        <small class="text-muted">ID: STF${staff.id.toString().padStart(3, '0')}</small>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(staff.email)}</td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td>${lastLogin}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary btn-action" onclick="editStaff(${staff.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-info btn-action" onclick="changePassword(${staff.id})" title="Change Password">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-outline-warning btn-action" onclick="toggleStaffStatus(${staff.id})" title="${staff.status === 'active' ? 'Deactivate' : 'Activate'}">
                        <i class="fas ${staff.status === 'active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-action" onclick="deleteStaff(${staff.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function updateStaffStats() {
    const totalStaff = staffData.length;
    const activeStaff = staffData.filter(staff => staff.status === 'active').length;
    const adminCount = staffData.filter(staff => staff.role === 'admin').length;
    const pharmacistCount = staffData.filter(staff => staff.role === 'pharmacist').length;
    
    $('#totalStaffCount').text(totalStaff);
    $('#activeStaffCount').text(activeStaff);
    $('#adminCount').text(adminCount);
    $('#pharmacistCount').text(pharmacistCount);
}

function filterStaffTable() {
    const searchTerm = $('#staffSearch').val().toLowerCase();
    const roleFilter = $('#roleFilter').val();
    const statusFilter = $('#statusFilter').val();
    
    const filteredData = staffData.filter(staff => {
        const matchesSearch = staff.name.toLowerCase().includes(searchTerm) || 
                             staff.email.toLowerCase().includes(searchTerm);
        const matchesRole = !roleFilter || staff.role === roleFilter;
        const matchesStatus = !statusFilter || staff.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    const tbody = $('#staffTableBody');
    tbody.empty();
    
    if (filteredData.length === 0) {
        $('#staffTable').addClass('d-none');
        $('#emptyState').removeClass('d-none');
        return;
    }
    
    $('#staffTable').removeClass('d-none');
    $('#emptyState').addClass('d-none');
    
    filteredData.forEach(staff => {
        const row = createStaffRow(staff);
        tbody.append(row);
    });
}

// Modal Management Functions
function showCreateStaffForm() {
    $('#createStaffForm')[0].reset();
    $('.password-strength').remove();
    $('#createStaffModal').modal('show');
}

function createStaffAccount() {
    const form = $('#createStaffForm')[0];
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const name = $('#staffName').val().trim();
    const email = $('#staffEmail').val().trim();
    const role = $('#staffRole').val();
    const phone = $('#staffPhone').val().trim();
    const password = $('#staffPassword').val();
    const confirmPassword = $('#staffConfirmPassword').val();
    
    // Validate password
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'danger');
        return;
    }
    
    if (!validatePassword(password)) {
        showNotification('Password must be at least 8 characters with letters and numbers', 'danger');
        return;
    }
    
    // Check if email already exists
    if (staffData.some(staff => staff.email.toLowerCase() === email.toLowerCase())) {
        showNotification('Email address already exists!', 'danger');
        return;
    }
    
    const newStaff = {
        id: generateStaffId(),
        name: name,
        email: email,
        role: role,
        phone: phone,
        status: 'active',
        permissions: {
            inventory: $('#permissionInventory').is(':checked'),
            alerts: $('#permissionAlerts').is(':checked'),
            reports: $('#permissionReports').is(':checked')
        },
        password: password,
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    staffData.push(newStaff);
    saveStaffData();
    $('#createStaffModal').modal('hide');
    showNotification(`Staff account created successfully for ${name}`, 'success');
    addActivity(`Created staff account for ${name} (${role})`, null);
}

function generateStaffId() {
    const maxId = staffData.reduce((max, staff) => Math.max(max, staff.id), 0);
    return maxId + 1;
}

function validatePassword(password) {
    const minLength = 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return password.length >= minLength && hasLetter && hasNumber;
}

function checkPasswordStrength(password, fieldId) {
    let strengthIndicator = $(`#${fieldId}`).next('.password-strength');
    if (strengthIndicator.length === 0) {
        $(`#${fieldId}`).after('<div class="password-strength"></div>');
        strengthIndicator = $(`#${fieldId}`).next('.password-strength');
    }
    
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    strengthIndicator.removeClass('strength-weak strength-fair strength-good strength-strong');
    
    if (password.length === 0) {
        strengthIndicator.css('width', '0');
        return;
    }
    
    const width = (strength / 5) * 100;
    strengthIndicator.css('width', width + '%');
    
    switch(strength) {
        case 1:
        case 2:
            strengthIndicator.addClass('strength-weak');
            break;
        case 3:
            strengthIndicator.addClass('strength-fair');
            break;
        case 4:
            strengthIndicator.addClass('strength-good');
            break;
        case 5:
            strengthIndicator.addClass('strength-strong');
            break;
    }
}

function autoGenerateEmail() {
    const name = $('#staffName').val().trim();
    const emailField = $('#staffEmail');
    
    if (name && !emailField.val()) {
        const baseEmail = name.toLowerCase().replace(/\s+/g, '.') + '@guardianpharmacy.com';
        emailField.val(baseEmail);
    }
}

function editStaff(staffId) {
    const staff = staffData.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found!', 'danger');
        return;
    }
    
    currentEditingId = staffId;
    
    $('#editStaffId').val(staff.id);
    $('#editStaffName').val(staff.name);
    $('#editStaffEmail').val(staff.email);
    $('#editStaffRole').val(staff.role);
    $('#editStaffStatus').val(staff.status);
    $('#editStaffPhone').val(staff.phone || '');
    
    // Set permissions
    $('#editPermissionInventory').prop('checked', staff.permissions.inventory);
    $('#editPermissionAlerts').prop('checked', staff.permissions.alerts);
    $('#editPermissionReports').prop('checked', staff.permissions.reports);
    
    $('#editStaffModal').modal('show');
}

function updateStaffAccount() {
    const form = $('#editStaffForm')[0];
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const staffIndex = staffData.findIndex(s => s.id === currentEditingId);
    if (staffIndex === -1) {
        showNotification('Staff member not found!', 'danger');
        return;
    }
    
    const staff = staffData[staffIndex];
    
    // Check if email already exists (excluding current staff)
    const email = $('#editStaffEmail').val().trim();
    if (staffData.some(s => s.email.toLowerCase() === email.toLowerCase() && s.id !== currentEditingId)) {
        showNotification('Email address already exists!', 'danger');
        return;
    }
    
    staff.name = $('#editStaffName').val().trim();
    staff.email = email;
    staff.role = $('#editStaffRole').val();
    staff.status = $('#editStaffStatus').val();
    staff.phone = $('#editStaffPhone').val().trim();
    
    staff.permissions = {
        inventory: $('#editPermissionInventory').is(':checked'),
        alerts: $('#editPermissionAlerts').is(':checked'),
        reports: $('#editPermissionReports').is(':checked')
    };
    
    saveStaffData();
    $('#editStaffModal').modal('hide');
    showNotification(`Staff account updated successfully for ${staff.name}`, 'success');
    addActivity(`Updated staff account for ${staff.name}`, null);
}

function changePassword(staffId) {
    const staff = staffData.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found!', 'danger');
        return;
    }
    
    $('#passwordStaffId').val(staffId);
    $('#changePasswordForm')[0].reset();
    $('.password-strength').remove();
    $('#changePasswordModal').modal('show');
}

function updateStaffPassword() {
    const form = $('#changePasswordForm')[0];
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const staffId = parseInt($('#passwordStaffId').val());
    const newPassword = $('#newPassword').val();
    const confirmPassword = $('#confirmNewPassword').val();
    
    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match!', 'danger');
        return;
    }
    
    if (!validatePassword(newPassword)) {
        showNotification('Password must be at least 8 characters with letters and numbers', 'danger');
        return;
    }
    
    const staffIndex = staffData.findIndex(s => s.id === staffId);
    if (staffIndex === -1) {
        showNotification('Staff member not found!', 'danger');
        return;
    }
    
    staffData[staffIndex].password = newPassword;
    
    saveStaffData();
    $('#changePasswordModal').modal('hide');
    showNotification('Password updated successfully', 'success');
    addActivity(`Updated password for staff ID: STF${staffId.toString().padStart(3, '0')}`, null);
}

function toggleStaffStatus(staffId) {
    const staff = staffData.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found!', 'danger');
        return;
    }
    
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    if (confirm(`Are you sure you want to ${action} ${staff.name}?`)) {
        staff.status = newStatus;
        saveStaffData();
        showNotification(`Staff account ${action}d successfully`, 'success');
        addActivity(`${action.charAt(0).toUpperCase() + action.slice(1)}d staff account for ${staff.name}`, null);
    }
}

function deleteStaff(staffId) {
    const staff = staffData.find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff member not found!', 'danger');
        return;
    }
    
    // Prevent deleting own account
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    if (staff.email === currentUser.email) {
        showNotification('You cannot delete your own account!', 'danger');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${staff.name}'s account? This action cannot be undone.`)) {
        staffData = staffData.filter(s => s.id !== staffId);
        saveStaffData();
        showNotification('Staff account deleted successfully', 'success');
        addActivity(`Deleted staff account for ${staff.name}`, null);
    }
}

// FIXED: This function now properly saves data
function saveStaffData() {
    localStorage.setItem('pharmacy_staff', JSON.stringify(staffData));
    loadStaffData(); // Refresh the table and stats
    console.log(`💾 Saved ${staffData.length} staff members to localStorage`);
}

function exportStaffData() {
    if (staffData.length === 0) {
        showNotification('No staff data to export', 'warning');
        return;
    }
    
    showNotification('Exporting staff data...', 'info');
    
    // Create CSV content
    let csvContent = "ID,Name,Email,Role,Status,Phone,Last Login,Created Date\n";
    staffData.forEach(staff => {
        const lastLogin = staff.lastLogin 
            ? new Date(staff.lastLogin).toLocaleDateString()
            : 'Never';
        const createdDate = new Date(staff.createdAt).toLocaleDateString();
        
        csvContent += `STF${staff.id.toString().padStart(3, '0')},"${staff.name}","${staff.email}","${staff.role}","${staff.status}","${staff.phone || ''}","${lastLogin}","${createdDate}"\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Staff data exported successfully', 'success');
    addActivity('Exported staff data to CSV', null);
}

function refreshStaffData() {
    showNotification('Refreshing staff data...', 'info');
    loadStaffData();
    setTimeout(() => {
        showNotification('Staff data refreshed', 'success');
    }, 500);
}

// Utility Functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        showNotification('Logging out...', 'info');
        setTimeout(function() {
            alert('Logout successful. Redirecting to login page...');
        }, 1000);
    }
}

// Auto-refresh data every 2 minutes
setInterval(function() {
    loadStaffData();
}, 120000);