// Finance Tracker JavaScript
class FinanceTracker {
    constructor() {
        this.transactions = this.loadFromStorage();
        this.currentView = 'add';
        this.deleteTransactionId = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeTheme();
        this.updateUI();
        this.registerServiceWorker();
    }
    
    initializeElements() {
        // Form elements
        this.form = document.getElementById('transactionForm');
        this.descriptionInput = document.getElementById('description');
        this.amountInput = document.getElementById('amount');
        this.categorySelect = document.getElementById('category');
        this.typeRadios = document.querySelectorAll('input[name="type"]');
        
        // Display elements
        this.totalBalanceEl = document.getElementById('totalBalance');
        this.totalIncomeEl = document.getElementById('totalIncome');
        this.totalExpenseEl = document.getElementById('totalExpense');
        this.transactionsListEl = document.getElementById('transactionsList');
        
        // Control elements
        this.themeToggle = document.getElementById('themeToggle');
        this.viewToggle = document.getElementById('viewToggle');
        this.filterCategory = document.getElementById('filterCategory');
        this.filterType = document.getElementById('filterType');
        
        // Modal elements
        this.deleteModal = document.getElementById('deleteModal');
        this.confirmDeleteBtn = document.getElementById('confirmDelete');
        this.cancelDeleteBtn = document.getElementById('cancelDelete');
        
        // Toast
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toastMessage');
        
        // Sections
        this.addTransactionSection = document.getElementById('addTransactionSection');
        this.transactionsOverview = document.getElementById('transactionsOverview');
    }
    
    attachEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // View toggle
        this.viewToggle.addEventListener('click', () => this.toggleView());
        
        // Filter changes
        this.filterCategory.addEventListener('change', () => this.filterTransactions());
        this.filterType.addEventListener('change', () => this.filterTransactions());
        
        // Modal actions
        this.confirmDeleteBtn.addEventListener('click', () => this.deleteTransaction());
        this.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteModal());
        this.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.deleteModal) this.hideDeleteModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    initializeTheme() {
        const savedTheme = localStorage.getItem('finance-tracker-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('finance-tracker-theme', newTheme);
        this.updateThemeIcon(newTheme);
    }
    
    updateThemeIcon(theme) {
        const icon = this.themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    toggleView() {
        this.currentView = this.currentView === 'add' ? 'overview' : 'add';
        
        if (this.currentView === 'add') {
            this.addTransactionSection.classList.remove('hidden');
            this.transactionsOverview.classList.add('hidden');
            this.viewToggle.innerHTML = '<i class="fas fa-chart-line"></i><span>Overview</span>';
        } else {
            this.addTransactionSection.classList.add('hidden');
            this.transactionsOverview.classList.remove('hidden');
            this.viewToggle.innerHTML = '<i class="fas fa-plus"></i><span>Add</span>';
        }
    }
    
    handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            // Get the selected type from radio buttons
            const selectedType = document.querySelector('input[name="type"]:checked');
            
            const transaction = {
                id: Date.now().toString(),
                description: this.descriptionInput.value ? this.descriptionInput.value.trim() : '',
                amount: parseFloat(this.amountInput.value) || 0,
                category: this.categorySelect.value || '',
                type: selectedType ? selectedType.value : '',
                date: new Date().toISOString(),
                timestamp: Date.now()
            };
            
            // Validate transaction
            if (!this.validateTransaction(transaction)) {
                return;
            }
            
            this.addTransaction(transaction);
            this.form.reset();
            this.showToast('Transaction added successfully!', 'success');
            
            // Auto-switch to overview after adding
            setTimeout(() => {
                if (this.currentView === 'add') {
                    this.toggleView();
                }
            }, 1500);
        } catch (error) {
            console.error('Error in handleFormSubmit:', error);
            this.showToast('Error adding transaction. Please try again.', 'error');
        }
    }
    
    validateTransaction(transaction) {
        if (!transaction.description || transaction.description.trim() === '') {
            this.showToast('Please enter a description', 'error');
            this.descriptionInput.focus();
            return false;
        }
        
        if (!transaction.amount || transaction.amount <= 0 || isNaN(transaction.amount)) {
            this.showToast('Please enter a valid amount', 'error');
            this.amountInput.focus();
            return false;
        }
        
        if (!transaction.category) {
            this.showToast('Please select a category', 'error');
            this.categorySelect.focus();
            return false;
        }
        
        if (!transaction.type) {
            this.showToast('Please select transaction type', 'error');
            return false;
        }
        
        return true;
    }
    
    addTransaction(transaction) {
        this.transactions.unshift(transaction);
        this.saveToStorage();
        this.updateUI();
        this.animateNewTransaction();
    }
    
    removeTransaction(id) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions.splice(index, 1);
            this.saveToStorage();
            this.updateUI();
            this.showToast('Transaction deleted', 'success');
        }
    }
    
    updateUI() {
        this.updateSummary();
        this.renderTransactions();
    }
    
    updateSummary() {
        const summary = this.calculateSummary();
        
        this.totalBalanceEl.textContent = this.formatCurrency(summary.balance);
        this.totalIncomeEl.textContent = this.formatCurrency(summary.income);
        this.totalExpenseEl.textContent = this.formatCurrency(summary.expense);
        
        // Update balance color based on positive/negative
        if (summary.balance >= 0) {
            this.totalBalanceEl.style.color = 'var(--success-color)';
        } else {
            this.totalBalanceEl.style.color = 'var(--danger-color)';
        }
    }
    
    calculateSummary() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        return {
            income,
            expense,
            balance: income - expense
        };
    }
    
    renderTransactions() {
        const filteredTransactions = this.getFilteredTransactions();
        
        if (filteredTransactions.length === 0) {
            this.transactionsListEl.innerHTML = `
                <div class="no-transactions">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions found</p>
                    <span>Try adjusting your filters or add a new transaction</span>
                </div>
            `;
            return;
        }
        
        const transactionsHTML = filteredTransactions.map(transaction => {
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const categoryEmoji = this.getCategoryEmoji(transaction.category);
            const amountSign = transaction.type === 'income' ? '+' : '-';
            
            return `
                <div class="transaction-item ${transaction.type} fade-in" data-id="${transaction.id}">
                    <div class="transaction-icon">
                        <i class="fas fa-${transaction.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-description">${transaction.description}</div>
                        <div class="transaction-meta">
                            <span class="transaction-category">${categoryEmoji} ${transaction.category}</span>
                            <span class="transaction-date">${formattedDate} • ${formattedTime}</span>
                        </div>
                    </div>
                    <div class="transaction-amount">
                        ${amountSign}${this.formatCurrency(transaction.amount)}
                    </div>
                    <div class="transaction-actions">
                        <button class="action-btn delete-btn" onclick="financeTracker.showDeleteModal('${transaction.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        this.transactionsListEl.innerHTML = transactionsHTML;
    }
    
    getFilteredTransactions() {
        let filtered = [...this.transactions];
        
        // Filter by category
        const categoryFilter = this.filterCategory.value;
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(t => t.category === categoryFilter);
        }
        
        // Filter by type
        const typeFilter = this.filterType.value;
        if (typeFilter !== 'all') {
            filtered = filtered.filter(t => t.type === typeFilter);
        }
        
        return filtered;
    }
    
    getCategoryEmoji(category) {
        const emojiMap = {
            'Food': '🍔',
            'Transport': '🚗',
            'Entertainment': '🎬',
            'Shopping': '🛒',
            'Bills': '💡',
            'Healthcare': '🏥',
            'Education': '📚',
            'Salary': '💰',
            'Business': '💼',
            'Investment': '📈',
            'Gift': '🎁',
            'Other': '📝'
        };
        return emojiMap[category] || '📝';
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }
    
    filterTransactions() {
        this.renderTransactions();
    }
    
    showDeleteModal(transactionId) {
        this.deleteTransactionId = transactionId;
        this.deleteModal.classList.add('show');
    }
    
    hideDeleteModal() {
        this.deleteModal.classList.remove('show');
        this.deleteTransactionId = null;
    }
    
    deleteTransaction() {
        if (this.deleteTransactionId) {
            this.removeTransaction(this.deleteTransactionId);
            this.hideDeleteModal();
        }
    }
    
    showToast(message, type = 'success') {
        this.toastMessage.textContent = message;
        
        // Update toast styling based on type
        if (type === 'error') {
            this.toast.style.background = 'var(--danger-color)';
            this.toast.querySelector('i').className = 'fas fa-exclamation-circle';
        } else {
            this.toast.style.background = 'var(--success-color)';
            this.toast.querySelector('i').className = 'fas fa-check-circle';
        }
        
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
    
    animateNewTransaction() {
        setTimeout(() => {
            const newTransaction = this.transactionsListEl.querySelector('.transaction-item');
            if (newTransaction) {
                newTransaction.classList.add('slide-up');
            }
        }, 100);
    }
    
    handleKeyboard(e) {
        // Escape key to close modal
        if (e.key === 'Escape') {
            this.hideDeleteModal();
        }
        
        // Ctrl/Cmd + N for new transaction
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (this.currentView !== 'add') {
                this.toggleView();
            }
            this.descriptionInput.focus();
        }
        
        // Ctrl/Cmd + O for overview
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            if (this.currentView !== 'overview') {
                this.toggleView();
            }
        }
    }
    
    // Local Storage Methods
    saveToStorage() {
        try {
            localStorage.setItem('finance-tracker-data', JSON.stringify(this.transactions));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            this.showToast('Error saving data', 'error');
        }
    }
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem('finance-tracker-data');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    }
    
    // Export data
    exportData() {
        const dataStr = JSON.stringify(this.transactions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `finance-tracker-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully', 'success');
    }
    
    // PWA Service Worker Registration
    registerServiceWorker() {
        // Only register service worker when served over HTTP/HTTPS, not file://
        if ('serviceWorker' in navigator && 
            (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then((registration) => {
                        console.log('SW registered: ', registration);
                        this.handleInstallPrompt();
                    })
                    .catch((registrationError) => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        } else if (location.protocol === 'file:') {
            console.log('Service Worker not registered: file:// protocol not supported. App will work normally but PWA features require HTTP/HTTPS.');
        }
    }
    
    // Install prompt for PWA
    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallButton();
        });
    }
    
    showInstallButton() {
        // You can add an install button here if needed
        console.log('App can be installed');
    }
    
    hideInstallButton() {
        // Hide install button if shown
        console.log('App installed');
    }
}

// Utility functions for statistics (future enhancement)
class FinanceAnalytics {
    constructor(transactions) {
        this.transactions = transactions;
    }
    
    getMonthlySpending() {
        const monthly = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const month = new Date(t.date).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'long' 
                });
                monthly[month] = (monthly[month] || 0) + t.amount;
            });
        return monthly;
    }
    
    getCategorySpending() {
        const categories = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + t.amount;
            });
        return categories;
    }
    
    getSpendingTrend(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return this.transactions
            .filter(t => new Date(t.date) >= cutoffDate)
            .reduce((trend, t) => {
                const date = new Date(t.date).toLocaleDateString('en-IN');
                if (!trend[date]) {
                    trend[date] = { income: 0, expense: 0 };
                }
                trend[date][t.type] += t.amount;
                return trend;
            }, {});
    }
}

// Initialize the app
let financeTracker;

document.addEventListener('DOMContentLoaded', () => {
    financeTracker = new FinanceTracker();
});
