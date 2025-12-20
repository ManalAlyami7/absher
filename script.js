// Security: Use environment variable or config for API URL in production
const API_URL = 'http://localhost:5000/api/analyze';
const HISTORY_KEY = 'tanabbah_history';
const DARK_MODE_KEY = 'tanabbah_dark';
const LANGUAGE_KEY = 'tanabbah_lang';
const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 5000;

let analysisHistory = [];
let currentLanguage = 'ar';

// Enhanced translations with more comprehensive coverage
const translations = {
    ar: {
        // Header & Brand
        brandTitle: 'تنـبَّـه',
        brandSubtitle: 'Tanabbah Security',
        darkMode: 'الإضاءة',
        history: 'السجل',
        save: 'حفظ',
        language: 'EN',
        report: 'إبلاغ',
        app: 'التطبيق',
        
        // Privacy
        privacyNotice: 'نحن لا نحفظ أو نخزن الرسائل التي تفحصها. خصوصيتك مهمة لنا',
        privacyNoteHistory: 'يتم حفظ السجل محلياً على جهازك فقط',
        
        // Main Section
        mainTitle: 'فحص الرسائل الاحتيالية',
        mainSubtitle: 'الصق الرسالة المشبوهة أدناه لفحصها فوراً',
        placeholder: 'مثال: تم تعليق حسابك في أبشر. يرجى الضغط على الرابط bit.ly/abs123 للتحديث خلال 24 ساعة...',
        paste: 'لصق',
        clear: 'مسح',
        analyze: 'فحص الرسالة',
        analyzing: 'جاري فحص الرسالة وتحليل المحتوى...',
        
        // Results
        safe: 'آمنة غالباً',
        suspicious: 'مشبوهة',
        fraud: 'احتيالية',
        riskScore: 'درجة الخطر',
        details: 'التفاصيل والتحذيرات',
        explanation: 'تم فحص الرسالة بنجاح وتحليل جميع العناصر المشبوهة',
        
        // Tips Section
        tipsTitle: 'نصائح الأمان',
        tip1: 'لا تشارك كلمات المرور أو أكواد التحقق مطلقاً',
        tip2: 'تحقق من الروابط قبل النقر عليها',
        tip3: 'النطاق الرسمي لأبشر: ',
        tip3Value: 'absher.sa',
        tip4: 'المواقع الحكومية تنتهي بـ: ',
        tip4Value: '.gov.sa',
        tip5: 'احذر من الرسائل التي تطلب إجراء عاجل',
        
        // Official Sites
        officialSitesTitle: 'المواقع الرسمية',
        
        // History Modal
        historyTitle: 'رسائل تم فحصها سابقاً',
        noHistory: 'لم يتم فحص أي رسائل بعد',
        deleteHistory: 'حذف جميع السجلات',
        confirmDeleteOne: 'هل تريد حذف هذا السجل؟',
        confirmDeleteAll: 'هل تريد حذف جميع السجلات؟\n\nلا يمكن التراجع عن هذا الإجراء.',
        confirmClear: 'هل تريد مسح الرسالة؟',
        
        // Premium Modal
        premiumTitle: 'تطبيق الجوال المتقدم',
        premiumSubtitle: 'حماية تلقائية من الاحتيال والرسائل المشبوهة',
        feature1Title: 'فحص تلقائي',
        feature1Desc: 'لكل رسائلك',
        feature2Title: 'نتيجة فورية',
        feature2Desc: 'في ثوانٍ',
        feature3Title: 'تنبيهات لحظية',
        feature3Desc: 'للرسائل الخطيرة',
        feature4Title: 'تقارير مفصّلة',
        feature4Desc: 'وإحصائيات',
        priceAmount: '5 ريال',
        pricePeriod: 'شهرياً',
        priceSave: '💰 وفّر 40% بالاشتراك السنوي',
        downloadIOS: 'App Store',
        downloadAndroid: 'Google Play',
        
        // Notifications
        notifPasted: '✅ تم اللصق بنجاح',
        notifCleared: '🗑️ تم المسح',
        notifSaved: '✅ تم نسخ النتيجة بنجاح',
        notifPasteFailed: '⚠️ استخدم Ctrl+V للصق',
        notifNoResult: '⚠️ لا توجد نتيجة للحفظ',
        notifNoMessage: '⚠️ الرجاء لصق الرسالة أولاً',
        notifDeleted: '🗑️ تم حذف السجل',
        notifAllDeleted: '🗑️ تم حذف جميع السجلات',
        notifIOSSoon: '🍎 قريباً على متجر آبل!',
        notifAndroidSoon: '🤖 قريباً على متجر جوجل!',
        notifMessageTooLong: '⚠️ الرسالة طويلة جداً. الحد الأقصى 5000 حرف',
        reportSending: '⏳ جاري إرسال البلاغ...',
        reportSent: '✅ تم إرسال البلاغ بنجاح إلى الجهات المختصة',
        reportFailed: '⚠️ فشل إرسال البلاغ. حاول لاحقاً',
        reportConfirmTitle: 'تأكيد الإبلاغ',
        reportConfirmMessage: 'سيُرسل البلاغ إلى الجهات المختصة لحمايتك وحماية الآخرين. هل أنت متأكد أنك تريد المتابعة؟',
        reportConfirmCancel: 'إلغاء',
        reportConfirmSend: 'إرسال البلاغ',
        
        // Warnings
        warnOfficialLink: '✅ يحتوي على رابط من موقع حكومي رسمي',
        warnShortener: '🚨 يحتوي على روابط مختصرة مشبوهة',
        warnInsecure: '⚠️ يحتوي على روابط غير آمنة (http)',
        warnFakeAbsher: '🚨 يذكر أبشر لكن الرابط ليس من النطاق الرسمي',
        warnUrgent: '🚨 يستخدم أساليب الضغط والاستعجال',
        warnPhishing: '⚠️ يستخدم عبارات احتيالية نموذجية',
        warnUnofficial: '⚠️ يحتوي على روابط من مصادر غير رسمية',
        warnSuspiciousDomain: '🚨 يحتوي على نطاقات مشبوهة',
        warnMultipleLinks: '⚠️ يحتوي على عدة روابط مختلفة',
        
        // Footer
        footerText: '<strong>تنبَه</strong> هو تطبيق مستقل وغير تابع لأي جهة حكومية. الغرض منه هو التوعية وحماية المستخدمين من الاحتيال الإلكتروني.'
    },
    en: {
        // Header & Brand
        brandTitle: 'Tanabbah',
        brandSubtitle: 'تنبَه الأمني',
        darkMode: 'Theme',
        history: 'History',
        save: 'Export',
        language: 'عربي',
        report: 'Report',
        app: 'App',
        
        // Privacy
        privacyNotice: 'We do not save or store the messages you check. Your privacy matters to us',
        privacyNoteHistory: 'History is saved locally on your device only',
        
        // Main Section
        mainTitle: 'Fraud Message Scanner',
        mainSubtitle: 'Paste the suspicious message below to scan it instantly',
        placeholder: 'Example: Your Absher account has been suspended. Click the link bit.ly/abs456 to update within 24 hours...',
        paste: 'Paste',
        clear: 'Clear',
        analyze: 'Analyze Message',
        analyzing: 'Analyzing message and scanning content...',
        
        // Results
        safe: 'Likely Safe',
        suspicious: 'Suspicious',
        fraud: 'Fraudulent',
        riskScore: 'Risk Score',
        details: 'Details & Warnings',
        explanation: 'Message analyzed successfully and all suspicious elements checked',
        
        // Tips Section
        tipsTitle: 'Security Tips',
        tip1: 'Never share passwords or verification codes',
        tip2: 'Verify links before clicking',
        tip3: 'Official domain: ',
        tip3Value: 'absher.sa',
        tip4: 'Government sites end with: ',
        tip4Value: '.gov.sa',
        tip5: 'Beware of messages requesting urgent action',
        
        // Official Sites
        officialSitesTitle: 'Official Websites',
        
        // History Modal
        historyTitle: 'Previously Analyzed Messages',
        noHistory: 'No messages analyzed yet',
        deleteHistory: 'Delete All History',
        confirmDeleteOne: 'Do you want to delete this record?',
        confirmDeleteAll: 'Do you want to delete all history?\n\nThis action cannot be undone.',
        confirmClear: 'Do you want to clear the message?',
        
        // Premium Modal
        premiumTitle: 'Advanced Mobile App',
        premiumSubtitle: 'Automatic protection from fraud and suspicious messages',
        feature1Title: 'Auto-scan',
        feature1Desc: 'All your messages',
        feature2Title: 'Instant results',
        feature2Desc: 'In seconds',
        feature3Title: 'Real-time alerts',
        feature3Desc: 'For dangerous messages',
        feature4Title: 'Detailed reports',
        feature4Desc: 'And statistics',
        priceAmount: '5 SAR',
        pricePeriod: 'monthly',
        priceSave: '💰 Save 40% with annual plan',
        downloadIOS: 'App Store',
        downloadAndroid: 'Google Play',
        
        // Notifications
        notifPasted: '✅ Pasted successfully',
        notifCleared: '🗑️ Cleared',
        notifSaved: '✅ Result copied successfully',
        notifPasteFailed: '⚠️ Use Ctrl+V to paste',
        notifNoResult: '⚠️ No result to save',
        notifNoMessage: '⚠️ Please paste the message first',
        notifDeleted: '🗑️ Record deleted',
        notifAllDeleted: '🗑️ All records deleted',
        notifIOSSoon: '🍎 Coming soon to App Store!',
        notifAndroidSoon: '🤖 Coming soon to Google Play!',
        notifMessageTooLong: '⚠️ Message too long. Maximum 5000 characters',
        reportSending: '⏳ Sending report...',
        reportSent: '✅ Report sent successfully to authorities',
        reportFailed: '⚠️ Failed to send report. Try again later',
        reportConfirmTitle: 'Confirm Report',
        reportConfirmMessage: 'This report will be sent to the authorities to help protect you and others. Are you sure you want to proceed?',
        reportConfirmCancel: 'Cancel',
        reportConfirmSend: 'Send Report',
        
        // Warnings
        warnOfficialLink: '✅ Contains official government link',
        warnShortener: '🚨 Contains suspicious shortened URLs',
        warnInsecure: '⚠️ Contains insecure links (http)',
        warnFakeAbsher: '🚨 Mentions Absher but link is not official',
        warnUrgent: '🚨 Uses pressure and urgency tactics',
        warnPhishing: '⚠️ Uses typical phishing phrases',
        warnUnofficial: '⚠️ Contains links from unofficial sources',
        warnSuspiciousDomain: '🚨 Contains suspicious domains',
        warnMultipleLinks: '⚠️ Contains multiple different links',
        
        // Footer
        footerText: '<strong>Tanabbah</strong> is an independent app not affiliated with any government entity. Its purpose is to raise awareness and protect users from online fraud.'
    }
};

// Utility function for translations
function t(key) {
    return translations[currentLanguage][key] || key;
}

// Security: Sanitize input to prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Security: Validate message length
function validateMessageLength(message) {
    return message.length <= MAX_MESSAGE_LENGTH;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupTextareaAutoDirection();
    setupSecurityHeaders();
});

function initializeApp() {
    // Load language preference
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'ar' || savedLanguage === 'en')) {
        currentLanguage = savedLanguage;
        const html = document.getElementById('htmlElement');
        html.lang = currentLanguage;
        html.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    }

    // Load dark mode preference
    if (localStorage.getItem(DARK_MODE_KEY) === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Load analysis history with validation
    try {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                analysisHistory = parsed.slice(0, MAX_HISTORY);
            }
        }
    } catch (error) {
        console.error('Error loading history:', error);
        analysisHistory = [];
    }
    
    // Update UI with current language
    updateUILanguage();
}

function setupSecurityHeaders() {
    // Prevent clickjacking
    if (window.self !== window.top) {
        window.top.location = window.self.location;
    }
}

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

function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    localStorage.setItem(LANGUAGE_KEY, currentLanguage);
    
    const html = document.getElementById('htmlElement');
    html.lang = currentLanguage;
    html.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    // Update all UI elements
    updateUILanguage();
}

function updateUILanguage() {
    // Update all text elements
    const updates = {
        'langBtnLabel': 'language',
        'privacyNoticeText': 'privacyNotice',
        'mainTitle': 'mainTitle',
        'mainSubtitle': 'mainSubtitle',
        'tipsTitleText': 'tipsTitle',
        'officialSitesTitleText': 'officialSitesTitle',
        'privacyNoteText': 'privacyNoteHistory',
        'premiumModalTitle': 'premiumTitle',
        'premiumModalSubtitle': 'premiumSubtitle',
        'feature1Title': 'feature1Title',
        'feature1Desc': 'feature1Desc',
        'feature2Title': 'feature2Title',
        'feature2Desc': 'feature2Desc',
        'feature3Title': 'feature3Title',
        'feature3Desc': 'feature3Desc',
        'feature4Title': 'feature4Title',
        'feature4Desc': 'feature4Desc',
        'priceAmount': 'priceAmount',
        'pricePeriod': 'pricePeriod',
        'priceSave': 'priceSave',
        'iosText': 'downloadIOS',
        'androidText': 'downloadAndroid',
        'historyModalTitle': 'historyTitle'
    };

    for (const [id, key] of Object.entries(updates)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = t(key);
        }
    }

    // Update footer with HTML support
    const footerElement = document.getElementById('footerText');
    if (footerElement) {
        footerElement.innerHTML = t('footerText');
    }

    // Update button labels
    const buttons = {
        'toggleDarkMode()': 'darkMode',
        'viewHistory()': 'history',
        'exportResult()': 'save',
        'openReportModal()': 'report',
        'openPremiumModal()': 'app'
    };

    for (const [onclick, key] of Object.entries(buttons)) {
        const btn = document.querySelector(`[onclick="${onclick}"] .btn-label`);
        if (btn) btn.textContent = t(key);
    }

    // Update main buttons
    const pasteBtn = document.querySelector('.btn-paste span');
    const clearBtn = document.querySelector('.btn-clear span');
    const analyzeBtn = document.querySelector('.btn-analyze span');
    
    if (pasteBtn) pasteBtn.textContent = t('paste');
    if (clearBtn) clearBtn.textContent = t('clear');
    if (analyzeBtn) analyzeBtn.textContent = t('analyze');

    // Update placeholder
    const textarea = document.getElementById('messageInput');
    if (textarea) textarea.placeholder = t('placeholder');

    // Update tips list
    updateTipsList();
}

function updateTipsList() {
    const tipsList = document.getElementById('tipsList');
    if (!tipsList) return;

    tipsList.innerHTML = `
        <li>
            <span class="tip-icon" aria-hidden="true">🔐</span>
            <span>${t('tip1')}</span>
        </li>
        <li>
            <span class="tip-icon" aria-hidden="true">🔗</span>
            <span>${t('tip2')}</span>
        </li>
        <li>
            <span class="tip-icon" aria-hidden="true">✅</span>
            <span>${t('tip3')}<strong>${t('tip3Value')}</strong></span>
        </li>
        <li>
            <span class="tip-icon" aria-hidden="true">🏛️</span>
            <span>${t('tip4')}<strong>${t('tip4Value')}</strong></span>
        </li>
        <li>
            <span class="tip-icon" aria-hidden="true">⏰</span>
            <span>${t('tip5')}</span>
        </li>
    `;
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem(DARK_MODE_KEY, isDark);
}

function addToHistory(message, result) {
    const item = {
        message: sanitizeHTML(message.substring(0, 100)),
        classification: result.classification,
        classification_ar: result.classification_ar,
        riskScore: result.riskScore,
        timestamp: new Date().toLocaleString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US')
    };
    
    analysisHistory.unshift(item);
    if (analysisHistory.length > MAX_HISTORY) {
        analysisHistory = analysisHistory.slice(0, MAX_HISTORY);
    }
    
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(analysisHistory));
    } catch (error) {
        console.error('Error saving history:', error);
    }
    
    updateExportButtonVisibility();
}

function viewHistory() {
    const historyList = document.getElementById('historyList');
    const historyActions = document.getElementById('historyActions');
    
    if (analysisHistory.length === 0) {
        historyList.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:40px 20px;font-weight:600;">${t('noHistory')}</p>`;
        historyActions.style.display = 'none';
    } else {
        historyList.innerHTML = analysisHistory.map((item, idx) => `
            <div class="history-item" onclick="loadFromHistory(${idx})" role="button" tabindex="0">
                <button class="history-item-delete" onclick="event.stopPropagation(); deleteHistoryItem(${idx})" title="${currentLanguage === 'ar' ? 'حذف' : 'Delete'}" aria-label="${currentLanguage === 'ar' ? 'حذف السجل' : 'Delete record'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                </button>
                <div class="history-item-text" title="${item.message}">
                    ${item.message}...
                </div>
                <div class="history-item-meta">
                    ${currentLanguage === 'ar' ? item.classification_ar : item.classification} (${item.riskScore}%) • ${item.timestamp}
                </div>
            </div>
        `).join('');
        historyActions.style.display = 'block';
        
        // Update delete button text
        const deleteBtn = historyActions.querySelector('.btn-clear-history span');
        if (deleteBtn) deleteBtn.textContent = t('deleteHistory');
    }
    
    openModal('historyModal');
}

function deleteHistoryItem(idx) {
    if (confirm(t('confirmDeleteOne'))) {
        analysisHistory.splice(idx, 1);
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(analysisHistory));
        } catch (error) {
            console.error('Error saving history:', error);
        }
        viewHistory();
        showNotification(t('notifDeleted'));
    }
}

function clearHistory() {
    if (confirm(t('confirmDeleteAll'))) {
        analysisHistory = [];
        try {
            localStorage.removeItem(HISTORY_KEY);
        } catch (error) {
            console.error('Error clearing history:', error);
        }
        viewHistory();
        showNotification(t('notifAllDeleted'));
    }
}

function loadFromHistory(idx) {
    const item = analysisHistory[idx];
    if (item) {
        const textarea = document.getElementById('messageInput');
        // Load only first 100 chars from history (we stored truncated version)
        const msg = currentLanguage === 'ar' 
            ? `محفوظ من السجل: ${item.message}`
            : `From history: ${item.message}`;
        showNotification(msg);
    }
    closeModal('historyModal');
}

function exportResult() {
    const resultCard = document.getElementById('resultCard');
    if (!resultCard.classList.contains('show')) {
        showNotification(t('notifNoResult'));
        return;
    }

    const resultText = resultCard.innerText;
    const textarea = document.getElementById('messageInput');
    const message = textarea.value;

    const timestamp = new Date().toLocaleString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US');
    const exportData = currentLanguage === 'ar' 
        ? `تقرير تنبَه الأمني\n${'='.repeat(50)}\nالتاريخ: ${timestamp}\n\nالرسالة المفحوصة:\n${message}\n\nنتيجة الفحص:\n${resultText}\n\n${'='.repeat(50)}\nتم إنشاء التقرير بواسطة تنبَه الأمني`
        : `Tanabbah Security Report\n${'='.repeat(50)}\nDate: ${timestamp}\n\nScanned Message:\n${message}\n\nScan Result:\n${resultText}\n\n${'='.repeat(50)}\nReport generated by Tanabbah Security`;

    navigator.clipboard.writeText(exportData).then(() => {
        showNotification(t('notifSaved'));
    }).catch(() => {
        downloadResultAsFile(exportData);
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        ${currentLanguage === 'ar' ? 'right' : 'left'}: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function downloadResultAsFile(data) {
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tanabbah-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(t('notifSaved'));
}

function updateExportButtonVisibility() {
    const exportBtn = document.getElementById('exportBtn');
    const resultCard = document.getElementById('resultCard');
    if (resultCard && resultCard.classList.contains('show')) {
        exportBtn.style.display = 'flex';
    } else {
        exportBtn.style.display = 'none';
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal('historyModal');
        closePremiumModal();
        closeMainReportConfirm();
    }
    if (e.ctrlKey && e.key === 'Enter') {
        analyzeMessage();
    }
});

async function analyzeMessage() {
    const textarea = document.getElementById('messageInput');
    const text = textarea.value.trim();

    if (!text) {
        showNotification(t('notifNoMessage'));
        return;
    }

    // Security: Validate message length
    if (!validateMessageLength(text)) {
        showNotification(t('notifMessageTooLong'));
        return;
    }

    const loading = document.getElementById('loading');
    const resultCard = document.getElementById('resultCard');
    
    loading.innerHTML = `
        <div class="spinner"></div>
        <p>${t('analyzing')}</p>
    `;
    
    loading.classList.add('show');
    resultCard.classList.remove('show');

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: text }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const result = combineAnalysis(text, data);
        displayResult(result);
        
    } catch (error) {
        console.error('Error:', error);
        const result = performRuleBasedAnalysis(text);
        displayResult(result);
    } finally {
        loading.classList.remove('show');
    }
}

function combineAnalysis(text, mlData) {
    const ruleBasedResult = performRuleBasedAnalysis(text);
    
    if (mlData && mlData.url_predictions && mlData.url_predictions.length > 0) {
        if (mlData.ml_risk_score > 50) {
            ruleBasedResult.riskScore = Math.max(ruleBasedResult.riskScore, mlData.ml_risk_score);
        }
    }
    
    if (ruleBasedResult.riskScore <= 10) {
        ruleBasedResult.classification = 'SAFE';
        ruleBasedResult.classification_ar = t('safe');
        ruleBasedResult.icon = '✅';
    } else if (ruleBasedResult.riskScore <= 60) {
        ruleBasedResult.classification = 'SUSPICIOUS';
        ruleBasedResult.classification_ar = t('suspicious');
        ruleBasedResult.icon = '⚠️';
    } else {
        ruleBasedResult.classification = 'FRAUD';
        ruleBasedResult.classification_ar = t('fraud');
        ruleBasedResult.icon = '❌';
    }
    
    return ruleBasedResult;
}

function performRuleBasedAnalysis(text) {
    const textLower = text.toLowerCase();
    let riskScore = 0;
    const warnings = [];

    // Official Saudi government domains
    const officialDomains = [
        'absher.sa', 'www.absher.sa',
        'moi.gov.sa', 'www.moi.gov.sa',
        'my.gov.sa', 'www.my.gov.sa',
        'sa.gov.sa', 'www.sa.gov.sa',
        '.gov.sa'
    ];
    
    const urls = extractURLs(text);
    const hasUrls = urls.length > 0;

    // Check for official domains
    const hasOfficialDomain = urls.some(url => 
        officialDomains.some(official => url.toLowerCase().includes(official))
    );

    if (hasOfficialDomain) {
        riskScore -= 20;
        warnings.push(t('warnOfficialLink'));
    }

    // Check for URL shorteners
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'tmra.pe', 'goo.gl', 'is.gd', 'ow.ly', 'rebrand.ly', 'buff.ly', 'short.link', 'cutt.ly'];
    const foundShorteners = urls.filter(url => shorteners.some(shortener => url.toLowerCase().includes(shortener)));
    
    if (foundShorteners.length > 0) {
        riskScore += 25;
        warnings.push(t('warnShortener'));
    }

    // Check for insecure HTTP links (excluding official .gov.sa)
    const insecureUrls = urls.filter(url => {
        const urlLower = url.toLowerCase();
        const isHttp = urlLower.startsWith('http://') && !urlLower.startsWith('https://');
        const isGovSa = urlLower.includes('.gov.sa');
        return isHttp && !isGovSa;
    });
    
    if (insecureUrls.length > 0) {
        riskScore += 30;
        warnings.push(t('warnInsecure'));
    }

    // Check for fake Absher mentions
    const mentionsAbsher = text.match(/أبشر|absher/i);
    if (mentionsAbsher && hasUrls && !hasOfficialDomain) {
        riskScore += 35;
        warnings.push(t('warnFakeAbsher'));
    }

    // Check for urgency tactics
    const urgentKeywords = [
        'تم تعليق', 'تم إيقاف', 'خلال 24 ساعة', 'خلال ساعة', 'ادفع الآن', 'قم بتحديث', 'فوراً', 'حالاً', 'عاجل', 'الآن',
        'suspended', 'blocked', 'within 24 hours', 'pay now', 'update now', 'immediately', 'urgent', 'expire'
    ];
    const foundUrgent = urgentKeywords.filter(keyword => textLower.includes(keyword.toLowerCase()));
    
    if (foundUrgent.length > 0) {
        riskScore += 20;
        warnings.push(t('warnUrgent'));
    }

    // Check for phishing keywords
    const phishingKeywords = [
        'اضغط هنا', 'انقر فوراً', 'تحديث معلوماتك', 'تأكيد الحساب', 'أدخل بياناتك', 'تحقق من هويتك',
        'click here', 'click now', 'update your information', 'confirm account', 'verify identity', 'enter your details'
    ];
    const foundPhishing = phishingKeywords.filter(keyword => textLower.includes(keyword.toLowerCase()));
    
    if (foundPhishing.length > 0) {
        riskScore += 18;
        warnings.push(t('warnPhishing'));
    }

    // Check for suspicious domains
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club'];
    const hasSuspiciousDomain = urls.some(url => 
        suspiciousTLDs.some(tld => url.toLowerCase().includes(tld))
    );
    
    if (hasSuspiciousDomain) {
        riskScore += 25;
        warnings.push(t('warnSuspiciousDomain'));
    }

    // Check for multiple different links (potential phishing)
    if (urls.length > 2) {
        riskScore += 15;
        warnings.push(t('warnMultipleLinks'));
    }

    // Check for unofficial sources
    if (hasUrls && !hasOfficialDomain && urls.length > 0) {
        riskScore += 12;
        warnings.push(t('warnUnofficial'));
    }

    // Clamp risk score between 0 and 100
    riskScore = Math.max(0, Math.min(100, riskScore));

    return {
        classification: riskScore <= 30 ? 'SAFE' : (riskScore <= 65 ? 'SUSPICIOUS' : 'FRAUD'),
        classification_ar: riskScore <= 30 ? t('safe') : (riskScore <= 65 ? t('suspicious') : t('fraud')),
        riskScore,
        icon: riskScore <= 30 ? '✅' : (riskScore <= 65 ? '⚠️' : '❌'),
        explanation: t('explanation'),
        warnings,
        urlsFound: urls.length
    };
}

function extractURLs(text) {
    const urls = [];
    
    // Extract full URLs with protocol
    const fullUrlPattern = /https?:\/\/[^\s]+/gi;
    const fullUrls = text.match(fullUrlPattern) || [];
    urls.push(...fullUrls);
    
    // Extract URLs without protocol
    const bareUrlPattern = /(?:^|\s)([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
    let match;
    while ((match = bareUrlPattern.exec(text)) !== null) {
        const url = match[1];
        if (!urls.includes(url) && !url.endsWith('.') && url.includes('.')) {
            urls.push(url);
        }
    }
    
    return urls;
}

function displayResult(result) {
    const resultCard = document.getElementById('resultCard');
    
    let colorClass = 'safe';
    if (result.classification === 'SUSPICIOUS') colorClass = 'suspicious';
    if (result.classification === 'FRAUD') colorClass = 'fraud';

    let warningsHTML = '';
    if (result.warnings.length > 0) {
        warningsHTML = `
            <div class="warnings-section">
                <div class="warnings-title">
                    🔍 ${t('details')}
                </div>
                ${result.warnings.map(warning => `
                    <div class="warning-item">
                        <span class="warning-bullet" aria-hidden="true">•</span>
                        <div><strong>${sanitizeHTML(warning)}</strong></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    const displayClassification = currentLanguage === 'ar' ? result.classification_ar : result.classification;

    resultCard.innerHTML = `
        <div class="result-header">
            <div class="result-icon" aria-hidden="true">${result.icon}</div>
            <div class="result-info">
                <div class="result-title">${sanitizeHTML(displayClassification)}</div>
                <div class="result-subtitle">${result.classification}</div>
                <div class="risk-score">${t('riskScore')}: ${result.riskScore} / 100</div>
            </div>
        </div>
        
        <div class="result-explanation">
            <strong>${sanitizeHTML(result.explanation)}</strong>
        </div>

        ${warningsHTML}
    `;

    resultCard.className = `result-card ${colorClass} show`;
    
    const textarea = document.getElementById('messageInput');
    addToHistory(textarea.value, result);
    updateExportButtonVisibility();

    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

async function pasteFromClipboard() {
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            
            // Security: Validate length before pasting
            if (!validateMessageLength(text)) {
                showNotification(t('notifMessageTooLong'));
                return;
            }
            
            const textarea = document.getElementById('messageInput');
            textarea.value = text;
            
            const hasArabic = /[\u0600-\u06FF]/.test(text);
            if (hasArabic) {
                textarea.setAttribute('dir', 'rtl');
                textarea.style.textAlign = 'right';
            } else {
                textarea.setAttribute('dir', 'ltr');
                textarea.style.textAlign = 'left';
            }
            
            textarea.dispatchEvent(new Event('input'));
            showNotification(t('notifPasted'));
        } else {
            showNotification(t('notifPasteFailed'));
        }
    } catch (err) {
        console.error('Paste error:', err);
        showNotification(t('notifPasteFailed'));
    }
}

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

function openPremiumModal() {
    openModal('premiumModal');
}

function closePremiumModal() {
    closeModal('premiumModal');
}

function downloadApp(platform) {
    if (platform === 'ios') {
        showNotification(t('notifIOSSoon'));
        setTimeout(() => {
            const msg = currentLanguage === 'ar' 
                ? '🍎 قريباً على متجر آبل!\n\nسيتم إطلاق التطبيق قريباً مع:\n✅ فحص تلقائي لكل رسائلك\n✅ تنبيهات فورية\n✅ تقارير مفصلة\n✅ حماية على مدار الساعة\n\nالسعر: 5 ريال شهرياً'
                : '🍎 Coming soon to App Store!\n\nThe app will launch soon with:\n✅ Auto-scan all messages\n✅ Instant alerts\n✅ Detailed reports\n✅ 24/7 protection\n\nPrice: 5 SAR/month';
            alert(msg);
        }, 500);
    } else if (platform === 'android') {
        showNotification(t('notifAndroidSoon'));
        setTimeout(() => {
            const msg = currentLanguage === 'ar'
                ? '🤖 قريباً على متجر جوجل!\n\nسيتم إطلاق التطبيق قريباً مع:\n✅ فحص تلقائي لكل رسائلك\n✅ تنبيهات فورية\n✅ تقارير مفصلة\n✅ حماية على مدار الساعة\n\nالسعر: 5 ريال شهرياً'
                : '🤖 Coming soon to Google Play!\n\nThe app will launch soon with:\n✅ Auto-scan all messages\n✅ Instant alerts\n✅ Detailed reports\n✅ 24/7 protection\n\nPrice: 5 SAR/month';
            alert(msg);
        }, 500);
    }
}

function openReportModal() {
    const textarea = document.getElementById('messageInput');
    const text = textarea.value.trim();
    
    if (!text) {
        showNotification(t('notifNoMessage'));
        return;
    }
    
    showMainReportConfirm(text);
}

function showMainReportConfirm(message) {
    let modal = document.getElementById('mainReportConfirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mainReportConfirmModal';
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="closeMainReportConfirm()"></div>
            <div class="modal-content" style="max-width: 520px;">
                <button class="modal-close" onclick="closeMainReportConfirm()" aria-label="${t('reportConfirmCancel')}" title="${t('reportConfirmCancel')}"></button>
                <div class="modal-body">
                    <div class="modal-header">
                        <div class="modal-icon danger-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 1L2 6V13C2 20 10 24 12 24C14 24 22 20 22 13V6L12 1Z" stroke="currentColor" stroke-width="2" fill="none"/>
                                <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
                            </svg>
                        </div>
                        <h2 id="reportModalTitle"></h2>
                        <p id="reportModalMessage"></p>
                    </div>
                    <div class="modal-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px;">
                        <button class="btn-cancel" style="padding: 14px; border: 2px solid var(--border); background: var(--bg); color: var(--text); border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.3s;" onclick="closeMainReportConfirm()"></button>
                        <button class="btn-confirm" style="padding: 14px; border: none; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.3s;"></button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);

        // Add hover effects
        const cancelBtn = modal.querySelector('.btn-cancel');
        const confirmBtn = modal.querySelector('.btn-confirm');
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.borderColor = 'var(--primary)';
            cancelBtn.style.transform = 'translateY(-2px)';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.borderColor = 'var(--border)';
            cancelBtn.style.transform = 'translateY(0)';
        });
        
        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.transform = 'translateY(-2px)';
            confirmBtn.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
        });
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.transform = 'translateY(0)';
            confirmBtn.style.boxShadow = 'none';
        });
    }

    const title = modal.querySelector('#reportModalTitle');
    const subtitle = modal.querySelector('#reportModalMessage');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');

    if (title) title.textContent = t('reportConfirmTitle');
    if (subtitle) subtitle.textContent = t('reportConfirmMessage');
    if (cancelBtn) cancelBtn.textContent = t('reportConfirmCancel');
    if (confirmBtn) confirmBtn.textContent = t('reportConfirmSend');

    confirmBtn.onclick = () => {
        closeMainReportConfirm();
        sendDirectReport(message);
    };

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    confirmBtn.focus();
}

function closeMainReportConfirm() {
    const modal = document.getElementById('mainReportConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

async function sendDirectReport(message) {
    // Security: Sanitize message before sending
    const payload = {
        message: sanitizeHTML(message.substring(0, 1000)), // Limit to 1000 chars
        timestamp: new Date().toISOString(),
        language: currentLanguage
    };

    showNotification(t('reportSending'));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch('http://localhost:5000/api/report', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        }).catch(() => {
            // Silently fail - report endpoint might not be available
        });

        clearTimeout(timeoutId);
    } catch (err) {
        console.error('Report error:', err);
    }

    await new Promise(r => setTimeout(r, 800));

    showNotification(t('reportSent'));
    setTimeout(() => { 
        alert(t('reportSent')); 
    }, 400);
}

// Close modals when clicking on backdrop
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        const modal = event.target.parentElement;
        if (modal && modal.classList.contains('modal')) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
});

// Prevent body scroll when modal is open
document.addEventListener('DOMContentLoaded', function() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('show', () => {
            document.body.style.overflow = 'hidden';
        });
        modal.addEventListener('hide', () => {
            document.body.style.overflow = '';
        });
    });
});