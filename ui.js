/**
 * ========================================
 * Tanabbah - UI Display Module
 * ========================================
 * Original Concept: Naif Saleh
 * Enhanced Development: Manal Alyami
 * © 2025 All Rights Reserved
 * ========================================
 */

// ============================================================================
// INCLUSIVE RESULT CARD DISPLAY
// ============================================================================

/**
 * Display analysis result with inclusive, user-friendly design
 * @param {Object} result - Analysis result object
 */
function displayResult(result) {
    const resultCard = document.getElementById('resultCard');
    
    // Determine color class and status
    let colorClass = 'safe';
    if (result.classification === 'SUSPICIOUS') colorClass = 'suspicious';
    if (result.classification === 'FRAUD') colorClass = 'fraud';

    // Get display classification based on language
    const displayClassification = currentLanguage === 'ar' 
        ? result.classification_ar 
        : result.classification;

    // Build risk description
    const riskDescriptions = {
        ar: {
            safe: 'هذه الرسالة تبدو آمنة بشكل عام. لا توجد مؤشرات خطر واضحة.',
            suspicious: 'هذه الرسالة تحتوي على بعض العلامات المشبوهة. توخَّ الحذر.',
            fraud: 'هذه الرسالة تحتوي على مؤشرات احتيال قوية. لا تتفاعل معها.'
        },
        en: {
            safe: 'This message appears generally safe. No clear risk indicators found.',
            suspicious: 'This message contains some suspicious signs. Exercise caution.',
            fraud: 'This message shows strong fraud indicators. Do not interact with it.'
        }
    };

    const riskDesc = currentLanguage === 'ar' 
        ? riskDescriptions.ar[colorClass]
        : riskDescriptions.en[colorClass];

    // Build key findings badges
    let findingsBadges = '';
    
    if (result.urlsFound > 0) {
        findingsBadges += `
            <div class="finding-badge ${colorClass === 'safe' ? 'positive' : 'warning'}">
                <span class="finding-icon">🔗</span>
                <span>${result.urlsFound} ${currentLanguage === 'ar' ? 'روابط تم فحصها' : 'URLs analyzed'}</span>
            </div>`;
    } else {
        findingsBadges += `
            <div class="finding-badge positive">
                <span class="finding-icon">✅</span>
                <span>${currentLanguage === 'ar' ? 'لا توجد روابط' : 'No URLs found'}</span>
            </div>`;
    }

    if (result.mlScore !== undefined && result.mlScore > 0) {
        const mlClass = result.mlScore > 70 ? 'danger' : (result.mlScore > 40 ? 'warning' : 'positive');
        findingsBadges += `
            <div class="finding-badge ${mlClass}">
                <span class="finding-icon">🤖</span>
                <span>${currentLanguage === 'ar' ? 'فحص آلي' : 'ML Analysis'}: ${result.mlScore}%</span>
            </div>`;
    }

    if (result.llmScore !== undefined) {
        const llmClass = result.llmScore > 70 ? 'danger' : (result.llmScore > 40 ? 'warning' : 'positive');
        findingsBadges += `
            <div class="finding-badge ${llmClass}">
                <span class="finding-icon">🧠</span>
                <span>${currentLanguage === 'ar' ? 'تحليل ذكي' : 'AI Analysis'}: ${result.llmScore}%</span>
            </div>`;
    }

    // Build warnings section
    let warningsHTML = '';
    if (result.warnings && result.warnings.length > 0) {
        const warningsTitle = currentLanguage === 'ar' 
            ? 'مؤشرات الخطر المكتشفة' 
            : 'Detected Risk Indicators';
        
        warningsHTML = `
            <div class="warnings-section">
                <div class="warnings-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" 
                              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" 
                              stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${warningsTitle}</span>
                </div>
                <div class="warning-list">
                    ${result.warnings.slice(0, 6).map(warning => `
                        <div class="warning-item">
                            <span class="warning-bullet" aria-hidden="true">•</span>
                            <div>${sanitizeHTML(warning)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    // Build recommendations
    const recommendations = {
        ar: {
            safe: 'يمكنك التفاعل مع هذه الرسالة بحذر معتدل. تأكد دائماً من مصدر الرسائل.',
            suspicious: '<strong>لا تضغط على أي روابط</strong> حتى تتحقق من مصدر الرسالة. تواصل مع الجهة المرسلة مباشرة إذا كنت بحاجة للتأكد.',
            fraud: '<strong>احذف هذه الرسالة فوراً</strong> ولا تتفاعل معها بأي شكل. لا تضغط على الروابط ولا تشارك أي معلومات شخصية.'
        },
        en: {
            safe: 'You may interact with this message with moderate caution. Always verify message sources.',
            suspicious: '<strong>Do not click any links</strong> until you verify the message source. Contact the sender directly if you need confirmation.',
            fraud: '<strong>Delete this message immediately</strong> and do not interact with it. Do not click links or share any personal information.'
        }
    };

    const recommendation = currentLanguage === 'ar' 
        ? recommendations.ar[colorClass]
        : recommendations.en[colorClass];

    const recommendationTitle = currentLanguage === 'ar' 
        ? 'ما يجب فعله' 
        : 'What to Do';

    // Build technical details section
    let techDetailsHTML = '';
    if (result.mlScore !== undefined || result.llmScore !== undefined || result.llmAnalysis) {
        const techTitle = currentLanguage === 'ar' ? 'التفاصيل التقنية' : 'Technical Details';
        const toggleText = currentLanguage === 'ar' ? 'عرض التفاصيل التقنية' : 'Show Technical Details';

        let techContent = '';

        if (result.mlScore !== undefined) {
            techContent += `
                <div class="tech-section">
                    <div class="tech-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        ${currentLanguage === 'ar' ? 'تحليل الروابط (ML)' : 'URL Analysis (ML)'}
                    </div>
                    <div class="tech-score-display">
                        <div class="tech-bar">
                            <div class="tech-bar-fill" style="width: ${result.mlScore}%"></div>
                        </div>
                        <span class="tech-score-value">${result.mlScore}%</span>
                    </div>
                </div>`;
        }

        if (result.llmAnalysis) {
            const llm = result.llmAnalysis;
            techContent += `
                <div class="tech-section">
                    <div class="tech-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${currentLanguage === 'ar' ? 'التحليل الذكي (AI)' : 'AI Analysis'}
                    </div>
                    <div class="tech-score-display">
                        <div class="tech-bar">
                            <div class="tech-bar-fill" style="width: ${llm.confidence}%"></div>
                        </div>
                        <span class="tech-score-value">${llm.confidence}%</span>
                    </div>
                    <ul class="tech-info-list">
                        <li>
                            <span class="tech-bullet">•</span>
                            <span>${sanitizeHTML(llm.reasoning)}</span>
                        </li>
                    </ul>
                </div>`;
        }

        techDetailsHTML = `
            <div class="tech-details-toggle">
                <button class="toggle-details-btn" onclick="toggleTechDetails()" aria-expanded="false">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M19 9l-7 7-7-7" stroke="currentColor" stroke-width="2" 
                              stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${toggleText}</span>
                </button>
            </div>
            <div class="tech-details-panel" id="techDetailsPanel">
                <div class="tech-details-content">
                    ${techContent}
                </div>
            </div>`;
    }

    // Assemble complete result card
    resultCard.innerHTML = `
        <div class="result-header">
            <div class="result-icon" role="img" aria-label="${displayClassification}">${result.icon}</div>
            <div class="result-info">
                <div class="result-title">${sanitizeHTML(displayClassification)}</div>
                <div class="result-subtitle">${result.classification}</div>
                <div class="risk-level-container">
                    <div class="risk-level-row">
                        <span class="risk-label">${currentLanguage === 'ar' ? 'درجة الخطر' : 'Risk Level'}</span>
                        <span class="risk-score-large">${result.riskScore}%</span>
                    </div>
                    <div class="risk-level-bar">
                        <div class="risk-level-fill" style="width: ${result.riskScore}%"></div>
                    </div>
                    <div class="risk-description">${riskDesc}</div>
                </div>
            </div>
        </div>

        <div class="result-summary">
            <div class="summary-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" 
                          stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>${currentLanguage === 'ar' ? 'ملخص الفحص' : 'Scan Summary'}</span>
            </div>
            <div class="summary-text">${sanitizeHTML(result.explanation)}</div>
        </div>

        ${findingsBadges ? `
        <div class="key-findings">
            <div class="findings-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" 
                          stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" 
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>${currentLanguage === 'ar' ? 'النتائج الرئيسية' : 'Key Findings'}</span>
            </div>
            <div class="findings-grid">
                ${findingsBadges}
            </div>
        </div>
        ` : ''}

        ${warningsHTML}

        <div class="recommendations-section">
            <div class="recommendations-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>${recommendationTitle}</span>
            </div>
            <div class="recommendation-box">
                ${recommendation}
            </div>
        </div>

        ${techDetailsHTML}
    `;

    // Apply color class and show
    resultCard.className = `result-card ${colorClass} show`;
    
    // Save to history
    const textarea = document.getElementById('messageInput');
    addToHistory(textarea.value, result);
    updateExportButtonVisibility();

    // Scroll into view
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// ============================================================================
// TECHNICAL DETAILS TOGGLE
// ============================================================================

function toggleTechDetails() {
    const panel = document.getElementById('techDetailsPanel');
    const btn = document.querySelector('.toggle-details-btn');
    
    if (panel && btn) {
        const isOpen = panel.classList.contains('show');
        
        if (isOpen) {
            panel.classList.remove('show');
            btn.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
        } else {
            panel.classList.add('show');
            btn.classList.add('active');
            btn.setAttribute('aria-expanded', 'true');
        }
    }
}

// ============================================================================
// LOADING STATE MANAGEMENT
// ============================================================================

function showLoading() {
    const loading = document.getElementById('loading');
    const resultCard = document.getElementById('resultCard');
    
    loading.innerHTML = `
        <div class="spinner"></div>
        <p>${t('analyzing')}</p>
    `;
    
    loading.classList.add('show');
    resultCard.classList.remove('show');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.remove('show');
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    
    const colors = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        ${currentLanguage === 'ar' ? 'right' : 'left'}: 20px;
        background: ${colors[type] || colors.success};
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

// ============================================================================
// EXPORT BUTTON VISIBILITY
// ============================================================================

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