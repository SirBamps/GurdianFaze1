// Guardian Health Pharmacy - Enhanced Authentication System
$(document).ready(function() {
    console.log("🔐 Enhanced Authentication System Initialized");
    
    initializeAuthSystem();
    setupAuthEventListeners();
    checkExistingAdmins();
});

function initializeAuthSystem() {
    // Initialize storage if not exists
    if (!localStorage.getItem('pharmacy_staff')) {
        localStorage.setItem('pharmacy_staff', JSON.stringify([]));
    }
    if (!localStorage.getItem('pharmacy_user')) {
        localStorage.setItem('pharmacy_user', JSON.stringify({}));
    }
    
    // Check if user is already logged in - BUT ONLY IF isLoggedIn is true
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    if (currentUser.email && currentUser.isLoggedIn === true) {
        redirectToDashboard(currentUser.role);
    }
    
    console.log("✅ Enhanced auth system ready");
}

function setupAuthEventListeners() {
    // Form submissions
    $('#loginForm').on('submit', handleLogin);
    $('#signupForm').on('submit', handleSignup);
    
    // Password visibility toggles
    $('#toggleLoginPassword').on('click', function() {
        togglePasswordVisibility('loginPassword', $(this));
    });
    
    $('#toggleSignupPassword').on('click', function() {
        togglePasswordVisibility('signupPassword', $(this));
    });
    
    // Password strength indicator
    $('#signupPassword').on('input', function() {
        checkPasswordStrength($(this).val());
    });
    
    // Tab change events
    $('#authTabs button').on('shown.bs.tab', function() {
        if ($(this).attr('id') === 'signup-tab') {
            checkExistingAdmins();
        }
    });
    
    // Admin password reset link
    $('#adminResetPassword').on('click', function(e) {
        e.preventDefault();
        showAdminPasswordReset();
    });
}

function checkExistingAdmins() {
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    const adminCount = staffData.filter(staff => staff.role === 'admin').length;
    
    const signupTab = $('#signup-tab');
    const signupContent = $('#signup');
    
    if (adminCount >= 2) {
        // Hide signup tab and show message
        signupTab.addClass('d-none');
        signupContent.html(`
            <div class="text-center py-5">
                <i class="fas fa-user-shield fa-3x text-warning mb-3"></i>
                <h5 class="text-warning">Admin Registration Closed</h5>
                <p class="text-muted">
                    Maximum of 2 admin accounts have been created for system security.
                </p>
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Need access?</strong> Contact an existing administrator.
                </div>
                <button class="btn btn-outline-primary mt-2" onclick="showAdminPasswordReset()">
                    <i class="fas fa-key me-2"></i>Admin Password Reset
                </button>
            </div>
        `);
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = $('#loginEmail').val().trim();
    const password = $('#loginPassword').val();
    const rememberMe = $('#rememberMe').is(':checked');
    
    if (!email || !password) {
        showNotification('Please enter both email and password', 'danger');
        return;
    }
    
    // Validate credentials
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    const user = staffData.find(staff => 
        staff.email.toLowerCase() === email.toLowerCase() && 
        staff.password === password &&
        staff.status === 'active'
    );
    
    if (!user) {
        showNotification('Invalid email or password', 'danger');
        return;
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    localStorage.setItem('pharmacy_staff', JSON.stringify(staffData));
    
    // Set current user session - MAKE SURE isLoggedIn is set to TRUE
    const userSession = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isLoggedIn: true, // THIS MUST BE TRUE
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('pharmacy_user', JSON.stringify(userSession));
    
    // Log activity
    addActivity(`User logged in: ${user.name}`, 'System');
    
    showNotification(`Welcome back, ${user.name}!`, 'success');
    
    // Redirect to appropriate dashboard based on role
    setTimeout(() => {
        redirectToDashboard(user.role);
    }, 1000);
}

function handleSignup(e) {
    e.preventDefault();
    
    // Check admin limit BEFORE processing
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    const adminCount = staffData.filter(staff => staff.role === 'admin').length;
    
    if (adminCount >= 2) {
        showNotification('❌ Maximum admin accounts (2) reached! Cannot create more admin accounts.', 'danger');
        checkExistingAdmins(); // Update UI to show closed state
        return;
    }
    
    const name = $('#signupName').val().trim();
    const email = $('#signupEmail').val().trim();
    const password = $('#signupPassword').val();
    const confirmPassword = $('#signupConfirmPassword').val();
    const phone = $('#signupPhone').val().trim();
    const agreeTerms = $('#agreeTerms').is(':checked');
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Please fill all required fields', 'danger');
        return;
    }
    
    if (!agreeTerms) {
        showNotification('Please agree to the terms and conditions', 'danger');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'danger');
        return;
    }
    
    if (!validatePassword(password)) {
        showNotification('Password must be at least 8 characters with letters and numbers', 'danger');
        return;
    }
    
    // Check if email already exists
    if (staffData.some(staff => staff.email.toLowerCase() === email.toLowerCase())) {
        showNotification('Email address already exists', 'danger');
        return;
    }
    
    // Create admin account
    const newAdmin = {
        id: generateStaffId(staffData),
        name: name,
        email: email,
        role: 'admin',
        phone: phone,
        status: 'active',
        permissions: {
            inventory: true,
            alerts: true,
            reports: true,
            staff: true
        },
        password: password,
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    staffData.push(newAdmin);
    localStorage.setItem('pharmacy_staff', JSON.stringify(staffData));
    
    // Log activity
    addActivity(`Admin account created: ${name}`, 'System');
    
    showNotification('✅ Admin account created successfully! Please login.', 'success');
    
    // Switch to login tab and clear form
    setTimeout(() => {
        $('#login-tab').tab('show');
        $('#loginEmail').val(email);
        $('#signupForm')[0].reset();
        checkExistingAdmins(); // Check if we reached the limit
    }, 1500);
}

// NEW FUNCTION: Admin Password Reset
function showAdminPasswordReset() {
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    const admins = staffData.filter(staff => staff.role === 'admin' && staff.status === 'active');
    
    if (admins.length === 0) {
        showNotification('No admin accounts found in system', 'warning');
        return;
    }
    
    let adminList = '';
    admins.forEach(admin => {
        adminList += `
            <div class="admin-reset-item mb-3 p-3 border rounded">
                <h6 class="mb-2">${admin.name}</h6>
                <p class="mb-1"><small>Email: ${admin.email}</small></p>
                <p class="mb-2"><small>Last Login: ${admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}</small></p>
                <button class="btn btn-sm btn-warning" onclick="resetAdminPassword(${admin.id})">
                    <i class="fas fa-key me-1"></i>Reset Password
                </button>
            </div>
        `;
    });
    
    const resetModal = `
        <div class="modal fade" id="adminPasswordResetModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title"><i class="fas fa-user-shield me-2"></i>Admin Password Reset</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Admin Password Reset</strong><br>
                            Reset passwords for existing administrator accounts.
                        </div>
                        <h6 class="mb-3">Available Admin Accounts:</h6>
                        ${adminList}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    $('#adminPasswordResetModal').remove();
    
    // Add new modal to body
    $('body').append(resetModal);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('adminPasswordResetModal'));
    modal.show();
}

// NEW FUNCTION: Reset Specific Admin Password
function resetAdminPassword(adminId) {
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    const adminIndex = staffData.findIndex(staff => staff.id === adminId && staff.role === 'admin');
    
    if (adminIndex === -1) {
        showNotification('Admin account not found', 'danger');
        return;
    }
    
    const admin = staffData[adminIndex];
    const newPassword = prompt(`Enter new password for ${admin.name}:`);
    
    if (!newPassword) {
        return; // User cancelled
    }
    
    if (!validatePassword(newPassword)) {
        showNotification('Password must be at least 8 characters with letters and numbers', 'danger');
        return;
    }
    
    // Update password
    staffData[adminIndex].password = newPassword;
    localStorage.setItem('pharmacy_staff', JSON.stringify(staffData));
    
    showNotification(`✅ Password reset successfully for ${admin.name}`, 'success');
    addActivity(`Password reset for admin: ${admin.name}`, 'System');
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('adminPasswordResetModal')).hide();
}

function generateStaffId(staffData) {
    const maxId = staffData.reduce((max, staff) => Math.max(max, staff.id), 0);
    return maxId + 1;
}

function validatePassword(password) {
    const minLength = 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return password.length >= minLength && hasLetter && hasNumber;
}

function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    const strengthBar = $('#passwordStrengthBar');
    const strengthText = $('#passwordStrengthText');
    
    strengthBar.removeClass('bg-danger bg-warning bg-info bg-success');
    
    switch(strength) {
        case 0:
        case 1:
            strengthBar.css('width', '20%').addClass('bg-danger');
            strengthText.text('Very Weak').removeClass().addClass('text-danger');
            break;
        case 2:
            strengthBar.css('width', '40%').addClass('bg-danger');
            strengthText.text('Weak').removeClass().addClass('text-danger');
            break;
        case 3:
            strengthBar.css('width', '60%').addClass('bg-warning');
            strengthText.text('Fair').removeClass().addClass('text-warning');
            break;
        case 4:
            strengthBar.css('width', '80%').addClass('bg-info');
            strengthText.text('Good').removeClass().addClass('text-info');
            break;
        case 5:
            strengthBar.css('width', '100%').addClass('bg-success');
            strengthText.text('Strong').removeClass().addClass('text-success');
            break;
    }
}

function togglePasswordVisibility(passwordFieldId, button) {
    const passwordField = $('#' + passwordFieldId);
    const type = passwordField.attr('type') === 'password' ? 'text' : 'password';
    const icon = button.find('i');
    
    passwordField.attr('type', type);
    icon.toggleClass('fa-eye fa-eye-slash');
}

// UPDATED FUNCTION: Redirect based on role
function redirectToDashboard(role) {
    if (role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'nuser.html'; // Normal users go to nuser.html
    }
}

function showForgotPassword() {
    $('#forgotPasswordModal').modal('show');
}

// Utility Functions (keep existing)
function showNotification(message, type) {
    const notification = $(
        '<div class="toast align-items-center text-white bg-' + type + ' border-0 position-fixed top-0 end-0 m-3" role="alert">' +
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
    
    activities.push({
        description: description,
        user: user || 'System',
        timestamp: new Date().toISOString()
    });

    if (activities.length > 50) {
        activities.splice(0, activities.length - 50);
    }

    localStorage.setItem('pharmacy_activities', JSON.stringify(activities));
}

// Auto-check for existing admins on page load
$(window).on('load', function() {
    checkExistingAdmins();
});