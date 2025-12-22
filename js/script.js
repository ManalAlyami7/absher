/**
 * ========================================
 * Tanabbah - Main Controller
 * ========================================
 * Purpose: Application initialization, event handlers, main logic
 * Author: Manal Alyami
 * Version: 2.0.0
 * ========================================
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

let analysisHistory = [];
window.currentLanguage = 'ar'; // Expose globally for other modules

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application on page load
 */
window.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupTextareaAutoDirection();
    setupKeyboardShortcuts();
    setupHistorySearch();
});

/**
 * Initialize application settings and load saved data
 */
function initializeApp() {
    // Load saved language
    const savedLanguage = loadFromStorage(CONFIG.LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'ar' || savedLanguage === 'en')) {
        window.currentLanguage = savedLanguage;
        const html = document.getElementById('htmlElement');
        html.lang = window.currentLanguage;
        html.dir = window.currentLanguage === 'ar' ? 'rtl' : 'ltr';
    }

    // Load dark mode setting
    if (loadFromStorage(CONFIG.DARK_MODE_KEY) === true) {
        document.body.classList.add('dark-mode');
    }

    // Load analysis history
    analysisHistory = loadFromStorage(CONFIG.HISTORY_KEY, []);
    if (!Array.isArray(analysisHistory)) analysisHistory = [];
    analysisHistory = analysisHistory.slice(0, CONFIG.MAX_HISTORY);
    
    // Update UI language
    updateUILanguage();
    
    // Hide splash screen after initialization
    setTimeout(hideSplashScreen, 2500);
    
    console.log('✅ Tanabbah initialized successfully');
}

/**
 * Hide the splash screen with fade out animation
 */
function hideSplashScreen() {
    const splashScreen = document.getElementById('splashScreen');
    const container = document.querySelector('.container');
    
    if (splashScreen) {
        splashScreen.classList.add('hidden');
        
        // Remove splash screen after animation completes
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 500);
    }
    
    if (container) {
        container.style.display = 'block';
    }
}

/**
 * Setup automatic text direction for textarea based on content
 */
function setupTextareaAutoDirection() {
    const textarea = document.getElementById('messageInput');
    textarea.addEventListener('input', function() {
        const text = this.value;
        const hasArabic = /[\u0600-\u06FF]/.test(text);
        
        if (hasArabic) {
            this.setAttribute('dir', 'rtl');
            this.style.textAlign = 'right';
        } else if (text.length > 0) {
            this.setAttribute('dir', 'ltr');
            this.style.textAlign = 'left';
        } else {
            this.setAttribute('dir', 'auto');
            this.style.textAlign = '';
        }
    });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // ESC to close modals
        if (e.key === 'Escape') {
            closeModal('historyModal');
            closeModal('reportModal');
            closePremiumModal();
        }
        
        // Ctrl+Enter to analyze
        if (e.ctrlKey && e.key === 'Enter') {
            analyzeMessage();
        }
    });
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze message - main entry point
 */
async function analyzeMessage() {
    const textarea = document.getElementById('messageInput');
    const text = textarea.value.trim();

    // Validation
    if (!text) {
        showNotification(t('notifNoMessage'), 'warning');
        return;
    }

    if (!validateMessageLength(text)) {
        showNotification(t('notifMessageTooLong'), 'error');
        return;
    }

    // Show loading state
    showLoading();
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        // Try API analysis first
        const result = await analyzeViaAPI(text, true);
        displayResult(result);
    } catch (error) {
        console.error('API analysis failed:', error);
        
        // Fallback to local analysis
        const result = performLocalAnalysis(text);
        displayResult(result);
        
        showNotification(
            window.currentLanguage === 'ar'
                ? '⚠️ استخدام التحليل المحلي'
                : '⚠️ Using local analysis',
            'warning'
        );
    } finally {
        hideLoading();
    }
}

// ============================================================================
// UI ACTIONS
// ============================================================================

/**
 * Paste text from clipboard
 */
async function pasteFromClipboard() {
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            
            if (!validateMessageLength(text)) {
                showNotification(t('notifMessageTooLong'), 'error');
                return;
            }
            
            const textarea = document.getElementById('messageInput');
            textarea.value = text;
            
            // Set direction based on content
            const hasArabic = /[\u0600-\u06FF]/.test(text);
            textarea.setAttribute('dir', hasArabic ? 'rtl' : 'ltr');
            textarea.style.textAlign = hasArabic ? 'right' : 'left';
            textarea.dispatchEvent(new Event('input'));
            
            showNotification(t('notifPasted'));
        } else {
            showNotification(t('notifPasteFailed'), 'warning');
        }
    } catch (err) {
        showNotification(t('notifPasteFailed'), 'error');
    }
}

/**
 * Clear all text and results
 */
function clearAll() {
    const textarea = document.getElementById('messageInput');
    
    if (textarea.value.trim() && !confirm(t('confirmClear'))) {
        return;
    }
    
    textarea.value = '';
    document.getElementById('resultCard').classList.remove('show');
    updateExportButtonVisibility();
    showNotification(t('notifCleared'));
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    saveToStorage(CONFIG.DARK_MODE_KEY, document.body.classList.contains('dark-mode'));
}

/**
 * Toggle language between Arabic and English
 */
function toggleLanguage() {
    window.currentLanguage = window.currentLanguage === 'ar' ? 'en' : 'ar';
    saveToStorage(CONFIG.LANGUAGE_KEY, window.currentLanguage);
    
    const html = document.getElementById('htmlElement');
    html.lang = window.currentLanguage;
    html.dir = window.currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    updateUILanguage();
}

/**
 * Update UI text based on current language
 */
function updateUILanguage() {
    // Update text elements (using textContent)
    const textUpdates = {
        privacyNoticeText: 'privacyNotice',
        mainTitle: 'mainTitle',
        mainSubtitle: 'mainSubtitle',
        tipsTitleText: 'tipsTitle',
        officialSitesTitleText: 'officialSitesTitle',
        historyModalTitle: 'historyTitle',
        clearHistoryBtnText: 'clearHistory',
        reportModalTitle: 'reportTitle',
        reportDescriptionText: 'reportDescription',
        reportInfoText: 'reportInfo',
        sendReportBtnText: 'sendReport',
        cancelReportBtnText: 'cancel'
    };
    
    // Update language button separately since it's dynamic
    const langBtn = document.getElementById('langBtnLabel');
    if (langBtn) langBtn.textContent = window.currentLanguage === 'ar' ? t('language') : t('languageAr');
    
    // Update language button tooltip
    const langHeaderBtn = document.querySelector('.header-btn[onclick="toggleLanguage()"]');
    if (langHeaderBtn) {
        langHeaderBtn.title = window.currentLanguage === 'ar' ? t('languageAr') : t('language');
        langHeaderBtn.setAttribute('aria-label', window.currentLanguage === 'ar' ? t('languageAr') : t('language'));
        langHeaderBtn.setAttribute('data-tooltip', (window.currentLanguage === 'ar' ? t('languageAr') : t('language')) + ' (' + (window.currentLanguage === 'ar' ? t('language') : t('languageAr')) + ')');
    }

    for (const [id, key] of Object.entries(textUpdates)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    }
    
    // Update privacy notice with innerHTML to preserve formatting
    const privacyNoticeEl = document.getElementById('privacyNoticeText');
    if (privacyNoticeEl) {
        privacyNoticeEl.innerHTML = t('privacyNotice');
    }
    
    // Update footer with innerHTML (to preserve formatting)
    const footerEl = document.getElementById('footerText');
    if (footerEl) {
        footerEl.innerHTML = t('footerText');
    }

    // Update header buttons
    const darkModeBtn = document.querySelector('.header-btn[onclick="toggleDarkMode()"] .btn-label');
    const historyBtn = document.querySelector('.header-btn[onclick="viewHistory()"] .btn-label');
    const exportBtn = document.querySelector('.header-btn[onclick="exportResult()"] .btn-label');
    const reportBtn = document.querySelector('.header-btn.report-btn .btn-label');
    const premiumBtn = document.querySelector('.header-btn.premium-btn .btn-label');
    
    if (darkModeBtn) darkModeBtn.textContent = t('darkMode');
    if (historyBtn) historyBtn.textContent = t('history');
    if (exportBtn) exportBtn.textContent = t('save');
    if (reportBtn) reportBtn.textContent = t('report');
    if (premiumBtn) premiumBtn.textContent = t('app');
    
    // Update header button tooltips and aria-labels
    const darkModeHeaderBtn = document.querySelector('.header-btn[onclick="toggleDarkMode()"]');
    const historyHeaderBtn = document.querySelector('.header-btn[onclick="viewHistory()"]');
    const exportHeaderBtn = document.querySelector('.header-btn[onclick="exportResult()"]');
    const reportHeaderBtn = document.querySelector('.header-btn.report-btn');
    const premiumHeaderBtn = document.querySelector('.header-btn.premium-btn');
    
    if (darkModeHeaderBtn) {
        darkModeHeaderBtn.title = t('darkMode');
        darkModeHeaderBtn.setAttribute('aria-label', t('darkMode'));
        darkModeHeaderBtn.setAttribute('data-tooltip', t('darkMode') + ' (' + (window.currentLanguage === 'ar' ? 'EN' : 'عربي') + ')');
    }
    if (historyHeaderBtn) {
        historyHeaderBtn.title = t('history');
        historyHeaderBtn.setAttribute('aria-label', t('history'));
        historyHeaderBtn.setAttribute('data-tooltip', t('history'));
    }
    if (exportHeaderBtn) {
        exportHeaderBtn.title = t('save');
        exportHeaderBtn.setAttribute('aria-label', t('save'));
        exportHeaderBtn.setAttribute('data-tooltip', t('save'));
    }
    if (reportHeaderBtn) {
        reportHeaderBtn.title = t('report');
        reportHeaderBtn.setAttribute('aria-label', t('report'));
        reportHeaderBtn.setAttribute('data-tooltip', t('report'));
    }
    if (premiumHeaderBtn) {
        premiumHeaderBtn.title = t('app');
        premiumHeaderBtn.setAttribute('aria-label', t('app'));
        premiumHeaderBtn.setAttribute('data-tooltip', t('app'));
    }
    
    // Update buttons
    const pasteBtn = document.querySelector('.btn-paste span');
    const clearBtn = document.querySelector('.btn-clear span');
    const analyzeBtn = document.querySelector('.btn-analyze span');
    if (pasteBtn) pasteBtn.textContent = t('paste');
    if (clearBtn) clearBtn.textContent = t('clear');
    if (analyzeBtn) analyzeBtn.textContent = t('analyze');

    // Update textarea placeholder
    const textarea = document.getElementById('messageInput');
    if (textarea) textarea.placeholder = t('placeholder');

    // Update tips list
    updateTipsList();
    
    // Update premium modal language
    if (typeof updatePremiumModalLanguage === 'function') {
        updatePremiumModalLanguage();
    }
}

/**
 * Update tips list with current language
 */
function updateTipsList() {
    const tipsList = document.getElementById('tipsList');
    if (!tipsList) return;
    
    tipsList.innerHTML = `
        <li><span class="tip-icon">🔐</span><span>${t('tip1')}</span></li>
        <li><span class="tip-icon">🔗</span><span>${t('tip2')}</span></li>
        <li><span class="tip-icon">✅</span><span>${t('tip3')}<strong>${t('tip3Value')}</strong></span></li>
        <li><span class="tip-icon">🏛️</span><span>${t('tip4')}<strong>${t('tip4Value')}</strong></span></li>
        <li><span class="tip-icon">⏰</span><span>${t('tip5')}</span></li>
    `;
}

// ============================================================================
// HISTORY MANAGEMENT
// ============================================================================

/**
 * Setup history search functionality
 */
function setupHistorySearch() {
    const searchInput = document.getElementById('historySearch');
    const searchBtn = document.getElementById('historySearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterHistory, 300));
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filterHistory();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', filterHistory);
    }
}

/**
 * Debounce function to limit rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Filter history based on search term
 */
function filterHistory() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase().trim();
    const historyList = document.getElementById('historyList');
    const historyActions = document.getElementById('historyActions');
    
    if (!historyList) return;
    
    // Filter history items
    let filteredHistory = analysisHistory;
    if (searchTerm) {
        filteredHistory = analysisHistory.filter(item => 
            item.message.toLowerCase().includes(searchTerm) ||
            (item.classification && item.classification.toLowerCase().includes(searchTerm)) ||
            (item.classification_ar && item.classification_ar.toLowerCase().includes(searchTerm)) ||
            (item.riskScore && item.riskScore.toString().includes(searchTerm)))
        
    }
    
    // Update display
    if (filteredHistory.length === 0) {
        historyList.innerHTML = `
            <p style="color:var(--text-muted);text-align:center;padding:40px;">
                ${searchTerm ? t('noHistory') + ' "' + searchTerm + '"' : t('noHistory')}
            </p>`;
        historyActions.style.display = 'none';
    } else {
        historyList.innerHTML = filteredHistory.map((item, idx) => {
            // Find the actual index in the original array for proper deletion
            const actualIdx = analysisHistory.findIndex(histItem => 
                histItem.message === item.message && 
                histItem.timestamp === item.timestamp
            );
            
            return `
                <div class="history-item" onclick="loadFromHistory(${actualIdx})">
                    <button class="history-item-delete" 
                            onclick="event.stopPropagation(); deleteHistoryItem(${actualIdx})">×</button>
                    <div class="history-item-text">${item.message}...</div>
                    <div class="history-item-meta">
                        ${window.currentLanguage === 'ar' ? item.classification_ar : item.classification} 
                        (${item.riskScore}%) • ${item.timestamp}
                    </div>
                </div>
            `;
        }).join('');
        historyActions.style.display = 'block';
    }
}

/**
 * Add analysis result to history
 * @param {string} message - Original message
 * @param {Object} result - Analysis result
 */
function addToHistory(message, result) {
    const item = {
        message: sanitizeHTML(message.substring(0, 100)),
        classification: result.classification,
        classification_ar: result.classification_ar,
        riskScore: result.riskScore,
        timestamp: getTimestamp()
    };
    
    analysisHistory.unshift(item);
    analysisHistory = analysisHistory.slice(0, CONFIG.MAX_HISTORY);
    saveToStorage(CONFIG.HISTORY_KEY, analysisHistory);
    updateExportButtonVisibility();
}

/**
 * View analysis history
 */
function viewHistory() {
    // Clear search input
    const searchInput = document.getElementById('historySearch');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Display all history items
    filterHistory();
    
    openModal('historyModal');
}

/**
 * Delete single history item
 * @param {number} idx - Item index
 */
function deleteHistoryItem(idx) {
    if (confirm(t('confirmDeleteOne'))) {
        analysisHistory.splice(idx, 1);
        saveToStorage(CONFIG.HISTORY_KEY, analysisHistory);
        viewHistory();
        showNotification(t('notifDeleted'));
    }
}

/**
 * Clear all history
 */
function clearHistory() {
    if (confirm(t('confirmDeleteAll'))) {
        analysisHistory = [];
        removeFromStorage(CONFIG.HISTORY_KEY);
        viewHistory();
        showNotification(t('notifAllDeleted'));
    }
}

/**
 * Load message from history (placeholder for future implementation)
 * @param {number} idx - Item index
 */
function loadFromHistory(idx) {
    closeModal('historyModal');
    // Future: Could load the original message for re-analysis
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

/**
 * Export analysis result
 */
function exportResult() {
    const resultCard = document.getElementById('resultCard');
    if (!resultCard.classList.contains('show')) {
        showNotification(t('notifNoResult'), 'warning');
        return;
    }
    
    const resultText = resultCard.innerText;
    const textarea = document.getElementById('messageInput');
    const timestamp = getTimestamp();
    
    const exportData = `تنـبَّـه - Tanabbah
${'='.repeat(50)}
${timestamp}

${textarea.value}

${resultText}`;
    
    // Try clipboard API first
    navigator.clipboard.writeText(exportData).then(() => {
        showNotification(t('notifSaved'));
    }).catch(() => {
        // Fallback: Download as file
        const blob = new Blob([exportData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tanabbah-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification(t('notifSaved'));
    });
}

// ============================================================================
// REPORT FUNCTIONALITY
// ============================================================================

/**
 * Open report modal
 */
function openReportModal() {
    const textarea = document.getElementById('messageInput');
    if (!textarea.value.trim()) {
        showNotification(t('notifNoMessage'), 'warning');
        return;
    }
    
    openModal('reportModal');
}

/**
 * Send report to authorities
 */
async function sendReport() {
    const textarea = document.getElementById('messageInput');
    const message = textarea.value.trim();
    
    if (!message) {
        showNotification(t('notifNoMessage'), 'warning');
        return;
    }
    
    closeModal('reportModal');
    showNotification(t('reportSending'), 'info');
    
    try {
        const success = await sendReportToAPI(message);
        
        if (success) {
            showNotification(t('reportSent'));
        } else {
            showNotification(t('reportFailed'), 'error');
        }
    } catch (err) {
        showNotification(t('reportFailed'), 'error');
    }
}

// ============================================================================
// PREMIUM MODAL FUNCTIONS
// ============================================================================

/**
 * Open premium/app download modal
 */
function openPremiumModal() {
    openModal('premiumModal');
}

/**
 * Close premium modal
 */
function closePremiumModal() {
    closeModal('premiumModal');
}

/**
 * Handle app download
 * @param {string} platform - 'ios' or 'android'
 */
function downloadApp(platform) {
    const message = platform === 'ios' 
        ? (window.currentLanguage === 'ar' ? '📱 قريباً على App Store' : '📱 Coming soon to App Store')
        : (window.currentLanguage === 'ar' ? '📱 قريباً على Google Play' : '📱 Coming soon to Google Play');
    
    showNotification(message, 'info');
}

// ============================================================================
// WINDOW ERROR HANDLER
// ============================================================================

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// ============================================================================
// CONSOLE LOG
// ============================================================================

console.log('%cTanabbah v2.0.0', 'font-size: 20px; font-weight: bold; color: #059669;');
console.log('%cAll systems operational', 'color: #6b7280;');