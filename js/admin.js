// Guardian Health Pharmacy - Polished Admin Dashboard
$(document).ready(function() {
    console.log("🚀 Guardian Health Pharmacy Dashboard Initialized");
    
    initializeSystem();
    setupEventListeners();
});

function initializeSystem() {
    // Check if user is properly logged in
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    if (!currentUser.isLoggedIn) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return;
    }
    initializeStorage();
    loadDashboardData();
    updateSystemStatus();
    console.log("✅ Admin dashboard ready");
}

function initializeStorage() {
    const defaultData = {
        user: { 
            name: "Isimbi Gloria", 
            role: "admin",
            email: "admin@guardianpharmacy.com",
            password: "admin123"
        },
        medicines: [],
        activities: [],
        notifications: [],
        settings: { complianceChecks: true, autoAlerts: true }
    };

    $.each(defaultData, function(key, value) {
        if (!localStorage.getItem('pharmacy_' + key)) {
            localStorage.setItem('pharmacy_' + key, JSON.stringify(value));
        }
    });
}

function loadDashboardData() {
    const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    $('#userName').text(userData.name || 'Admin User');

    updateStatistics();
    loadRecentActivities();
    loadNotifications();
    updateLastUpdateTime();
}

function updateStatistics() {
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    const now = new Date();
    
    let criticalCount = 0;
    let warningCount = 0;
    let safeCount = 0;
    let totalValue = 0;
    const batchMap = {};

    $.each(medicines, function(index, med) {
        const expiryDate = new Date(med.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
            criticalCount++;
        } else if (daysUntilExpiry <= 30 && daysUntilExpiry > 7) {
            warningCount++;
        } else if (daysUntilExpiry > 30) {
            safeCount++;
        }

        // Count unique batches
        if (!batchMap[med.batchNumber]) {
            batchMap[med.batchNumber] = true;
        }

        // Calculate total value
        totalValue += (med.quantity || 0) * (med.unitPrice || 0);
    });

    // Update UI with real data
    $('#criticalCount').text(criticalCount);
    $('#warningCount').text(warningCount);
    $('#totalMedicines').text(medicines.length);
    
    // Update progress bars
    const totalItems = Math.max(medicines.length, 1);
    $('#criticalProgress').css('width', ((criticalCount / totalItems) * 100) + '%');
    $('#warningProgress').css('width', ((warningCount / totalItems) * 100) + '%');
    $('#safeProgress').css('width', ((safeCount / totalItems) * 100) + '%');
    
    // Update badges
    $('#criticalBadge').text(criticalCount + ' Item' + (criticalCount !== 1 ? 's' : ''));
    $('#warningBadge').text(warningCount + ' Item' + (warningCount !== 1 ? 's' : ''));
    $('#safeBadge').text(safeCount + ' Item' + (safeCount !== 1 ? 's' : ''));

    // Calculate compliance score
    const complianceScore = medicines.length > 0 ? Math.max(0, 100 - (criticalCount * 10)) : 0;
    $('#complianceScore').text(complianceScore + '%');

    // Calculate financial impact
    const monthlySavings = criticalCount * 25000; // Realistic UGX amount
    const wastePrevented = monthlySavings * 0.7;
    
    $('#monthlySavings').text('UGX ' + monthlySavings.toLocaleString());
    $('#wastePrevented').text('UGX ' + Math.round(wastePrevented).toLocaleString());
    $('#totalValue').text('UGX ' + Math.round(totalValue).toLocaleString());
    $('#totalBatches').text(Object.keys(batchMap).length);

    // Update system status
    $('#dataStatus').text(medicines.length > 0 ? 'Data Active' : 'Awaiting Data Entry');
}

function loadRecentActivities() {
    const allActivities = JSON.parse(localStorage.getItem('pharmacy_activities') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    const activityContainer = $('#recentActivityContent');
    
    // Filter activities based on user role
    const filteredActivities = filterActivitiesByRole(allActivities, currentUser);
    
    if (filteredActivities.length === 0) {
        activityContainer.html(
            '<div class="text-center text-muted py-4">' +
            '<i class="fas fa-inbox fa-3x mb-3"></i>' +
            '<p>No recent activity recorded</p>' +
            '<small>Activities will appear here as you use the system</small>' +
            '</div>'
        );
        return;
    }

    let activityHTML = '';
    $.each(filteredActivities.slice(-8).reverse(), function(index, activity) {
        activityHTML += 
            '<div class="activity-item">' +
            '<div class="row align-items-center">' +
            '<div class="col-md-3">' +
            '<small class="activity-time">' + formatTime(activity.timestamp) + '</small>' +
            '</div>' +
            '<div class="col-md-7">' +
            '<span class="activity-desc">' + activity.description + '</span>' +
            '</div>' +
            '<div class="col-md-2 text-end">' +
            '<small class="activity-user">' + activity.user + '</small>' +
            '</div>' +
            '</div>' +
            '</div>';
    });

    activityContainer.html(activityHTML);
}

// Filter activities based on user role and permissions
function filterActivitiesByRole(allActivities, currentUser) {
    if (currentUser.role === 'admin') {
        // Admins see all activities
        return allActivities.filter(activity => {
            // Only hide other admins' sensitive actions if not the current admin
            if (activity.visibility === 'admin-only' && activity.userRole === 'admin' && activity.userEmail !== currentUser.email) {
                return false; // Hide other admins' sensitive activities
            }
            return true; // Show everything else
        });
    } else {
        // Normal users see only their own activities + general system activities
        return allActivities.filter(activity => {
            // Always show user their own activities
            if (activity.userEmail === currentUser.email) {
                return true;
            }
            // Show system activities
            if (activity.userRole === 'system') {
                return true;
            }
            // Don't show other users' admin-only activities
            return activity.visibility !== 'admin-only';
        });
    }
}

function determineActivityVisibility(description, userRole) {
    const sensitiveKeywords = [
        'staff', 'admin', 'password', 'user account', 'permission', 
        'role', 'delete', 'created account', 'deleted account',
        'changed password', 'updated permissions', 'cleared activity'
    ];
    
    const isSensitive = sensitiveKeywords.some(keyword => 
        description.toLowerCase().includes(keyword)
    );
    
    if (isSensitive) {
        return 'admin-only';
    }
    
    return 'all'; // Default to visible to all
}

function debugActivityFiltering() {
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    const allActivities = JSON.parse(localStorage.getItem('pharmacy_activities') || '[]');
    const filteredActivities = filterActivitiesByRole(allActivities, currentUser);
    
    console.log('=== ADMIN DASHBOARD ACTIVITY FILTERING DEBUG ===');
    console.log('Current User:', currentUser);
    console.log('Total Activities:', allActivities.length);
    console.log('Filtered Activities:', filteredActivities.length);
    console.log('Activities visible to user:');
    
    filteredActivities.forEach((activity, index) => {
        console.log(`${index + 1}. [${activity.visibility}] ${activity.description} - ${activity.user} (${activity.userRole})`);
    });
    
    // Show what was filtered out (for admins only)
    if (currentUser.role === 'admin') {
        const hiddenActivities = allActivities.filter(activity => 
            !filteredActivities.includes(activity)
        );
        console.log('Hidden activities:', hiddenActivities.length);
        hiddenActivities.forEach((activity, index) => {
            console.log(`HIDDEN: [${activity.visibility}] ${activity.description} - ${activity.user}`);
        });
    }
}

function loadNotifications() {
    const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
    const notificationList = $('#notificationList');
    const notificationCount = $('#notificationCount');

    const now = new Date();
    const criticalAlerts = medicines.filter(med => {
        const expiryDate = new Date(med.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    });

    const expiredAlerts = medicines.filter(med => new Date(med.expiryDate) <= now);

    const totalAlerts = criticalAlerts.length + expiredAlerts.length;
    notificationCount.text(totalAlerts);

    if (totalAlerts === 0) {
        notificationList.html(
            '<div class="dropdown-item text-center text-muted">' +
            '<small>No expiry alerts</small>' +
            '</div>'
        );
        return;
    }

    let notificationHTML = '';
    
    // Show critical alerts first
    criticalAlerts.slice(0, 3).forEach(med => {
        const daysLeft = Math.ceil((new Date(med.expiryDate) - now) / (1000 * 60 * 60 * 24));
        notificationHTML += 
            '<a class="dropdown-item" href="alerts.html">' +
            '<div class="d-flex align-items-center">' +
            '<div class="bg-danger rounded p-1 me-2">' +
            '<i class="fas fa-exclamation-triangle text-white"></i>' +
            '</div>' +
            '<div>' +
            '<small class="fw-bold">' + med.name + '</small>' +
            '<br><small class="text-muted">Expires in ' + daysLeft + ' days</small>' +
            '</div>' +
            '</div>' +
            '</a>';
    });

    // Show expired alerts
    expiredAlerts.slice(0, 2).forEach(med => {
        notificationHTML += 
            '<a class="dropdown-item" href="alerts.html">' +
            '<div class="d-flex align-items-center">' +
            '<div class="bg-dark rounded p-1 me-2">' +
            '<i class="fas fa-skull-crossbones text-white"></i>' +
            '</div>' +
            '<div>' +
            '<small class="fw-bold text-danger">' + med.name + '</small>' +
            '<br><small class="text-muted">ALREADY EXPIRED</small>' +
            '</div>' +
            '</div>' +
            '</a>';
    });

    notificationList.html(notificationHTML);
}

function setupEventListeners() {
    // Password reset form
    $('#passwordResetForm').on('submit', handlePasswordReset);
    
    // Mobile sidebar toggle
    $('[data-bs-toggle="collapse"]').on('click', function() {
        $('.sidebar').toggleClass('show');
    });
    
    // Close sidebar when clicking on link (mobile)
    $('.sidebar .nav-link').on('click', function() {
        if ($(window).width() < 992) {
            $('.sidebar').removeClass('show');
        }
    });

    // Smooth animations
    $('.action-card').hover(
        function() {
            $(this).css('transform', 'translateY(-5px)');
        },
        function() {
            $(this).css('transform', 'translateY(0)');
        }
    );

    // Enhanced logout with event listener as backup
    $('.logout-btn').on('click', function(e) {
        e.preventDefault();
        logout();
    });

    // Session activity tracking
    $(document).on('click keypress scroll', function() {
        sessionStorage.setItem('last_activity', new Date().getTime());
    });
    
    // Auto logout after 30 minutes of inactivity
    setInterval(function() {
        const lastActivity = sessionStorage.getItem('last_activity');
        if (lastActivity) {
            const currentTime = new Date().getTime();
            const inactiveTime = currentTime - parseInt(lastActivity);
            
            if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
                showNotification('Session expired due to inactivity', 'warning');
                setTimeout(logout, 2000);
            }
        }
    }, 60000); // Check every minute
}

// Profile Management
function showProfile() {
    const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    
    $('#profileUserName').text(userData.name || 'Admin User');
    $('#profileUserRole').text(userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'Administrator');
    $('#profileName').val(userData.name || '');
    $('#profileEmail').val(userData.email || '');
    
    $('#profileForm')[0].reset();
    $('#profileModal').modal('show');
}

function updateProfile() {
    const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    const currentPassword = $('#currentPassword').val();
    const newPassword = $('#newPassword').val();
    const confirmPassword = $('#confirmPassword').val();

    // Validate current password if changing password
    if (newPassword && currentPassword !== userData.password) {
        showNotification('Current password is incorrect', 'danger');
        return;
    }

    if (newPassword && newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'danger');
        return;
    }

    // Update user data
    userData.name = $('#profileName').val();
    userData.email = $('#profileEmail').val();
    
    if (newPassword) {
        userData.password = newPassword;
    }

    localStorage.setItem('pharmacy_user', JSON.stringify(userData));
    
    // Update UI
    $('#userName').text(userData.name);
    
    $('#profileModal').modal('hide');
    showNotification('Profile updated successfully', 'success');
    addActivity('Updated user profile', userData.name);
}

// Activity Management
function addActivity(description, user) {
    const activities = JSON.parse(localStorage.getItem('pharmacy_activities') || '[]');
    const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    
    const newActivity = {
        description: description,
        user: user || userData.name || 'System',
        userRole: userData.role || 'system',
        userEmail: userData.email || '',
        timestamp: new Date().toISOString(),
        visibility: determineActivityVisibility(description, userData.role)
    };

    activities.push(newActivity);

    if (activities.length > 50) {
        activities.splice(0, activities.length - 50);
    }

    localStorage.setItem('pharmacy_activities', JSON.stringify(activities));
    
    // Reload activities based on current user's view
    if (typeof loadRecentActivities === 'function') {
        loadRecentActivities();
    }
}

function clearActivity() {
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    
    if (currentUser.role !== 'admin') {
        showNotification('Only administrators can clear activity logs', 'danger');
        return;
    }
    
    if (confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
        localStorage.setItem('pharmacy_activities', JSON.stringify([]));
        loadRecentActivities();
        showNotification('Activity log cleared', 'success');
        addActivity('Cleared all activity logs', null);
    }
}

// System Functions
function updateSystemStatus() {
    const now = new Date();
    $('#lastUpdateTime').text('Last updated: ' + formatTime(now.toISOString()));
}

function updateLastUpdateTime() {
    setInterval(function() {
        const now = new Date();
        $('#lastUpdateTime').text('Last updated: ' + formatTime(now.toISOString()));
    }, 60000);
}

// Auto-refresh data every 2 minutes
setInterval(function() {
    loadDashboardData();
}, 120000);

// Auto-check for alerts every 5 minutes
setInterval(function() {
    loadNotifications();
}, 300000);

// Utility Functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    }) + ' • ' + date.toLocaleDateString();
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

function logout() {
    if (confirm('Are you sure you want to logout from Guardian Health Pharmacy?')) {
        // Show loading notification
        showNotification('Logging out securely...', 'info');
        
        // Add logout activity to log
        const userData = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
        addActivity('User logged out of the system', userData.name);
        
        // PROPERLY CLEAR THE USER SESSION
        const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
        currentUser.isLoggedIn = false; // Set login flag to false
        localStorage.setItem('pharmacy_user', JSON.stringify(currentUser));
        
        // Clear session storage
        sessionStorage.clear();
        
        // Wait for notification to show, then redirect to login.html
        setTimeout(function() {
            window.location.href = 'login.html';
        }, 1500);
    }
}

// Password Management Functions
function showPasswordResetModal() {
    $('#passwordResetModal').modal('show');
}

function handlePasswordReset(e) {
    e.preventDefault();
    
    const currentPassword = $('#currentPassword').val();
    const newPassword = $('#resetNewPassword').val();
    const confirmPassword = $('#resetConfirmPassword').val();
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill all fields', 'danger');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'danger');
        return;
    }
    
    if (!validatePassword(newPassword)) {
        showNotification('Password must be at least 8 characters with letters and numbers', 'danger');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    const userIndex = staffData.findIndex(staff => staff.id === currentUser.id);
    
    if (userIndex === -1) {
        showNotification('User not found', 'danger');
        return;
    }
    
    // Verify current password
    if (staffData[userIndex].password !== currentPassword) {
        showNotification('Current password is incorrect', 'danger');
        return;
    }
    
    // Update password
    staffData[userIndex].password = newPassword;
    localStorage.setItem('pharmacy_staff', JSON.stringify(staffData));
    
    showNotification('✅ Password changed successfully!', 'success');
    addActivity(`Password changed for: ${staffData[userIndex].name}`, 'System');
    
    // Close modal and reset form
    setTimeout(() => {
        $('#passwordResetModal').modal('hide');
        $('#passwordResetForm')[0].reset();
    }, 1500);
}

function validatePassword(password) {
    const minLength = 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return password.length >= minLength && hasLetter && hasNumber;
}