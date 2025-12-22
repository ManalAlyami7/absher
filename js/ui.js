/**
 * ========================================
 * Tanabbah - Enhanced UI Display Module v2.2
 * ========================================
 * Complete technical details display
 * Author: Manal Alyami
 * Version: 2.2.0 - Full Technical Insights
 * ========================================
 */

/**
 * Display enhanced analysis result with complete technical details
 * @param {Object} result - Analysis result object from API
 */
function displayEnhancedResult(result) {
    const resultCard = document.getElementById('resultCard');
    const isArabic = window.currentLanguage === 'ar';
    
    // Get classification and risk score
    const classification = result.classification || 'SAFE';
    const classificationText = isArabic ? result.classification_ar : classification;
    const riskScore = Math.round(result.risk_score || result.combined_risk_score || 0);
    
    // Determine color class
    let colorClass = 'safe';
    if (classification.includes('LOW')) colorClass = 'low-risk';
    else if (classification.includes('SUSPICIOUS')) colorClass = 'suspicious';
    else if (classification.includes('HIGH')) colorClass = 'high-risk';
    
    // Icon selection
    const icons = {
        'safe': '✅',
        'low-risk': '⚠️',
        'suspicious': '🚨',
        'high-risk': '❌'
    };
    const icon = icons[colorClass];
    
    // Get explanation
    const explanation = isArabic ? result.explanation_ar : result.explanation;
    
    // Get action guidance
    const action = isArabic ? result.action_ar : result.action;
    
    // Determine action color
    const actionColors = {
        'safe': 'var(--success)',
        'low-risk': 'var(--warning)',
        'suspicious': 'var(--danger)',
        'high-risk': 'var(--danger)'
    };
    const actionColor = actionColors[colorClass];
    
    // === RED FLAGS DISPLAY ===
    let redFlagsHTML = '';
    const redFlags = isArabic ? result.red_flags_ar : result.red_flags;
    
    // Filter out "no red flags" messages for display
    const displayFlags = redFlags.filter(flag => {
        const lower = flag.toLowerCase();
        return !lower.includes('no red flags') && 
               !lower.includes('no significant') &&
               !lower.includes('لم يتم اكتشاف') &&
               !lower.includes('no clear');
    });
    
    if (displayFlags.length > 0 && riskScore > 25) {
        redFlagsHTML = `
            <div class="warnings-section">
                <div class="warnings-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" 
                              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>${isArabic ? 'مؤشرات الخطر' : 'Risk Indicators'}</span>
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
    } else if (riskScore <= 25) {
        redFlagsHTML = `
            <div class="safe-message">
                <div class="safe-icon">✅</div>
                <div class="safe-text">
                    ${isArabic ? 'لم يتم اكتشاف مؤشرات احتيال واضحة' : 'No clear fraud indicators detected'}
                </div>
            </div>`;
    }
    
    // === TECHNICAL DETAILS ===
    let technicalHTML = '';
    if (result.technical_details) {
        const tech = result.technical_details;
        const techTitle = isArabic ? '📊 تفاصيل تقنية (للمختصين)' : '📊 Technical Details (For Experts)';
        
        // Build technical details sections
        let techSections = '';
        
        // 1. Overview Section
        techSections += `
            <div class="tech-section">
                <h4 class="tech-section-title">
                    ${isArabic ? '📋 نظرة عامة' : '📋 Overview'}
                </h4>
                <div class="tech-grid">
                    <div class="tech-item">
                        <span class="tech-label">${isArabic ? 'عدد الروابط' : 'URLs Found'}:</span>
                        <span class="tech-value">${tech.urls_found}</span>
                    </div>
                    <div class="tech-item">
                        <span class="tech-label">${isArabic ? 'طريقة التحليل' : 'Analysis Method'}:</span>
                        <span class="tech-value">${tech.analysis_method}</span>
                    </div>
                    <div class="tech-item">
                        <span class="tech-label">${isArabic ? 'الخصائص المحللة' : 'Features Analyzed'}:</span>
                        <span class="tech-value">${tech.features_analyzed}</span>
                    </div>
                </div>
            </div>
        `;
        
        // 2. Risk Scores Section
        techSections += `
            <div class="tech-section">
                <h4 class="tech-section-title">
                    ${isArabic ? '📈 درجات الخطر' : '📈 Risk Scores'}
                </h4>
                <div class="tech-grid">
                    <div class="tech-item">
                        <span class="tech-label">${isArabic ? 'النموذج الآلي (ML)' : 'ML Model Score'}:</span>
                        <span class="tech-value risk-score">${tech.ml_risk_score}%</span>
                    </div>
                    ${tech.llm_confidence ? `
                    <div class="tech-item">
                        <span class="tech-label">${isArabic ? 'الذكاء الاصطناعي (LLM)' : 'AI Confidence'}:</span>
                        <span class="tech-value risk-score">${tech.llm_confidence}%</span>
                    </div>
                    ` : ''}
                    <div class="tech-item ${tech.trusted_source ? 'trusted' : ''}">
                        <span class="tech-label">
                            ${tech.trusted_source ? '🛡️' : '⚠️'}
                            ${isArabic ? 'المصدر' : 'Source'}:
                        </span>
                        <span class="tech-value">
                            ${tech.trusted_source ? 
                                (isArabic ? 'موثوق' : 'Trusted') : 
                                (isArabic ? 'غير موثوق' : 'Untrusted')}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        // 3. URL Types Section (if URLs found)
        if (tech.urls_found > 0 && tech.url_types.length > 0) {
            techSections += `
                <div class="tech-section">
                    <h4 class="tech-section-title">
                        ${isArabic ? '🔗 أنواع الروابط' : '🔗 URL Types'}
                    </h4>
                    <div class="url-types">
                        ${tech.url_types.map(type => {
                            let typeClass = 'url-type';
                            let typeIcon = '🔗';
                            let typeLabel = type;
                            
                            if (type === 'Phishing') {
                                typeClass += ' danger';
                                typeIcon = '🚨';
                                typeLabel = isArabic ? 'احتيالي' : 'Phishing';
                            } else if (type === 'Suspicious') {
                                typeClass += ' warning';
                                typeIcon = '⚠️';
                                typeLabel = isArabic ? 'مشبوه' : 'Suspicious';
                            } else if (type === 'Lookalike') {
                                typeClass += ' warning';
                                typeIcon = '👁️';
                                typeLabel = isArabic ? 'مشابه لموقع معروف' : 'Lookalike';
                            } else if (type === 'Trusted') {
                                typeClass += ' safe';
                                typeIcon = '✅';
                                typeLabel = isArabic ? 'موثوق' : 'Trusted';
                            } else if (type === 'Safe') {
                                typeClass += ' safe';
                                typeIcon = '✅';
                                typeLabel = isArabic ? 'آمن' : 'Safe';
                            }
                            
                            return `
                                <span class="${typeClass}">
                                    ${typeIcon} ${typeLabel}
                                </span>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // 4. Detailed Red Flags Section
        if (tech.red_flags_details && tech.red_flags_details.length > 0) {
            techSections += `
                <div class="tech-section">
                    <h4 class="tech-section-title">
                        ${isArabic ? '🔍 تحليل مفصل' : '🔍 Detailed Analysis'}
                    </h4>
                    <div class="red-flags-details">
                        ${tech.red_flags_details.map(detail => `
                            <div class="red-flag-detail">
                                ${sanitizeHTML(detail)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        technicalHTML = `
            <details class="technical-details" open>
                <summary>${techTitle}</summary>
                <div class="tech-content">
                    ${techSections}
                </div>
            </details>
        `;
    }
    
    // === ASSEMBLE CARD ===
    resultCard.innerHTML = `
        <div class="result-header">
            <div class="result-icon" role="img" aria-label="${classificationText}">${icon}</div>
            <div class="result-info">
                <div class="result-title">${sanitizeHTML(classificationText)}</div>
                <div class="risk-score-badge" style="background: linear-gradient(135deg, var(--status-color), var(--status-color-light));">
                    ${riskScore}%
                </div>
            </div>
        </div>

        <div class="result-explanation">
            ${sanitizeHTML(explanation)}
        </div>

        ${redFlagsHTML}

        <div class="action-guidance" style="border-${isArabic ? 'right' : 'left'}: 4px solid ${actionColor};">
            <div class="action-icon">${icon}</div>
            <div class="action-text">${sanitizeHTML(action)}</div>
        </div>

        ${technicalHTML}
    `;
    
    // Apply color class and show
    resultCard.className = `result-card ${colorClass} show`;
    
    // Save to history
    if (typeof addToHistory === 'function') {
        const textarea = document.getElementById('messageInput');
        addToHistory(textarea.value, {
            classification: classification,
            classification_ar: result.classification_ar,
            riskScore: riskScore
        });
    }
    
    // Update export button
    if (typeof updateExportButtonVisibility === 'function') {
        updateExportButtonVisibility();
    }
    
    // Scroll into view
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

/**
 * Enhanced CSS for complete technical details display
 */
const enhancedTechnicalStyles = `
<style>
/* Technical Details Container */
.technical-details {
    margin: 20px 36px;
    border: 2px solid var(--border-light);
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg);
}

.technical-details summary {
    padding: 16px 20px;
    background: var(--card-bg);
    cursor: pointer;
    font-weight: 700;
    color: var(--text);
    font-size: 1rem;
    user-select: none;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.technical-details summary:hover {
    background: var(--bg);
}

.tech-content {
    padding: 20px;
    background: var(--card-bg);
}

/* Technical Sections */
.tech-section {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-light);
}

.tech-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
}

.tech-section-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Technical Grid */
.tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.tech-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--bg);
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.tech-item:hover {
    background: var(--border-light);
    transform: translateY(-2px);
}

.tech-item.trusted {
    background: rgba(5, 150, 105, 0.1);
    border: 1px solid var(--success);
}

.tech-label {
    font-weight: 600;
    color: var(--text-secondary);
}

.tech-value {
    font-weight: 800;
    color: var(--text);
}

.tech-value.risk-score {
    color: var(--status-color);
    font-size: 1.1rem;
}

/* URL Types */
.url-types {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.url-type {
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 700;
    border: 2px solid;
    transition: all 0.3s ease;
}

.url-type.safe {
    background: rgba(5, 150, 105, 0.1);
    border-color: var(--success);
    color: var(--success);
}

.url-type.warning {
    background: rgba(245, 158, 11, 0.1);
    border-color: var(--warning);
    color: var(--warning);
}

.url-type.danger {
    background: rgba(239, 68, 68, 0.1);
    border-color: var(--danger);
    color: var(--danger);
}

.url-type:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
}

/* Red Flags Details */
.red-flags-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.red-flag-detail {
    padding: 12px 16px;
    background: var(--bg);
    border-left: 3px solid var(--primary);
    border-radius: 6px;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--text-secondary);
    font-weight: 600;
}

[dir="ltr"] .red-flag-detail {
    border-left: none;
    border-right: 3px solid var(--primary);
}

.red-flag-detail:hover {
    background: var(--border-light);
}

/* Safe Message */
.safe-message {
    padding: 24px 36px;
    background: rgba(5, 150, 105, 0.05);
    border-bottom: 1px solid var(--border-light);
    display: flex;
    align-items: center;
    gap: 16px;
}

.safe-icon {
    font-size: 2rem;
    flex-shrink: 0;
}

.safe-text {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--success);
}

/* Action Guidance */
.action-guidance {
    padding: 24px 36px;
    background: var(--status-bg);
    display: flex;
    align-items: center;
    gap: 16px;
}

.action-icon {
    font-size: 2rem;
    flex-shrink: 0;
}

.action-text {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text);
    line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 768px) {
    .tech-grid {
        grid-template-columns: 1fr;
    }
    
    .technical-details {
        margin: 16px 24px;
    }
    
    .tech-content {
        padding: 16px;
    }
    
    .url-types {
        flex-direction: column;
    }
    
    .url-type {
        width: 100%;
        text-align: center;
    }
}
</style>
`;

// Inject enhanced technical styles
if (!document.getElementById('enhanced-technical-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'enhanced-technical-styles';
    styleEl.innerHTML = enhancedTechnicalStyles;
    document.head.appendChild(styleEl);
}

// Export the enhanced function
window.displayEnhancedResult = displayEnhancedResult;

/**
 * Update the main display function
 */
function displayResult(result) {
    if (window.displayEnhancedResult) {
        window.displayEnhancedResult(result);
    } else {
        console.warn('Enhanced display not available');
    }
}

// Loading state management
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

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.remove('show');
}

// Notification system
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

// Export button visibility
function updateExportButtonVisibility() {
    const exportBtn = document.getElementById('exportBtn');
    const resultCard = document.getElementById('resultCard');
    
    if (exportBtn && resultCard) {
        if (resultCard.classList.contains('show')) {
            exportBtn.style.display = 'flex';
        } else {
            exportBtn.style.display = 'none';
        }
    }
}

// Modal functions
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

// HTML sanitization helper
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}