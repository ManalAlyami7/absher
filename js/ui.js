/**
 * ========================================
 * Tanabbah - Enhanced UI Display Module v2.3
 * ========================================
 * Complete bilingual analysis card with technical details
 * Author: Manal Alyami
 * Version: 2.3.0 - Production Ready
 * ========================================
 */

// ============================================================================
// TRANSLATION SYSTEM
// ============================================================================

const UI_TRANSLATIONS = {
    ar: {
        // Classifications
        SAFE: 'آمنة',
        LOW_RISK: 'منخفضة الخطورة',
        SUSPICIOUS: 'مشبوهة',
        HIGH_RISK: 'عالية الخطورة',
        
        // Sections
        redFlagsTitle: '🚨 مؤشرات الخطر',
        actionGuidanceTitle: '📋 الإجراء الموصى به',
        technicalDetailsTitle: '🔬 تفاصيل تقنية (للمختصين)',
        
        // Technical Labels
        overview: '📊 نظرة عامة',
        urlsFound: 'عدد الروابط',
        analysisMethod: 'طريقة التحليل',
        featuresAnalyzed: 'الخصائص المحللة',
        riskScores: '📈 درجات الخطر',
        mlScore: 'النموذج الآلي (ML)',
        llmScore: 'الذكاء الاصطناعي (LLM)',
        source: 'المصدر',
        trusted: 'موثوق',
        untrusted: 'غير موثوق',
        urlTypes: '🔗 أنواع الروابط',
        detailedAnalysis: '🔍 تحليل مفصل',
        noRedFlags: '✅ لم يتم اكتشاف مؤشرات احتيال واضحة',
        
        // URL Types
        urlPhishing: 'احتيالي',
        urlSuspicious: 'مشبوه',
        urlLookalike: 'مشابه لموقع معروف',
        urlTrusted: 'موثوق',
        urlSafe: 'آمن',
        urlNoUrls: 'لا توجد روابط',
        
        // Actions
        actionSafe: '✅ لا يوجد إجراء مطلوب',
        actionLowRisk: '⚠️ تحقق قبل الضغط على أي رابط',
        actionSuspicious: '🚫 لا تضغط على الروابط حتى تتأكد من المصدر',
        actionHighRisk: '❌ يُنصح بحذف الرسالة وعدم التفاعل معها'
    },
    en: {
        // Classifications
        SAFE: 'Safe',
        LOW_RISK: 'Low Risk',
        SUSPICIOUS: 'Suspicious',
        HIGH_RISK: 'High Risk',
        
        // Sections
        redFlagsTitle: '🚨 Risk Indicators',
        actionGuidanceTitle: '📋 Recommended Action',
        technicalDetailsTitle: '🔬 Technical Details (For Experts)',
        
        // Technical Labels
        overview: '📊 Overview',
        urlsFound: 'URLs Found',
        analysisMethod: 'Analysis Method',
        featuresAnalyzed: 'Features Analyzed',
        riskScores: '📈 Risk Scores',
        mlScore: 'ML Model Score',
        llmScore: 'AI Confidence',
        source: 'Source',
        trusted: 'Trusted',
        untrusted: 'Untrusted',
        urlTypes: '🔗 URL Types',
        detailedAnalysis: '🔍 Detailed Analysis',
        noRedFlags: '✅ No clear fraud indicators detected',
        
        // URL Types
        urlPhishing: 'Phishing',
        urlSuspicious: 'Suspicious',
        urlLookalike: 'Lookalike',
        urlTrusted: 'Trusted',
        urlSafe: 'Safe',
        urlNoUrls: 'No URLs',
        
        // Actions
        actionSafe: '✅ No action required',
        actionLowRisk: '⚠️ Verify before clicking any links',
        actionSuspicious: '🚫 Do not click links until you verify the source',
        actionHighRisk: '❌ Recommended to delete and not interact'
    }
};

function t_ui(key) {
    const lang = window.currentLanguage || 'ar';
    return UI_TRANSLATIONS[lang][key] || key;
}

// ============================================================================
// CLASSIFICATION HELPERS
// ============================================================================

/**
 * Get icon for classification
 */
function getClassificationIcon(classification) {
    const icons = {
        'SAFE': '✅',
        'LOW_RISK': '⚠️',
        'SUSPICIOUS': '🚨',
        'HIGH_RISK': '❌'
    };
    return icons[classification] || '✅';
}

/**
 * Get color class for classification
 */
function getColorClass(classification) {
    if (classification.includes('LOW')) return 'low-risk';
    if (classification.includes('SUSPICIOUS')) return 'suspicious';
    if (classification.includes('HIGH')) return 'high-risk';
    return 'safe';
}

/**
 * Get action color based on classification
 */
function getActionColor(classification) {
    const colors = {
        'SAFE': 'var(--success)',
        'LOW_RISK': 'var(--warning)',
        'SUSPICIOUS': 'var(--danger)',
        'HIGH_RISK': 'var(--danger)'
    };
    return colors[classification] || 'var(--success)';
}

// ============================================================================
// MAIN DISPLAY FUNCTION
// ============================================================================

/**
 * Display enhanced analysis result with complete technical details
 * @param {Object} result - Analysis result from API
 */
function displayEnhancedResult(result) {
    const resultCard = document.getElementById('resultCard');
    const isArabic = window.currentLanguage === 'ar';
    
    // === EXTRACT DATA ===
    const classification = result.classification || 'SAFE';
    const classificationText = isArabic ? 
        (result.classification_ar || t_ui(classification)) : 
        classification.replace('_', ' ');
    
    const riskScore = Math.round(result.risk_score || result.riskScore || 0);
    const colorClass = getColorClass(classification);
    const icon = getClassificationIcon(classification);
    
    // === EXPLANATION ===
    const explanation = isArabic ? 
        (result.explanation_ar || result.explanation) : 
        result.explanation;
    
    // === ACTION GUIDANCE ===
    const action = isArabic ? 
        (result.action_ar || result.action || getDefaultAction(classification, 'ar')) : 
        (result.action || getDefaultAction(classification, 'en'));
    
    const actionColor = getActionColor(classification);
    
    // === RED FLAGS (Only show if riskScore > 30) ===
    let redFlagsHTML = '';
    if (riskScore > 30) {
        const redFlags = isArabic ? 
            (result.red_flags_ar || result.warnings || []) : 
            (result.red_flags || []);
        
        // Filter out "no red flags" messages
        const displayFlags = redFlags.filter(flag => {
            const lower = flag.toLowerCase();
            return !lower.includes('no red flags') && 
                   !lower.includes('no significant') &&
                   !lower.includes('لم يتم اكتشاف') &&
                   !lower.includes('no clear');
        });
        
        if (displayFlags.length > 0) {
            redFlagsHTML = `
                <div class="warnings-section">
                    <div class="warnings-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" 
                                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>${t_ui('redFlagsTitle')}</span>
                    </div>
                    <div class="warning-list">
                        ${displayFlags.map(flag => `
                            <div class="warning-item">
                                <span class="warning-bullet">•</span>
                                <div>${sanitizeHTML(flag)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }
    }
    
    // === SAFE MESSAGE (If no red flags and low risk) ===
    if (riskScore <= 30 && !redFlagsHTML) {
        redFlagsHTML = `
            <div class="safe-message">
                <div class="safe-icon">✅</div>
                <div class="safe-text">${t_ui('noRedFlags')}</div>
            </div>`;
    }
    
    // === TECHNICAL DETAILS ===
    const technicalHTML = buildTechnicalDetailsSection(result, isArabic);
    
    // === ASSEMBLE CARD ===
    resultCard.innerHTML = `
        <div class="result-header">
            <div class="result-icon" role="img" aria-label="${classificationText}">${icon}</div>
            <div class="result-info">
                <div class="result-title">${sanitizeHTML(classificationText)}</div>
                <div class="risk-score-badge ${colorClass}">
                    ${riskScore}%
                </div>
            </div>
        </div>

        <div class="result-explanation">
            ${sanitizeHTML(explanation)}
        </div>

        ${redFlagsHTML}

        <div class="action-guidance" style="border-${isArabic ? 'right' : 'left'}-color: ${actionColor};">
            <div class="action-icon">${icon}</div>
            <div class="action-text">${sanitizeHTML(action)}</div>
        </div>

        ${technicalHTML}
    `;
    
    // === APPLY STYLING & ANIMATION ===
    resultCard.className = `result-card ${colorClass} show`;
    
    // === SAVE TO HISTORY ===
    saveToHistory(result);
    
    // === UPDATE EXPORT BUTTON ===
    updateExportButtonVisibility();
    
    // === SCROLL INTO VIEW ===
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// ============================================================================
// TECHNICAL DETAILS BUILDER
// ============================================================================

/**
 * Build technical details section HTML
 * @param {Object} result - Analysis result
 * @param {boolean} isArabic - Language flag
 * @returns {string} HTML string
 */
function buildTechnicalDetailsSection(result, isArabic) {
    if (!result.technical_details && !result.url_predictions) {
        return ''; // No technical data available
    }
    
    const tech = result.technical_details || {};
    
    // === OVERVIEW SECTION ===
    const overviewHTML = `
        <div class="tech-section">
            <h4 class="tech-section-title">${t_ui('overview')}</h4>
            <div class="tech-grid">
                <div class="tech-item">
                    <span class="tech-label">${t_ui('urlsFound')}:</span>
                    <span class="tech-value">${tech.urls_found || result.urlsFound || 0}</span>
                </div>
                <div class="tech-item">
                    <span class="tech-label">${t_ui('analysisMethod')}:</span>
                    <span class="tech-value">${tech.analysis_method || 'ML + LLM'}</span>
                </div>
                <div class="tech-item">
                    <span class="tech-label">${t_ui('featuresAnalyzed')}:</span>
                    <span class="tech-value">${tech.features_analyzed || 0}</span>
                </div>
            </div>
        </div>
    `;
    
    // === RISK SCORES SECTION ===
    const scoresHTML = `
        <div class="tech-section">
            <h4 class="tech-section-title">${t_ui('riskScores')}</h4>
            <div class="tech-grid">
                <div class="tech-item">
                    <span class="tech-label">${t_ui('mlScore')}:</span>
                    <span class="tech-value risk-score">${tech.ml_risk_score || result.ml_risk_score || 0}%</span>
                </div>
                ${tech.llm_confidence || result.llmScore ? `
                <div class="tech-item">
                    <span class="tech-label">${t_ui('llmScore')}:</span>
                    <span class="tech-value risk-score">${tech.llm_confidence || result.llmScore}%</span>
                </div>
                ` : ''}
                <div class="tech-item ${tech.trusted_source ? 'trusted' : ''}">
                    <span class="tech-label">
                        ${tech.trusted_source ? '🛡️' : '⚠️'}
                        ${t_ui('source')}:
                    </span>
                    <span class="tech-value">
                        ${tech.trusted_source ? t_ui('trusted') : t_ui('untrusted')}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    // === URL TYPES SECTION ===
    let urlTypesHTML = '';
    if (tech.url_types && tech.url_types.length > 0) {
        urlTypesHTML = `
            <div class="tech-section">
                <h4 class="tech-section-title">${t_ui('urlTypes')}</h4>
                <div class="url-types">
                    ${tech.url_types.map(type => {
                        const typeData = getUrlTypeData(type, isArabic);
                        return `
                            <span class="${typeData.class}">
                                ${typeData.icon} ${typeData.label}
                            </span>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // === DETAILED RED FLAGS SECTION ===
    let detailedFlagsHTML = '';
    if (tech.red_flags_details && tech.red_flags_details.length > 0) {
        detailedFlagsHTML = `
            <div class="tech-section">
                <h4 class="tech-section-title">${t_ui('detailedAnalysis')}</h4>
                <div class="red-flags-details">
                    ${tech.red_flags_details.map(detail => `
                        <div class="red-flag-detail">${sanitizeHTML(detail)}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // === ASSEMBLE TECHNICAL SECTION ===
    return `
        <details class="technical-details">
            <summary>${t_ui('technicalDetailsTitle')}</summary>
            <div class="tech-content">
                ${overviewHTML}
                ${scoresHTML}
                ${urlTypesHTML}
                ${detailedFlagsHTML}
            </div>
        </details>
    `;
}

/**
 * Get URL type display data
 * @param {string} type - URL type
 * @param {boolean} isArabic - Language flag
 * @returns {Object} Display data
 */
function getUrlTypeData(type, isArabic) {
    const types = {
        'Phishing': { 
            class: 'url-type danger', 
            icon: '🚨', 
            labelAr: 'احتيالي', 
            labelEn: 'Phishing' 
        },
        'Suspicious': { 
            class: 'url-type warning', 
            icon: '⚠️', 
            labelAr: 'مشبوه', 
            labelEn: 'Suspicious' 
        },
        'Lookalike': { 
            class: 'url-type warning', 
            icon: '👁️', 
            labelAr: 'مشابه', 
            labelEn: 'Lookalike' 
        },
        'Trusted': { 
            class: 'url-type safe', 
            icon: '✅', 
            labelAr: 'موثوق', 
            labelEn: 'Trusted' 
        },
        'Safe': { 
            class: 'url-type safe', 
            icon: '✅', 
            labelAr: 'آمن', 
            labelEn: 'Safe' 
        },
        'No URLs': { 
            class: 'url-type', 
            icon: '📭', 
            labelAr: 'لا توجد روابط', 
            labelEn: 'No URLs' 
        }
    };
    
    const data = types[type] || types['Safe'];
    return {
        class: data.class,
        icon: data.icon,
        label: isArabic ? data.labelAr : data.labelEn
    };
}

/**
 * Get default action text
 * @param {string} classification - Classification
 * @param {string} lang - Language
 * @returns {string} Action text
 */
function getDefaultAction(classification, lang) {
    const key = `action${classification.charAt(0).toUpperCase() + classification.slice(1).toLowerCase().replace('_', '')}`;
    return UI_TRANSLATIONS[lang][key] || UI_TRANSLATIONS[lang].actionSafe;
}

// ============================================================================
// HISTORY INTEGRATION
// ============================================================================

/**
 * Save result to history
 * @param {Object} result - Analysis result
 */
function saveToHistory(result) {
    if (typeof addToHistory === 'function') {
        const textarea = document.getElementById('messageInput');
        addToHistory(textarea.value, {
            classification: result.classification,
            classification_ar: result.classification_ar,
            riskScore: result.risk_score || result.riskScore
        });
    }
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

/**
 * Show loading state
 */
function showLoading() {
    const loading = document.getElementById('loading');
    const resultCard = document.getElementById('resultCard');
    const isArabic = window.currentLanguage === 'ar';
    
    loading.innerHTML = `
        <div class="spinner"></div>
        <p>${isArabic ? 'جاري فحص الرسالة وتحليل المحتوى بالذكاء الاصطناعي...' : 'Analyzing message with AI...'}</p>
    `;
    
    loading.classList.add('show');
    resultCard.classList.remove('show');
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.remove('show');
}

/**
 * Update export button visibility
 */
function updateExportButtonVisibility() {
    const exportBtn = document.getElementById('exportBtn');
    const resultCard = document.getElementById('resultCard');
    
    if (exportBtn && resultCard) {
        exportBtn.style.display = resultCard.classList.contains('show') ? 'flex' : 'none';
    }
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Open modal
 * @param {string} modalId - Modal ID
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close modal
 * @param {string} modalId - Modal ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

/**
 * Sanitize HTML
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Legacy display function (redirects to enhanced version)
 */
function displayResult(result) {
    displayEnhancedResult(result);
}

// ============================================================================
// EXPORT GLOBAL FUNCTIONS
// ============================================================================

window.displayEnhancedResult = displayEnhancedResult;
window.displayResult = displayResult;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showNotification = showNotification;
window.updateExportButtonVisibility = updateExportButtonVisibility;
window.openModal = openModal;
window.closeModal = closeModal;
window.sanitizeHTML = sanitizeHTML;