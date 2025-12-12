const API_URL = 'http://localhost:5000/api/analyze';
const HISTORY_KEY = 'absher_analysis_history';
const DARK_MODE_KEY = 'absher_dark_mode';
const LANGUAGE_KEY = 'absher_language';
let analysisHistory = [];
const translations = {
    ar: {
        // Header
        brandTitle: 'أبشر الأمني',
        brandSubtitle: 'Absher Security',
        darkMode: 'الإضاءة',
        history: 'السجل',
        save: 'حفظ',
        language: 'EN',
        report: 'إبلاغ',
        app: 'التطبيق',
        
        // Input
        inputLabel: 'الصق الرسالة المشبوهة هنا:',
        placeholder: 'مثال: تم تعليق حسابك في أبشر. يرجى الضغط على الرابط bit.ly/abs123 للتحديث خلال 24 ساعة...',
        paste: 'لصق',
        clear: 'مسح',
        analyze: 'فحص الرسالة',
        analyzing: 'جاري فحص الرسالة...',
        
        // Results
        safe: 'آمنة غالباً',
        suspicious: 'مشبوهة',
        fraud: 'احتيالية',
        riskScore: 'درجة الخطر',
        details: 'التفاصيل والتحذيرات',
        explanation: 'تم فحص الرسالة بنجاح وتحليل جميع العناصر المشبوهة',
        
        // Tips
        tipsTitle: 'نصائح الأمان',
        tip1: 'لا تشارك كلمة المرور أو رمز التحقق',
        tip2: 'تحقق من الروابط قبل الضغط',
        tip3: 'النطاق الرسمي:',
        tip3Value: 'absher.sa',
        tip4: 'المواقع الحكومية تنتهي بـ:',
        tip4Value: '.gov.sa',
        
        // History Modal
        historyTitle: 'رسائل تم فحصها سابقاً',
        noHistory: 'لم يتم فحص أي رسائل بعد',
        deleteHistory: 'حذف جميع السجلات',
        confirmDeleteOne: 'هل تريد حذف هذا السجل؟',
        confirmDeleteAll: 'هل تريد حذف جميع السجلات؟\n\nلا يمكن التراجع عن هذا الإجراء.',
        
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
        price: '5 ريال',
        pricePeriod: 'شهرياً',
        priceSave: '💰 وفّر 40% بالاشتراك السنوي',
        downloadIOS: 'متجر آبل',
        iosStore: 'App Store',
        downloadAndroid: 'متجر جوجل',
        androidStore: 'Google Play',
        
        // Report Modal
        reportTitle: 'إبلاغ السلطات',
        reportSubtitle: 'بلّغ عن الرسالة الاحتيالية',
        call990Title: 'الاتصال بـ 990',
        call990Desc: 'خط الجرائم الإلكترونية',
        emailTitle: 'إرسال بريد إلكتروني',
        emailDesc: 'info@cert.gov.sa',
        absherTitle: 'عبر منصة أبشر',
        absherDesc: 'أبلغ من خلال موقع أبشر',
        kollonaTitle: 'تطبيق كلنا أمن',
        kollonaDesc: 'الإبلاغ عن الجرائم',
        
        // Notifications
        notifPasted: '✅ تم اللصق بنجاح',
        notifCleared: '🗑️ تم المسح',
        notifSaved: '✅ تم نسخ النتيجة بنجاح',
        notifPasteFailed: '⚠️ استخدم Ctrl+V للصق',
        notifNoResult: 'لا توجد نتيجة للحفظ',
        notifNoMessage: '⚠️ الرجاء لصق الرسالة أولاً',
        notifDeleted: '🗑️ تم حذف السجل',
        notifAllDeleted: '🗑️ تم حذف جميع السجلات',
        notifIOSSoon: '🍎 قريباً على آبل ستور!',
        notifAndroidSoon: '🤖 قريباً على جوجل بلاي!',
        
        // Warnings
        warnOfficialLink: '✅ يحتوي على رابط من موقع حكومي رسمي',
        warnShortener: '🚨 يحتوي على روابط مختصرة مشبوهة',
        warnInsecure: '⚠️ يحتوي على روابط غير آمنة (http)',
        warnFakeAbsher: '🚨 يذكر أبشر لكن الرابط ليس من النطاق الرسمي',
        warnUrgent: '🚨 يستخدم أساليب الضغط والاستعجال',
        warnPhishing: '⚠️ يستخدم عبارات احتيالية نموذجية',
        warnUnofficial: '⚠️ يحتوي على روابط من مصادر غير رسمية'
    },
    en: {
        // Header
        brandTitle: 'Absher Security',
        brandSubtitle: 'أبشر الأمني',
        darkMode: 'Theme',
        history: 'History',
        save: 'Export',
        language: 'عربي',
        report: 'Report',
        app: 'App',
        
        // Input
        inputLabel: 'Paste suspicious message here:',
        placeholder: 'Example: Your Absher account has been suspended. Click the link bit.ly/abs456 to update within 24 hours...',
        paste: 'Paste',
        clear: 'Clear',
        analyze: 'Analyze Message',
        analyzing: 'Analyzing message...',
        
        // Results
        safe: 'Likely Safe',
        suspicious: 'Suspicious',
        fraud: 'Fraudulent',
        riskScore: 'Risk Score',
        details: 'Details & Warnings',
        explanation: 'Message analyzed successfully and all suspicious elements checked',
        
        // Tips
        tipsTitle: 'Security Tips',
        tip1: 'Never share passwords or verification codes',
        tip2: 'Verify links before clicking',
        tip3: 'Official domain:',
        tip3Value: 'absher.sa',
        tip4: 'Government sites end with:',
        tip4Value: '.gov.sa',
        
        // History Modal
        historyTitle: 'Previously Analyzed Messages',
        noHistory: 'No messages analyzed yet',
        deleteHistory: 'Delete All History',
        confirmDeleteOne: 'Do you want to delete this record?',
        confirmDeleteAll: 'Do you want to delete all history?\n\nThis action cannot be undone.',
        
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
        price: '5 SAR',
        pricePeriod: 'monthly',
        priceSave: '💰 Save 40% with annual plan',
        downloadIOS: 'Download iOS',
        iosStore: 'App Store',
        downloadAndroid: 'Download Android',
        androidStore: 'Google Play',
        
        // Report Modal
        reportTitle: 'Report to Authorities',
        reportSubtitle: 'Report fraudulent message',
        call990Title: 'Call 990',
        call990Desc: 'Cybercrime hotline',
        emailTitle: 'Send Email',
        emailDesc: 'info@cert.gov.sa',
        absherTitle: 'Via Absher Platform',
        absherDesc: 'Report through Absher website',
        kollonaTitle: 'Kollona Amn App',
        kollonaDesc: 'Report crimes',
        
        // Notifications
        notifPasted: '✅ Pasted successfully',
        notifCleared: '🗑️ Cleared',
        notifSaved: '✅ Result copied successfully',
        notifPasteFailed: '⚠️ Use Ctrl+V to paste',
        notifNoResult: 'No result to save',
        notifNoMessage: '⚠️ Please paste the message first',
        notifDeleted: '🗑️ Record deleted',
        notifAllDeleted: '🗑️ All records deleted',
        notifIOSSoon: '🍎 Coming soon to App Store!',
        notifAndroidSoon: '🤖 Coming soon to Google Play!',
        
        // Warnings
        warnOfficialLink: '✅ Contains official government link',
        warnShortener: '🚨 Contains suspicious shortened URLs',
        warnInsecure: '⚠️ Contains insecure links (http)',
        warnFakeAbsher: '🚨 Mentions Absher but link is not official',
        warnUrgent: '🚨 Uses pressure and urgency tactics',
        warnPhishing: '⚠️ Uses typical phishing phrases',
        warnUnofficial: '⚠️ Contains links from unofficial sources'
    }
};

function t(key) {
    return translations[currentLanguage][key] || key;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupTextareaAutoDirection();
});

function initializeApp() {
    // Load language preference
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
        currentLanguage = savedLanguage;
        const html = document.getElementById('htmlElement');
        html.lang = currentLanguage;
        html.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    }

    // Load dark mode preference
    if (localStorage.getItem(DARK_MODE_KEY) === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Load analysis history
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
        analysisHistory = JSON.parse(saved);
    }
    
    // Update UI with current language
    updateUILanguage();
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
    // Header buttons
    document.getElementById('langBtnLabel').textContent = t('language');
    
    // Update button labels
    const darkModeLabel = document.querySelector('[onclick="toggleDarkMode()"] .btn-label');
    if (darkModeLabel) darkModeLabel.textContent = t('darkMode');
    
    const historyLabel = document.querySelector('[onclick="viewHistory()"] .btn-label');
    if (historyLabel) historyLabel.textContent = t('history');
    
    const exportLabel = document.querySelector('[onclick="exportResult()"] .btn-label');
    if (exportLabel) exportLabel.textContent = t('save');
    
    const reportLabel = document.querySelector('[onclick="openReportModal()"] .btn-label');
    if (reportLabel) reportLabel.textContent = t('report');
    
    const appLabel = document.querySelector('[onclick="openPremiumModal()"] .btn-label');
    if (appLabel) appLabel.textContent = t('app');
    
    // Input section
    const inputLabel = document.querySelector('.input-label');
    if (inputLabel) inputLabel.textContent = t('inputLabel');
    
    const textarea = document.getElementById('messageInput');
    if (textarea) textarea.placeholder = t('placeholder');
    
    // Buttons
    const pasteBtn = document.querySelector('.btn-paste span');
    if (pasteBtn) pasteBtn.textContent = t('paste');
    
    const clearBtn = document.querySelector('.btn-clear span');
    if (clearBtn) clearBtn.textContent = t('clear');
    
    const analyzeBtn = document.querySelector('.btn-analyze span');
    if (analyzeBtn) analyzeBtn.textContent = t('analyze');
    
    // Loading
    const loadingText = document.querySelector('.loading p');
    if (loadingText) loadingText.innerHTML = `<strong>${t('analyzing')}</strong>`;
    
    // Tips section
    const tipsTitle = document.querySelector('.info-box h3');
    if (tipsTitle) {
        const svg = tipsTitle.querySelector('svg');
        tipsTitle.innerHTML = '';
        if (svg) tipsTitle.appendChild(svg);
        tipsTitle.appendChild(document.createTextNode(t('tipsTitle')));
    }
    
    const tipsList = document.querySelectorAll('.info-box li');
    if (tipsList.length >= 4) {
        tipsList[0].innerHTML = t('tip1');
        tipsList[1].innerHTML = t('tip2');
        tipsList[2].innerHTML = `${t('tip3')} <strong>${t('tip3Value')}</strong>`;
        tipsList[3].innerHTML = `${t('tip4')} <strong>${t('tip4Value')}</strong>`;
    }
    
    // Update download button texts
    const iosText = document.getElementById('iosText');
    const androidText = document.getElementById('androidText');
    if (iosText) iosText.textContent = t('iosStore');
    if (androidText) androidText.textContent = t('androidStore');
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem(DARK_MODE_KEY, isDark);
}

function addToHistory(message, result) {
    const item = {
        message: message.substring(0, 100),
        classification: result.classification,
        classification_ar: result.classification_ar,
        riskScore: result.riskScore,
        timestamp: new Date().toLocaleString('ar-SA')
    };
    
    analysisHistory.unshift(item);
    if (analysisHistory.length > 10) {
        analysisHistory.pop();
    }
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(analysisHistory));
    updateExportButtonVisibility();
}

function viewHistory() {
    const historyList = document.getElementById('historyList');
    const historyActions = document.getElementById('historyActions');
    
    if (analysisHistory.length === 0) {
        historyList.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;">${t('noHistory')}</p>`;
        historyActions.style.display = 'none';
    } else {
        historyList.innerHTML = analysisHistory.map((item, idx) => `
            <div class="history-item" onclick="loadFromHistory(${idx})">
                <button class="history-item-delete" onclick="event.stopPropagation(); deleteHistoryItem(${idx})" title="${currentLanguage === 'ar' ? 'حذف' : 'Delete'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
    
    // Update modal title
    const modalTitle = document.querySelector('#historyModal h2');
    if (modalTitle) modalTitle.textContent = t('historyTitle');
    
    openModal('historyModal');
}

function deleteHistoryItem(idx) {
    if (confirm(t('confirmDeleteOne'))) {
        analysisHistory.splice(idx, 1);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(analysisHistory));
        viewHistory();
        showNotification(t('notifDeleted'));
    }
}

function clearHistory() {
    if (confirm(t('confirmDeleteAll'))) {
        analysisHistory = [];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(analysisHistory));
        viewHistory();
        showNotification(t('notifAllDeleted'));
    }
}

function loadFromHistory(idx) {
    alert('سيتم إضافة هذه الميزة قريباً');
    closeModal('historyModal');
}

function exportResult() {
    const resultCard = document.getElementById('resultCard');
    if (!resultCard.classList.contains('show')) {
        alert('لا توجد نتيجة للحفظ');
        return;
    }

    const resultText = resultCard.innerText;
    const textarea = document.getElementById('messageInput');
    const message = textarea.value;

    const exportData = `
تقرير أبشر الأمني
================================
التاريخ: ${new Date().toLocaleString('ar-SA')}

الرسالة المفحوصة:
${message}

نتيجة الفحص:
${resultText}

================================
تم إنشاء التقرير بواسطة أبشر الأمني
    `.trim();

    navigator.clipboard.writeText(exportData).then(() => {
        showNotification('✅ تم نسخ النتيجة بنجاح');
    }).catch(err => {
        downloadResultAsFile(exportData);
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function downloadResultAsFile(data) {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absher-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
        // Add closing animation
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.animation = 'modalSlideDown 0.3s ease-out';
        }
        
        setTimeout(() => {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            if (content) {
                content.style.animation = '';
            }
        }, 250);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal('historyModal');
        closePremiumModal();
        closeReportModal();
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

    const loading = document.getElementById('loading');
    const resultCard = document.getElementById('resultCard');
    
    // Update loading text
    loading.innerHTML = `
        <div class="spinner"></div>
        <p>${t('analyzing')}</p>
    `;
    
    loading.classList.add('show');
    resultCard.classList.remove('show');

    // Simulate analysis delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: text })
        });

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
    
    if (mlData.url_predictions && mlData.url_predictions.length > 0) {
        if (mlData.ml_risk_score > 50) {
            ruleBasedResult.riskScore = Math.max(ruleBasedResult.riskScore, mlData.ml_risk_score);
        }
    }
    
    if (ruleBasedResult.riskScore <= 10) {
        ruleBasedResult.classification = 'SAFE';
        ruleBasedResult.classification_ar = 'آمنة غالباً';
        ruleBasedResult.icon = '✅';
    } else if (ruleBasedResult.riskScore <= 60) {
        ruleBasedResult.classification = 'SUSPICIOUS';
        ruleBasedResult.classification_ar = 'مشبوهة';
        ruleBasedResult.icon = '⚠️';
    } else {
        ruleBasedResult.classification = 'FRAUD';
        ruleBasedResult.classification_ar = 'احتيالية';
        ruleBasedResult.icon = '❌';
    }
    
    return ruleBasedResult;
}

function performRuleBasedAnalysis(text) {
    const textLower = text.toLowerCase();
    let riskScore = 0;
    const warnings = [];

    const officialDomains = [
        'absher.sa', 'www.absher.sa',
        'moi.gov.sa', 'www.moi.gov.sa',
        'my.gov.sa', 'www.my.gov.sa',
        'sa.gov.sa', 'www.sa.gov.sa',
        '.gov.sa'
    ];
    const urls = extractURLs(text);
    const hasUrls = urls.length > 0;

    const hasOfficialDomain = urls.some(url => 
        officialDomains.some(official => url.toLowerCase().includes(official))
    );

    if (hasOfficialDomain) {
        riskScore -= 20;
        warnings.push(t('warnOfficialLink'));
    }

    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'tmra.pe', 'goo.gl', 'is.gd', 'ow.ly', 'rebrand.ly', 'buff.ly'];
    const foundShorteners = urls.filter(url => shorteners.some(shortener => url.toLowerCase().includes(shortener)));
    
    if (foundShorteners.length > 0) {
        riskScore += 25;
        warnings.push(t('warnShortener'));
    }

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

    const mentionsAbsher = text.match(/أبشر|absher/i);
    if (mentionsAbsher && hasUrls && !hasOfficialDomain) {
        riskScore += 30;
        warnings.push(t('warnFakeAbsher'));
    }

    const urgentKeywords = ['تم تعليق', 'تم إيقاف', 'خلال 24 ساعة', 'ادفع الآن', 'قم بتحديث', 'فوراً', 'حالاً', 'عاجل'];
    const foundUrgent = urgentKeywords.filter(keyword => text.includes(keyword));
    
    if (foundUrgent.length > 0) {
        riskScore += 20;
        warnings.push(t('warnUrgent'));
    }

    const phishingKeywords = ['اضغط هنا', 'انقر فوراً', 'تحديث معلوماتك', 'تأكيد الحساب', 'confirm account', 'update now', 'click here'];
    const foundPhishing = phishingKeywords.filter(keyword => textLower.includes(keyword.toLowerCase()));
    
    if (foundPhishing.length > 0) {
        riskScore += 15;
        warnings.push(t('warnPhishing'));
    }

    if (hasUrls && !hasOfficialDomain) {
        riskScore += 10;
        warnings.push(t('warnUnofficial'));
    }

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
    const fullUrlPattern = /https?:\/\/[^\s]+/gi;
    const fullUrls = text.match(fullUrlPattern) || [];
    urls.push(...fullUrls);
    
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
                        <span class="warning-bullet">•</span>
                        <div><strong>${warning}</strong></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    const displayClassification = currentLanguage === 'ar' ? result.classification_ar : result.classification;

    resultCard.innerHTML = `
        <div class="result-header">
            <div class="result-icon">${result.icon}</div>
            <div class="result-info">
                <div class="result-title">${displayClassification}</div>
                <div class="result-subtitle">${result.classification}</div>
                <div class="risk-score">${t('riskScore')}: ${result.riskScore} / 100</div>
            </div>
        </div>
        
        <div class="result-explanation">
            <strong>${result.explanation}</strong>
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
            showNotification('✅ تم اللصق بنجاح');
        } else {
            showNotification('⚠️ استخدم Ctrl+V للصق');
        }
    } catch (err) {
        showNotification('⚠️ استخدم Ctrl+V للصق');
    }
}

function clearAll() {
    document.getElementById('messageInput').value = '';
    document.getElementById('resultCard').classList.remove('show');
    updateExportButtonVisibility();
    showNotification('🗑️ تم المسح');
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
                ? '🍎 قريباً على آبل ستور!\n\nسيتم إطلاق التطبيق قريباً مع:\n✅ فحص تلقائي لكل رسائلك\n✅ تنبيهات فورية\n✅ تقارير مفصلة\n✅ حماية على مدار الساعة\n\nالسعر: 5 ريال شهرياً'
                : '🍎 Coming soon to App Store!\n\nThe app will launch soon with:\n✅ Auto-scan all messages\n✅ Instant alerts\n✅ Detailed reports\n✅ 24/7 protection\n\nPrice: 5 SAR/month';
            alert(msg);
        }, 500);
    } else if (platform === 'android') {
        showNotification(t('notifAndroidSoon'));
        setTimeout(() => {
            const msg = currentLanguage === 'ar'
                ? '🤖 قريباً على جوجل بلاي!\n\nسيتم إطلاق التطبيق قريباً مع:\n✅ فحص تلقائي لكل رسائلك\n✅ تنبيهات فورية\n✅ تقارير مفصلة\n✅ حماية على مدار الساعة\n\nالسعر: 5 ريال شهرياً'
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
    
    // Update modal content
    const reportTitle = document.querySelector('#reportModal h2');
    const reportSubtitle = document.querySelector('#reportModal p');
    if (reportTitle) reportTitle.textContent = t('reportTitle');
    if (reportSubtitle) reportSubtitle.textContent = t('reportSubtitle');
    
    openModal('reportModal');
}

function closeReportModal() {
    closeModal('reportModal');
}

function reportTo(method) {
    const message = document.getElementById('messageInput').value;
    
    switch(method) {
        case '990':
            showNotification('📞 جاري فتح معلومات الاتصال...');
            setTimeout(() => {
                alert('📞 الاتصال بـ 990\n\nللإبلاغ عن الجرائم الإلكترونية:\n\n1. اتصل بالرقم: 990\n2. اختر خدمة الجرائم الإلكترونية\n3. قدم تفاصيل الرسالة المشبوهة\n\nمتاح 24 ساعة طوال الأسبوع');
            }, 500);
            break;
            
        case 'email':
            const emailSubject = encodeURIComponent('إبلاغ عن رسالة احتيالية');
            const emailBody = encodeURIComponent(
                'السلام عليكم،\n\nأود الإبلاغ عن الرسالة المشبوهة التالية:\n\n' + 
                message + 
                '\n\nشكراً لكم'
            );
            window.open(`mailto:info@cert.gov.sa?subject=${emailSubject}&body=${emailBody}`, '_blank');
            showNotification('📧 جاري فتح البريد الإلكتروني...');
            break;
            
        case 'absher':
            showNotification('🏛️ جاري فتح موقع أبشر...');
            setTimeout(() => {
                alert('🏛️ الإبلاغ عبر أبشر\n\n1. افتح تطبيق أو موقع أبشر\n2. اذهب إلى "خدماتي"\n3. اختر "الإبلاغ عن محتوى مشبوه"\n4. املأ النموذج بالتفاصيل');
                window.open('https://www.absher.sa', '_blank');
            }, 500);
            break;
            
        case 'kollona':
            showNotification('📱 معلومات تطبيق كلنا أمن...');
            setTimeout(() => {
                alert('📱 تطبيق كلنا أمن\n\nللإبلاغ عن الجرائم الإلكترونية:\n\n1. حمّل تطبيق "كلنا أمن"\n2. سجل دخولك\n3. اختر "الإبلاغ عن جريمة إلكترونية"\n4. أرفق تفاصيل الرسالة المشبوهة\n\nالتطبيق متاح على:\n• آبل ستور\n• جوجل بلاي');
            }, 500);
            break;
    }
    
    closeReportModal();
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
        document.body.style.overflow = '';
    }
};
