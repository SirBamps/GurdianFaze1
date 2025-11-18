// Guardian Health Pharmacy - Enhanced Authentication System
$(document).ready(function() {
    console.log("🔐 Enhanced Authentication System Initialized");
    
    initializeAuthSystem();
    setupAuthEventListeners();
});

function initializeAuthSystem() {
    // Initialize storage if not exists
    if (!localStorage.getItem('pharmacy_staff')) {
        localStorage.setItem('pharmacy_staff', JSON.stringify([]));
    }
    if (!localStorage.getItem('pharmacy_user')) {
        localStorage.setItem('pharmacy_user', JSON.stringify({}));
    }
    
    // Create default admin account 
    createDefaultAdminAccount();
    
    // Check if user is already logged in - BUT ONLY IF isLoggedIn is true
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    if (currentUser.email && currentUser.isLoggedIn === true) {
        redirectToDashboard(currentUser.role);
    }
    
    console.log("✅ Enhanced auth system ready");
}

function createDefaultAdminAccount() {
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    
    // Check if default admin already exists
    const defaultAdminExists = staffData.some(staff => staff.username === 'admin');
    
    if (!defaultAdminExists) {
        const defaultAdmin = {
            id: 1,
            username: 'admin',
            name: 'System Administrator',
            email: '',
            role: 'admin',
            phone: '',
            status: 'active',
            permissions: {
                inventory: true,
                alerts: true,
                reports: true,
                staff: true
            },
            password: 'admin@123',
            firstTimeLogin: true,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        staffData.push(defaultAdmin);
        localStorage.setItem('pharmacy_staff', JSON.stringify(staffData));
        console.log("✅ Default admin account created");
    }
}

function setupAuthEventListeners() {
    // Form submissions
    $('#loginForm').on('submit', handleLogin);
    $('#firstTimeForm').on('submit', handleFirstTimeUpdate);
    $('#passwordResetForm').on('submit', handlePasswordReset);
    
    // Password visibility toggles
    $('#toggleLoginPassword').on('click', function() {
        togglePasswordVisibility('loginPassword', $(this));
    });
    
    $('#toggleNewPassword').on('click', function() {
        togglePasswordVisibility('newPassword', $(this));
    });
}

// Function to check admin count (for reference)
function getAdminCount() {
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    return staffData.filter(staff => staff.role === 'admin').length;
}

function handleLogin(e) {
    e.preventDefault();
    
    const usernameOrEmail = $('#loginUsername').val().trim();
    const password = $('#loginPassword').val();
    const rememberMe = $('#rememberMe').is(':checked');
    
    if (!usernameOrEmail || !password) {
        showNotification('Please enter both username/email and password', 'danger');
        return;
    }
    
    // Validate credentials (check both username and email)
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    const user = staffData.find(staff => 
        (staff.username?.toLowerCase() === usernameOrEmail.toLowerCase() || 
         staff.email?.toLowerCase() === usernameOrEmail.toLowerCase()) && 
        staff.password === password &&
        staff.status === 'active'
    );
    
    if (!user) {
        showNotification('Invalid username/email or password', 'danger');
        return;
    }
    
    // Check if first time login
    if (user.firstTimeLogin === true) {
        // Store temporary user data for credential update
        sessionStorage.setItem('temp_user_id', user.id);
        showFirstTimeLoginModal();
        return;
    }
    
    // Update last login
    const userIndex = staffData.findIndex(s => s.id === user.id);
    staffData[userIndex].lastLogin = new Date().toISOString();
    localStorage.setItem('pharmacy_staff', JSON.stringify(staffData));
    
    // Set current user session - MAKE SURE isLoggedIn is set to TRUE
    const userSession = {
        id: user.id,
        username: user.username,
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

function showFirstTimeLoginModal() {
    $('#firstTimeLoginModal').modal('show');
}

function handleFirstTimeUpdate(e) {
    e.preventDefault();
    
    const newUsername = $('#newUsername').val().trim();
    const newEmail = $('#newEmail').val().trim();
    const newPassword = $('#newPassword').val();
    const confirmPassword = $('#confirmNewPassword').val();
    
    // Validation
    if (!newUsername || !newEmail || !newPassword || !confirmPassword) {
        showNotification('Please fill all fields', 'danger');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match', 'danger');
        return;
    }
    
    if (!validatePassword(newPassword)) {
        showNotification('Password must be at least 8 characters with letters and numbers', 'danger');
        return;
    }
    
    const userId = parseInt(sessionStorage.getItem('temp_user_id'));
    const staffData = JSON.parse(localStorage.getItem('pharmacy_staff') || '[]');
    const userIndex = staffData.findIndex(staff => staff.id === userId);
    
    if (userIndex === -1) {
        showNotification('User not found', 'danger');
        return;
    }
    
    // Check if username already exists (excluding current user)
    if (staffData.some(staff => staff.id !== userId && staff.username?.toLowerCase() === newUsername.toLowerCase())) {
        showNotification('Username already exists', 'danger');
        return;
    }
    
    // Check if email already exists (excluding current user)
    if (staffData.some(staff => staff.id !== userId && staff.email?.toLowerCase() === newEmail.toLowerCase())) {
        showNotification('Email already exists', 'danger');
        return;
    }
    
    // Update user credentials
    staffData[userIndex].username = newUsername;
    staffData[userIndex].email = newEmail;
    staffData[userIndex].password = newPassword;
    staffData[userIndex].firstTimeLogin = false;
    staffData[userIndex].lastLogin = new Date().toISOString();
    
    localStorage.setItem('pharmacy_staff', JSON.stringify(staffData));
    
    // Set current user session
    const userSession = {
        id: staffData[userIndex].id,
        username: staffData[userIndex].username,
        name: staffData[userIndex].name,
        email: staffData[userIndex].email,
        role: staffData[userIndex].role,
        permissions: staffData[userIndex].permissions,
        isLoggedIn: true,
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('pharmacy_user', JSON.stringify(userSession));
    
    // Clear temporary data
    sessionStorage.removeItem('temp_user_id');
    
    // Log activity
    addActivity(`Admin credentials updated: ${staffData[userIndex].name}`, 'System');
    
    showNotification('✅ Credentials updated successfully! Redirecting...', 'success');
    
    // Close modal and redirect
    setTimeout(() => {
        $('#firstTimeLoginModal').modal('hide');
        redirectToDashboard(staffData[userIndex].role);
    }, 1500);
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

// Function to show password reset modal (called from admin dashboard)
function showPasswordResetModal() {
    $('#passwordResetModal').modal('show');
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

