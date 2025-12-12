const API_URL = 'http://localhost:5000/api/analyze';
const HISTORY_KEY = 'absher_analysis_history';
const DARK_MODE_KEY = 'absher_dark_mode';
const LANGUAGE_KEY = 'absher_language';
let analysisHistory = [];
let currentLanguage = 'ar';

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
        document.getElementById('langBtnLabel').textContent = currentLanguage === 'ar' ? 'EN' : 'عربي';
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
    
    document.getElementById('langBtnLabel').textContent = currentLanguage === 'ar' ? 'EN' : 'عربي';
    
    // Update placeholder
    const textarea = document.getElementById('messageInput');
    if (currentLanguage === 'ar') {
        textarea.placeholder = 'الصق الرسالة المشبوهة هنا...\n\nمثال: تم تعليق حسابك في أبشر. يرجى الضغط على الرابط للتحديث...';
    } else {
        textarea.placeholder = 'Paste suspicious message here...\n\nExample: Your Absher account has been suspended. Click the link to update...';
    }
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
        historyList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">لم يتم فحص أي رسائل بعد</p>';
        historyActions.style.display = 'none';
    } else {
        historyList.innerHTML = analysisHistory.map((item, idx) => `
            <div class="history-item" onclick="loadFromHistory(${idx})">
                <button class="history-item-delete" onclick="event.stopPropagation(); deleteHistoryItem(${idx})" title="حذف">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                </button>
                <div class="history-item-text" title="${item.message}">
                    ${item.message}...
                </div>
                <div class="history-item-meta">
                    ${item.classification_ar} (${item.riskScore}%) • ${item.timestamp}
                </div>
            </div>
        `).join('');
        historyActions.style.display = 'block';
    }
    
    openModal('historyModal');
}

function deleteHistoryItem(idx) {
    if (confirm('هل تريد حذف هذا السجل؟')) {
        analysisHistory.splice(idx, 1);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(analysisHistory));
        viewHistory();
        showNotification('🗑️ تم حذف السجل');
    }
}

function clearHistory() {
    if (confirm('هل تريد حذف جميع السجلات؟\n\nلا يمكن التراجع عن هذا الإجراء.')) {
        analysisHistory = [];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(analysisHistory));
        viewHistory();
        showNotification('🗑️ تم حذف جميع السجلات');
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
        showNotification('⚠️ الرجاء لصق الرسالة أولاً');
        return;
    }

    const loading = document.getElementById('loading');
    const resultCard = document.getElementById('resultCard');
    
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
        warnings.push({
            ar: '✅ يحتوي على رابط من موقع حكومي رسمي',
            en: '✅ Contains official government link'
        });
    }

    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'tmra.pe', 'goo.gl', 'is.gd', 'ow.ly', 'rebrand.ly', 'buff.ly'];
    const foundShorteners = urls.filter(url => shorteners.some(shortener => url.toLowerCase().includes(shortener)));
    
    if (foundShorteners.length > 0) {
        riskScore += 25;
        warnings.push({
            ar: '🚨 يحتوي على روابط مختصرة مشبوهة',
            en: '🚨 Contains suspicious shortened URLs'
        });
    }

    const insecureUrls = urls.filter(url => {
        const urlLower = url.toLowerCase();
        const isHttp = urlLower.startsWith('http://') && !urlLower.startsWith('https://');
        const isGovSa = urlLower.includes('.gov.sa');
        return isHttp && !isGovSa;
    });
    
    if (insecureUrls.length > 0) {
        riskScore += 30;
        warnings.push({
            ar: '⚠️ يحتوي على روابط غير آمنة (http)',
            en: '⚠️ Contains insecure links (http)'
        });
    }

    const mentionsAbsher = text.match(/أبشر|absher/i);
    if (mentionsAbsher && hasUrls && !hasOfficialDomain) {
        riskScore += 30;
        warnings.push({
            ar: '🚨 يذكر أبشر لكن الرابط ليس من النطاق الرسمي',
            en: '🚨 Mentions Absher but link is not official'
        });
    }

    const urgentKeywords = ['تم تعليق', 'تم إيقاف', 'خلال 24 ساعة', 'ادفع الآن', 'قم بتحديث', 'فوراً', 'حالاً', 'عاجل'];
    const foundUrgent = urgentKeywords.filter(keyword => text.includes(keyword));
    
    if (foundUrgent.length > 0) {
        riskScore += 20;
        warnings.push({
            ar: '🚨 يستخدم أساليب الضغط والاستعجال',
            en: '🚨 Uses pressure and urgency tactics'
        });
    }

    const phishingKeywords = ['اضغط هنا', 'انقر فوراً', 'تحديث معلوماتك', 'تأكيد الحساب', 'confirm account', 'update now', 'click here'];
    const foundPhishing = phishingKeywords.filter(keyword => textLower.includes(keyword.toLowerCase()));
    
    if (foundPhishing.length > 0) {
        riskScore += 15;
        warnings.push({
            ar: '⚠️ يستخدم عبارات احتيالية نموذجية',
            en: '⚠️ Uses typical phishing phrases'
        });
    }

    if (hasUrls && !hasOfficialDomain) {
        riskScore += 10;
        warnings.push({
            ar: '⚠️ يحتوي على روابط من مصادر غير رسمية',
            en: '⚠️ Contains links from unofficial sources'
        });
    }

    riskScore = Math.max(0, Math.min(100, riskScore));

    return {
        classification: riskScore <= 30 ? 'SAFE' : (riskScore <= 65 ? 'SUSPICIOUS' : 'FRAUD'),
        classification_ar: riskScore <= 30 ? 'آمنة غالباً' : (riskScore <= 65 ? 'مشبوهة' : 'احتيالية'),
        riskScore,
        icon: riskScore <= 30 ? '✅' : (riskScore <= 65 ? '⚠️' : '❌'),
        explanation_ar: 'تم فحص الرسالة بنجاح وتحليل جميع العناصر المشبوهة',
        explanation_en: 'Message analyzed successfully',
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
                    🔍 التفاصيل والتحذيرات
                </div>
                ${result.warnings.map(w => `
                    <div class="warning-item">
                        <span class="warning-bullet">•</span>
                        <div><strong>${w.ar}</strong></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    resultCard.innerHTML = `
        <div class="result-header">
            <div class="result-icon">${result.icon}</div>
            <div class="result-info">
                <div class="result-title">${result.classification_ar}</div>
                <div class="result-subtitle">${result.classification}</div>
                <div class="risk-score">درجة الخطر: ${result.riskScore} / 100</div>
            </div>
        </div>
        
        <div class="result-explanation">
            <strong>${result.explanation_ar}</strong>
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
        showNotification('🍎 قريباً على آبل ستور!');
        setTimeout(() => {
            alert('🍎 قريباً على آبل ستور!\n\nسيتم إطلاق التطبيق قريباً مع:\n✅ فحص تلقائي لكل رسائلك\n✅ تنبيهات فورية\n✅ تقارير مفصلة\n✅ حماية على مدار الساعة\n\nالسعر: 5 ريال شهرياً');
        }, 500);
    } else if (platform === 'android') {
        showNotification('🤖 قريباً على جوجل بلاي!');
        setTimeout(() => {
            alert('🤖 قريباً على جوجل بلاي!\n\nسيتم إطلاق التطبيق قريباً مع:\n✅ فحص تلقائي لكل رسائلك\n✅ تنبيهات فورية\n✅ تقارير مفصلة\n✅ حماية على مدار الساعة\n\nالسعر: 5 ريال شهرياً');
        }, 500);
    }
}

function openReportModal() {
    const textarea = document.getElementById('messageInput');
    const text = textarea.value.trim();
    
    if (!text) {
        showNotification('⚠️ الرجاء لصق الرسالة المشبوهة أولاً');
        return;
    }
    
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