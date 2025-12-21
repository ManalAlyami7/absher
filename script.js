/**
 * ========================================
 * Tanabbah - Main Controller
 * ========================================
 * Original Concept: Naif Saleh
 * Enhanced Development: Manal Alyami
 * © 2025 All Rights Reserved
 * ========================================
 */

// Global State
let analysisHistory = [];
let currentLanguage = 'ar';

// Configuration
const API_URL = 'https://tanabbah-production-a91f.up.railway.app/api/analyze';
const REPORT_URL = API_URL.replace('/analyze', '/report');

// Initialization
window.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupTextareaAutoDirection();
    setupKeyboardShortcuts();
});

function initializeApp() {
    const savedLanguage = loadFromStorage(CONFIG.LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'ar' || savedLanguage === 'en')) {
        currentLanguage = savedLanguage;
        const html = document.getElementById('htmlElement');
        html.lang = currentLanguage;
        html.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    }

    if (loadFromStorage(CONFIG.DARK_MODE_KEY) === true) {
        document.body.classList.add('dark-mode');
    }

    analysisHistory = loadFromStorage(CONFIG.HISTORY_KEY, []);
    if (!Array.isArray(analysisHistory)) analysisHistory = [];
    analysisHistory = analysisHistory.slice(0, CONFIG.MAX_HISTORY);
    
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

function setupKeyboardShortcuts() {
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
}

// Main Analysis Function
async function analyzeMessage() {
    const textarea = document.getElementById('messageInput');
    const text = textarea.value.trim();

    if (!text) {
        showNotification(t('notifNoMessage'), 'warning');
        return;
    }

    if (!validateMessageLength(text)) {
        showNotification(t('notifMessageTooLong'), 'error');
        return;
    }

    showLoading();
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        const result = await analyzeViaAPI(text, true);
        displayResult(result);
    } catch (error) {
        console.error('API analysis failed:', error);
        const result = performLocalAnalysis(text);
        displayResult(result);
        showNotification(
            currentLanguage === 'ar'
                ? '⚠️ استخدام التحليل المحلي'
                : '⚠️ Using local analysis',
            'warning'
        );
    } finally {
        hideLoading();
    }
}

// API Integration
async function analyzeViaAPI(message, enableLLM = true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, enable_llm: enableLLM }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        return processAPIResponse(data);
    } catch (error) {
        throw error;
    }
}

function processAPIResponse(data) {
    const riskScore = Math.round(data.combined_risk_score || data.ml_risk_score || 0);
    let classification, classification_ar, icon;
    
    if (riskScore <= 25) {
        classification = 'SAFE';
        classification_ar = t('safe');
        icon = '✅';
    } else if (riskScore <= 65) {
        classification = 'SUSPICIOUS';
        classification_ar = t('suspicious');
        icon = '⚠️';
    } else {
        classification = 'FRAUD';
        classification_ar = t('fraud');
        icon = '❌';
    }
    
    const warnings = [];
    
    if (data.url_predictions && data.url_predictions.length > 0) {
        data.url_predictions.forEach(pred => {
            if (pred.probability >= 0.75) {
                warnings.push(
                    currentLanguage === 'ar'
                        ? `🚨 الرابط ${pred.url} عالي الخطورة (${(pred.probability * 100).toFixed(0)}%)`
                        : `🚨 URL ${pred.url} is high-risk (${(pred.probability * 100).toFixed(0)}%)`
                );
            }
        });
    }
    
    if (data.llm_analysis && data.llm_analysis.red_flags) {
        data.llm_analysis.red_flags.slice(0, 3).forEach(flag => {
            warnings.push(
                currentLanguage === 'ar'
                    ? `🧠 ${translateLLMFlag(flag)}`
                    : `🧠 ${flag}`
            );
        });
    }
    
    let llmScore = undefined;
    if (data.llm_analysis) {
        llmScore = data.llm_analysis.is_phishing 
            ? data.llm_analysis.context_score 
            : (100 - data.llm_analysis.context_score);
    }
    
    return {
        classification,
        classification_ar,
        riskScore,
        icon,
        explanation: currentLanguage === 'ar'
            ? `تم فحص الرسالة بالذكاء الاصطناعي وتحليل ${warnings.length} مؤشر أمني`
            : `Message analyzed with AI and ${warnings.length} security indicators checked`,
        warnings: warnings.slice(0, 8),
        urlsFound: data.urls_found || 0,
        mlScore: Math.round(data.ml_risk_score || 0),
        llmScore: llmScore !== undefined ? Math.round(llmScore) : undefined,
        llmAnalysis: data.llm_analysis
    };
}

// Local Fallback Analysis
function performLocalAnalysis(text) {
    const urls = extractURLs(text);
    let riskScore = 0;
    const warnings = [];
    
    if (urls.length > 0) {
        riskScore += 15;
        const shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 'ow.ly'];
        if (urls.some(url => shorteners.some(s => url.toLowerCase().includes(s)))) {
            riskScore += 30;
            warnings.push(currentLanguage === 'ar' ? '🚨 يحتوي على روابط مختصرة' : '🚨 Contains shortened URLs');
        }
        if (urls.some(url => url.toLowerCase().startsWith('http://'))) {
            riskScore += 20;
            warnings.push(currentLanguage === 'ar' ? '⚠️ روابط غير آمنة' : '⚠️ Insecure links');
        }
    }
    
    const urgencyPatterns = ['تعليق', 'إيقاف', 'suspended', 'urgent', 'فوراً'];
    if (urgencyPatterns.some(p => text.toLowerCase().includes(p.toLowerCase()))) {
        riskScore += 25;
        warnings.push(currentLanguage === 'ar' ? '🚨 أسلوب الضغط' : '🚨 Pressure tactics');
    }
    
    const govServices = ['أبشر', 'absher', 'ناجز', 'najiz'];
    const officialDomains = ['absher.sa', 'najiz.sa', '.gov.sa'];
    
    if (govServices.some(s => text.toLowerCase().includes(s.toLowerCase())) && 
        urls.length > 0 && 
        !urls.some(url => officialDomains.some(d => url.toLowerCase().includes(d)))) {
        riskScore += 35;
        warnings.push(currentLanguage === 'ar' ? '🚨 انتحال جهة حكومية' : '🚨 Government impersonation');
    }
    
    riskScore = Math.min(100, riskScore);
    
    let classification, classification_ar, icon;
    if (riskScore <= 25) {
        classification = 'SAFE';
        classification_ar = t('safe');
        icon = '✅';
    } else if (riskScore <= 65) {
        classification = 'SUSPICIOUS';
        classification_ar = t('suspicious');
        icon = '⚠️';
    } else {
        classification = 'FRAUD';
        classification_ar = t('fraud');
        icon = '❌';
    }
    
    return {
        classification,
        classification_ar,
        riskScore,
        icon,
        explanation: t('explanation'),
        warnings,
        urlsFound: urls.length,
        mlScore: 0,
        llmScore: undefined,
        llmAnalysis: null
    };
}

// UI Actions
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

function clearAll() {
    const textarea = document.getElementById('messageInput');
    if (textarea.value.trim() && !confirm(t('confirmClear'))) return;
    textarea.value = '';
    document.getElementById('resultCard').classList.remove('show');
    updateExportButtonVisibility();
    showNotification(t('notifCleared'));
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    saveToStorage(CONFIG.DARK_MODE_KEY, document.body.classList.contains('dark-mode'));
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    saveToStorage(CONFIG.LANGUAGE_KEY, currentLanguage);
    const html = document.getElementById('htmlElement');
    html.lang = currentLanguage;
    html.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    updateUILanguage();
}

function updateUILanguage() {
    const updates = {
        langBtnLabel: 'language',
        privacyNoticeText: 'privacyNotice',
        mainTitle: 'mainTitle',
        mainSubtitle: 'mainSubtitle',
        tipsTitleText: 'tipsTitle',
        officialSitesTitleText: 'officialSitesTitle',
        footerText: 'footerText'
    };

    for (const [id, key] of Object.entries(updates)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    }

    const pasteBtn = document.querySelector('.btn-paste span');
    const clearBtn = document.querySelector('.btn-clear span');
    const analyzeBtn = document.querySelector('.btn-analyze span');
    if (pasteBtn) pasteBtn.textContent = t('paste');
    if (clearBtn) clearBtn.textContent = t('clear');
    if (analyzeBtn) analyzeBtn.textContent = t('analyze');

    const textarea = document.getElementById('messageInput');
    if (textarea) textarea.placeholder = t('placeholder');

    updateTipsList();
}

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

// History Management
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

function viewHistory() {
    const historyList = document.getElementById('historyList');
    const historyActions = document.getElementById('historyActions');
    
    if (analysisHistory.length === 0) {
        historyList.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:40px;">${t('noHistory')}</p>`;
        historyActions.style.display = 'none';
    } else {
        historyList.innerHTML = analysisHistory.map((item, idx) => `
            <div class="history-item" onclick="loadFromHistory(${idx})">
                <button class="history-item-delete" onclick="event.stopPropagation(); deleteHistoryItem(${idx})">×</button>
                <div class="history-item-text">${item.message}...</div>
                <div class="history-item-meta">${currentLanguage === 'ar' ? item.classification_ar : item.classification} (${item.riskScore}%) • ${item.timestamp}</div>
            </div>
        `).join('');
        historyActions.style.display = 'block';
    }
    openModal('historyModal');
}

function deleteHistoryItem(idx) {
    if (confirm(t('confirmDeleteOne'))) {
        analysisHistory.splice(idx, 1);
        saveToStorage(CONFIG.HISTORY_KEY, analysisHistory);
        viewHistory();
        showNotification(t('notifDeleted'));
    }
}

function clearHistory() {
    if (confirm(t('confirmDeleteAll'))) {
        analysisHistory = [];
        removeFromStorage(CONFIG.HISTORY_KEY);
        viewHistory();
        showNotification(t('notifAllDeleted'));
    }
}

function loadFromHistory(idx) {
    closeModal('historyModal');
}

function exportResult() {
    const resultCard = document.getElementById('resultCard');
    if (!resultCard.classList.contains('show')) {
        showNotification(t('notifNoResult'), 'warning');
        return;
    }
    const resultText = resultCard.innerText;
    const textarea = document.getElementById('messageInput');
    const timestamp = getTimestamp();
    const exportData = `تنبَه - Tanabbah\n${'='.repeat(50)}\n${timestamp}\n\n${textarea.value}\n\n${resultText}`;
    navigator.clipboard.writeText(exportData).then(() => {
        showNotification(t('notifSaved'));
    }).catch(() => {
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

// Modal Functions
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

function openPremiumModal() {
    openModal('premiumModal');
}

function closePremiumModal() {
    closeModal('premiumModal');
}

function downloadApp(platform) {
    const msg = platform === 'ios' ? t('notifIOSSoon') : t('notifAndroidSoon');
    showNotification(msg);
}

function openReportModal() {
    const textarea = document.getElementById('messageInput');
    if (!textarea.value.trim()) {
        showNotification(t('notifNoMessage'), 'warning');
        return;
    }
    showMainReportConfirm(textarea.value);
}

function showMainReportConfirm(message) {
    if (confirm(currentLanguage === 'ar' ? 'هل تريد إرسال البلاغ؟' : 'Send report?')) {
        sendDirectReport(message);
    }
}

function closeMainReportConfirm() {
    // Placeholder for modal close
}

async function sendDirectReport(message) {
    showNotification(t('reportSending'), 'info');
    try {
        await fetch(REPORT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: sanitizeHTML(message.substring(0, 1000)),
                timestamp: new Date().toISOString(),
                language: currentLanguage
            })
        });
        showNotification(t('reportSent'));
    } catch (err) {
        showNotification(t('reportFailed'), 'error');
    }
}