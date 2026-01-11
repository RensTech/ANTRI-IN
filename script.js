// Queue System Management dengan Login
class QueueSystem {
    constructor() {
        this.STORAGE_KEY = 'antriin_queue_data';
        this.LOGIN_KEY = 'antriin_admin_login';
        this.CREDENTIALS = {
            username: 'admin',
            password: 'admin123'
        };
        this.init();
    }
    
    init() {
        // Initialize data structure if not exists
        if (!this.getData()) {
            this.resetDaily();
        }
        
        // Set today's date
        const todayDateElement = document.getElementById('todayDate');
        if (todayDateElement) {
            todayDateElement.textContent = this.getTodayDate();
        }
        
        // Update display on page load
        this.updateDisplay();
        
        // Check URL for admin page
        if (window.location.pathname.includes('admin.html')) {
            this.checkAdminAuth();
        }
    }
    
    // ===== LOGIN FUNCTIONS =====
    
    login(username, password) {
        if (username === this.CREDENTIALS.username && password === this.CREDENTIALS.password) {
            // Set login session
            const loginData = {
                isLoggedIn: true,
                username: username,
                loginTime: new Date().toISOString()
            };
            sessionStorage.setItem(this.LOGIN_KEY, JSON.stringify(loginData));
            return true;
        }
        return false;
    }
    
    logout() {
        sessionStorage.removeItem(this.LOGIN_KEY);
        window.location.href = 'login.html';
    }
    
    checkAdminAuth() {
        const loginData = JSON.parse(sessionStorage.getItem(this.LOGIN_KEY));
        
        if (!loginData || !loginData.isLoggedIn) {
            // Redirect to login page if not authenticated
            window.location.href = 'login.html';
            return;
        }
        
        // Setup admin page
        this.setupAdminPage(loginData);
    }
    
    setupAdminPage(loginData) {
        // Update admin display
        this.updateAdminDisplay();
        
        // Set last login time on admin page
        const lastLoginTimeElement = document.getElementById('lastLoginTime');
        const loggedInUserElement = document.getElementById('loggedInUser');
        
        if (lastLoginTimeElement && loginData.loginTime) {
            const loginTime = new Date(loginData.loginTime);
            lastLoginTimeElement.textContent = loginTime.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }) + ' ' + loginTime.toLocaleDateString('id-ID');
        }
        
        if (loggedInUserElement) {
            loggedInUserElement.textContent = loginData.username;
        }
        
        // Setup admin event listeners
        this.setupAdminEvents();
    }
    
    setupAdminEvents() {
        // Call Next Queue Button
        const callNextBtn = document.getElementById('callNextBtn');
        if (callNextBtn) {
            callNextBtn.addEventListener('click', () => {
                const nextNumber = this.callNextQueue();
                if (nextNumber) {
                    this.updateDisplay();
                    this.updateAdminDisplay();
                }
            });
        }
        
        // Reset Queue Button
        const resetQueueBtn = document.getElementById('resetQueueBtn');
        if (resetQueueBtn) {
            resetQueueBtn.addEventListener('click', () => {
                if (confirm('Apakah Anda yakin ingin mereset antrian untuk hari ini? Tindakan ini tidak dapat dibatalkan.')) {
                    this.resetDaily();
                    sessionStorage.removeItem('userQueueNumber'); // Clear user's queue number
                    this.updateDisplay();
                    this.updateAdminDisplay();
                }
            });
        }
        
        // Logout Button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }
    
    // ===== QUEUE FUNCTIONS =====
    
    getData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    }
    
    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
    
    getTodayDate() {
        const now = new Date();
        return now.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    resetDaily() {
        const data = {
            lastQueueNumber: 0,
            currentQueueNumber: 0,
            waitingQueue: [],
            completedQueue: [],
            averageServiceTime: 5, // minutes
            lastResetDate: new Date().toDateString()
        };
        
        this.saveData(data);
        this.showNotification('Antrian telah direset untuk hari ini');
        return data;
    }
    
    getNewQueueNumber() {
        const data = this.getData();
        
        // Check if it's a new day
        if (new Date().toDateString() !== data.lastResetDate) {
            this.resetDaily();
            return this.getNewQueueNumber();
        }
        
        // Increment queue number
        data.lastQueueNumber += 1;
        const queueNumber = data.lastQueueNumber;
        
        // Add to waiting queue
        const queueItem = {
            number: queueNumber,
            timestamp: new Date().toISOString(),
            status: 'waiting'
        };
        
        data.waitingQueue.push(queueItem);
        this.saveData(data);
        
        // Save user's queue number to sessionStorage
        sessionStorage.setItem('userQueueNumber', queueNumber);
        
        return {
            queueNumber,
            position: data.waitingQueue.length,
            estimatedWait: data.waitingQueue.length * data.averageServiceTime
        };
    }
    
    callNextQueue() {
        const data = this.getData();
        
        // Check if there's anyone in the queue
        if (data.waitingQueue.length === 0) {
            this.showNotification('Tidak ada antrian yang menunggu', 'warning');
            return null;
        }
        
        // Get the next person in queue (FIFO)
        const nextQueue = data.waitingQueue[0];
        
        // Update current queue
        data.currentQueueNumber = nextQueue.number;
        
        // Move from waiting to completed
        data.waitingQueue.shift();
        nextQueue.status = 'called';
        nextQueue.calledAt = new Date().toISOString();
        data.completedQueue.push(nextQueue);
        
        this.saveData(data);
        this.showNotification(`Memanggil antrian nomor: ${nextQueue.number}`);
        
        return nextQueue.number;
    }
    
    getQueueStatus(queueNumber) {
        if (!queueNumber) return null;
        
        const data = this.getData();
        if (!data) return null;
        
        // Check if this number is currently being served
        if (queueNumber === data.currentQueueNumber) {
            return {
                number: queueNumber,
                position: 0,
                status: 'called',
                estimatedWait: 0
            };
        }
        
        // Check waiting queue position
        const waitingIndex = data.waitingQueue.findIndex(item => item.number === queueNumber);
        
        if (waitingIndex !== -1) {
            return {
                number: queueNumber,
                position: waitingIndex + 1,
                status: 'waiting',
                estimatedWait: (waitingIndex + 1) * data.averageServiceTime
            };
        }
        
        // Check if already completed
        const completedIndex = data.completedQueue.findIndex(item => item.number === queueNumber);
        
        if (completedIndex !== -1) {
            return {
                number: queueNumber,
                position: -1,
                status: 'completed',
                estimatedWait: 0
            };
        }
        
        // Number not found
        return null;
    }
    
    getQueueStats() {
        const data = this.getData();
        if (!data) return { currentQueue: 0, waitingCount: 0, completedCount: 0, totalToday: 0 };
        
        return {
            currentQueue: data.currentQueueNumber,
            waitingCount: data.waitingQueue.length,
            completedCount: data.completedQueue.length,
            totalToday: data.lastQueueNumber
        };
    }
    
    getWaitingQueue() {
        const data = this.getData();
        return data ? data.waitingQueue : [];
    }
    
    updateDisplay() {
        const stats = this.getQueueStats();
        
        // Update queue count on main page
        const queueCountElement = document.getElementById('queueCount');
        if (queueCountElement) {
            queueCountElement.textContent = stats.waitingCount;
        }
        
        // Update user queue info if it exists
        const userQueueNumber = sessionStorage.getItem('userQueueNumber');
        if (userQueueNumber) {
            const status = this.getQueueStatus(parseInt(userQueueNumber));
            if (status) {
                this.displayUserQueueInfo(status);
            }
        }
    }
    
    updateAdminDisplay() {
        const stats = this.getQueueStats();
        const waitingQueue = this.getWaitingQueue();
        
        // Update stats on admin page
        const currentQueueDisplay = document.getElementById('currentQueueDisplay');
        const waitingCountElement = document.getElementById('waitingCount');
        const completedCountElement = document.getElementById('completedCount');
        
        if (currentQueueDisplay) {
            currentQueueDisplay.textContent = 
                stats.currentQueue > 0 ? `#${stats.currentQueue.toString().padStart(3, '0')}` : '-';
        }
        
        if (waitingCountElement) {
            waitingCountElement.textContent = stats.waitingCount;
        }
        
        if (completedCountElement) {
            completedCountElement.textContent = stats.completedCount;
        }
        
        // Update waiting queue list
        const waitingQueueElement = document.getElementById('waitingQueue');
        if (waitingQueueElement) {
            if (waitingQueue.length === 0) {
                waitingQueueElement.innerHTML = `
                    <div class="empty-queue">
                        <i class="fas fa-users-slash"></i>
                        <p>Tidak ada antrian yang menunggu</p>
                    </div>
                `;
            } else {
                let queueHTML = '';
                waitingQueue.forEach((item, index) => {
                    const time = new Date(item.timestamp);
                    const timeString = time.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    queueHTML += `
                        <div class="queue-item ${index === 0 ? 'current' : ''}">
                            <div>
                                <div class="queue-number-badge">#${item.number.toString().padStart(3, '0')}</div>
                                <small>${timeString}</small>
                            </div>
                            <div class="queue-status status-waiting">
                                ${index === 0 ? 'BERIKUTNYA' : 'MENUNGGU'}
                            </div>
                        </div>
                    `;
                });
                waitingQueueElement.innerHTML = queueHTML;
            }
        }
    }
    
    displayUserQueueInfo(status) {
        const userQueueInfo = document.getElementById('userQueueInfo');
        const userQueueNumber = document.getElementById('userQueueNumber');
        const userQueuePosition = document.getElementById('userQueuePosition');
        const userWaitTime = document.getElementById('userWaitTime');
        
        if (userQueueInfo && userQueueNumber && userQueuePosition && userWaitTime) {
            userQueueNumber.textContent = `#${status.number.toString().padStart(3, '0')}`;
            
            if (status.status === 'called') {
                userQueuePosition.textContent = 'SEDANG DIPANGGIL';
                userWaitTime.textContent = '0';
            } else if (status.status === 'completed') {
                userQueuePosition.textContent = 'SELESAI';
                userWaitTime.textContent = '0';
            } else {
                userQueuePosition.textContent = status.position;
                userWaitTime.textContent = status.estimatedWait;
            }
            
            userQueueInfo.classList.remove('hidden');
            
            // Update button text
            const getNumberBtn = document.getElementById('getNumberBtn');
            if (getNumberBtn) {
                getNumberBtn.innerHTML = '<i class="fas fa-plus-circle"></i> AMBIL ANTRIAN BARU';
            }
        }
    }
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            
            // Reset classes
            notification.className = 'notification';
            
            // Set type
            if (type === 'warning') {
                notification.classList.add('warning');
            } else if (type === 'error') {
                notification.classList.add('error');
            } else {
                notification.classList.add('show');
            }
            
            // Show notification
            notification.classList.remove('hidden');
            notification.classList.add('show');
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.classList.add('hidden');
                }, 300);
            }, 3000);
        } else {
            // Fallback alert
            alert(message);
        }
    }
}

// Initialize Queue System
const queueSystem = new QueueSystem();

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', function() {
    // ===== LOGIN FORM HANDLER =====
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (queueSystem.login(username, password)) {
                // Show loading state
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                submitBtn.disabled = true;
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 500);
            } else {
                queueSystem.showNotification('Username atau password salah!', 'error');
                
                // Add shake animation to form
                loginForm.classList.add('shake');
                setTimeout(() => {
                    loginForm.classList.remove('shake');
                }, 500);
                
                // Clear password field
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }
        });
    }
    
    // ===== MAIN PAGE EVENT LISTENERS =====
    
    // Get Queue Number Button
    const getNumberBtn = document.getElementById('getNumberBtn');
    if (getNumberBtn) {
        getNumberBtn.addEventListener('click', function() {
            // Disable button temporarily to prevent double click
            this.disabled = true;
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
            
            setTimeout(() => {
                const queueInfo = queueSystem.getNewQueueNumber();
                
                // Update display
                queueSystem.updateDisplay();
                
                // Show success message
                queueSystem.showNotification(`Berhasil! Nomor antrian Anda: ${queueInfo.queueNumber}`);
                
                // Re-enable button
                this.disabled = false;
                this.innerHTML = originalText;
            }, 500);
        });
    }
    
    // View Status Button
    const viewStatusBtn = document.getElementById('viewStatusBtn');
    if (viewStatusBtn) {
        viewStatusBtn.addEventListener('click', function() {
            const userQueueNumber = sessionStorage.getItem('userQueueNumber');
            if (userQueueNumber) {
                // Refresh status
                const status = queueSystem.getQueueStatus(parseInt(userQueueNumber));
                if (status) {
                    queueSystem.displayUserQueueInfo(status);
                    queueSystem.showNotification('Status antrian diperbarui');
                } else {
                    queueSystem.showNotification('Nomor antrian tidak ditemukan', 'warning');
                }
            } else {
                queueSystem.showNotification('Anda belum mengambil nomor antrian', 'warning');
            }
        });
    }
    
    // Check if user already has a queue number on page load
    const userQueueNumber = sessionStorage.getItem('userQueueNumber');
    if (userQueueNumber) {
        const status = queueSystem.getQueueStatus(parseInt(userQueueNumber));
        if (status) {
            queueSystem.displayUserQueueInfo(status);
        }
    }
    
    // ===== ADMIN PAGE AUTOMATIC SETUP =====
    // The admin page setup is now handled inside QueueSystem.checkAdminAuth()
});

// ===== ANIMATION CSS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .shake {
        animation: shake 0.5s ease-in-out;
    }
    
    .fa-spin {
        animation: fa-spin 1s infinite linear;
    }
    
    @keyframes fa-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .login-form input:focus {
        box-shadow: 0 0 0 3px rgba(58, 134, 255, 0.2);
    }
    
    button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);