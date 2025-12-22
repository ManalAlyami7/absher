/**
 * ========================================
 * Tanabbah - Enhanced UI Display Module
 * ========================================
 * Purpose: Improved result display with Arabic UX
 * Author: Manal Alyami
 * Version: 2.1.0 - Arabic UX & Simplified Display
 * ========================================
 */

/**
 * Display enhanced analysis result with simplified Arabic UX
 * @param {Object} result - Analysis result object
 */
function displayEnhancedResult(result) {
    const resultCard = document.getElementById('resultCard');
    
    // Get classification from API (already in Arabic if available)
    const classification = result.classification || 'SAFE';
    const classificationAr = result.classification_ar || 'آمنة';
    const explanationAr = result.explanation_ar || 'الرسالة تبدو آمنة';
    
    // Determine color class
    let colorClass = 'safe';
    if (classification.includes('LOW')) colorClass = 'low-risk';
    else if (classification.includes('SUSPICIOUS')) colorClass = 'suspicious';
    else if (classification.includes('HIGH')) colorClass = 'high-risk';
    
    // Get display text based on language
    const isArabic = window.currentLanguage === 'ar';
    const displayClassification = isArabic ? classificationAr : classification;
    
    // Icon selection
    const icons = {
        'safe': '✅',
        'low-risk': '⚠️',
        'suspicious': '🚨',
        'high-risk': '❌'
    };
    const icon = icons[colorClass];
    
    // Risk score
    const riskScore = Math.round(result.combined_risk_score || result.riskScore || 0);
    
    // === SIMPLIFIED RED FLAGS DISPLAY ===
    let redFlagsHTML = '';
    
    // Get Arabic red flags if available
    const redFlags = result.llm_analysis?.red_flags_ar || 
                    result.llm_analysis?.red_flags || 
                    result.warnings || 
                    [];
    
    // Filter out "no red flags" messages for display
    const displayFlags = redFlags.filter(flag => {
        const lower = flag.toLowerCase();
        return !lower.includes('no red flags') && 
               !lower.includes('no significant') &&
               !lower.includes('لم يتم اكتشاف');
    });
    
    if (displayFlags.length > 0 && riskScore > 30) {
        redFlagsHTML = `
            <div class="warnings-section simplified">
                <div class="warnings-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" 
                              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>${isArabic ? 'مؤشرات الخطر' : 'Risk Indicators'}</span>
                </div>
                <div class="warning-list simplified">
                    ${displayFlags.slice(0, 3).map(flag => `
                        <div class="warning-item simple">
                            <span class="warning-bullet">•</span>
                            <div>${sanitizeHTML(flag)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    } else if (riskScore <= 30) {
        // Safe message - show positive feedback
        redFlagsHTML = `
            <div class="safe-message">
                <div class="safe-icon">✅</div>
                <div class="safe-text">
                    ${isArabic ? 'لم يتم اكتشاف مؤشرات احتيال واضحة' : 'No clear fraud indicators detected'}
                </div>
            </div>`;
    }
    
    // === ACTION GUIDANCE (SIMPLIFIED) ===
    const actionGuidance = {
        'safe': {
            ar: '✅ لا يوجد إجراء مطلوب',
            en: '✅ No action required',
            icon: '✅',
            color: 'var(--success)'
        },
        'low-risk': {
            ar: '⚠️ تحقق قبل الضغط على أي رابط',
            en: '⚠️ Verify before clicking any links',
            icon: '⚠️',
            color: 'var(--warning)'
        },
        'suspicious': {
            ar: '🚫 لا تضغط على الروابط حتى تتأكد من المصدر',
            en: '🚫 Do not click links until you verify the source',
            icon: '🚫',
            color: 'var(--danger)'
        },
        'high-risk': {
            ar: '❌ يُنصح بحذف الرسالة وعدم التفاعل معها',
            en: '❌ Recommended to delete and not interact',
            icon: '❌',
            color: 'var(--danger)'
        }
    };
    
    const action = actionGuidance[colorClass];
    const actionText = isArabic ? action.ar : action.en;
    
    // === TECHNICAL DETAILS (COLLAPSIBLE) ===
    let technicalHTML = '';
    if (result.urlsFound > 0 || result.ml_risk_score || result.llm_analysis) {
        const techTitle = isArabic ? 'تفاصيل تقنية (للمختصين فقط)' : 'Technical Details (For Experts)';
        
        let techDetails = [];
        if (result.urlsFound > 0) {
            techDetails.push(`
                <div class="tech-item">
                    <span class="tech-label">${isArabic ? 'روابط تم فحصها' : 'URLs Analyzed'}:</span>
                    <span class="tech-value">${result.urlsFound}</span>
                </div>
            `);
        }
        
        if (result.ml_risk_score !== undefined) {
            techDetails.push(`
                <div class="tech-item">
                    <span class="tech-label">${isArabic ? 'درجة النموذج الآلي' : 'ML Score'}:</span>
                    <span class="tech-value">${Math.round(result.ml_risk_score)}%</span>
                </div>
            `);
        }
        
        if (result.llm_analysis?.confidence) {
            techDetails.push(`
                <div class="tech-item">
                    <span class="tech-label">${isArabic ? 'درجة الذكاء الاصطناعي' : 'AI Score'}:</span>
                    <span class="tech-value">${Math.round(result.llm_analysis.confidence)}%</span>
                </div>
            `);
        }
        
        if (result.llm_analysis?.is_trusted_source) {
            techDetails.push(`
                <div class="tech-item trusted">
                    <span class="tech-label">🏛️ ${isArabic ? 'مصدر موثوق' : 'Trusted Source'}</span>
                </div>
            `);
        }
        
        technicalHTML = `
            <details class="technical-details">
                <summary>${techTitle}</summary>
                <div class="tech-content">
                    ${techDetails.join('')}
                </div>
            </details>
        `;
    }
    
    // === ASSEMBLE CARD ===
    resultCard.innerHTML = `
        <div class="result-header simplified">
            <div class="result-icon" role="img" aria-label="${displayClassification}">${icon}</div>
            <div class="result-info">
                <div class="result-title">${sanitizeHTML(displayClassification)}</div>
                <div class="risk-score-badge" style="background: linear-gradient(135deg, var(--status-color), var(--status-color-light));">
                    ${riskScore}%
                </div>
            </div>
        </div>

        <div class="result-explanation">
            ${sanitizeHTML(explanationAr)}
        </div>

        ${redFlagsHTML}

        <div class="action-guidance" style="border-left: 4px solid ${action.color};">
            <div class="action-icon">${action.icon}</div>
            <div class="action-text">${actionText}</div>
        </div>

        ${technicalHTML}
    `;
    
    // Apply color class and show
    resultCard.className = `result-card ${colorClass} show simplified`;
    
    // Save to history
    if (typeof addToHistory === 'function') {
        const textarea = document.getElementById('messageInput');
        addToHistory(textarea.value, {
            classification: classification,
            classification_ar: classificationAr,
            riskScore: riskScore
        });
    }
    
    // Update export button
    updateExportButtonVisibility();
    
    // Scroll into view
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

/**
 * Enhanced CSS for simplified display
 */
const enhancedStyles = `
<style>
/* Simplified Result Card */
.result-card.simplified {
    border-width: 2px;
}

.result-header.simplified {
    padding: 32px 36px;
    gap: 20px;
}

.result-icon {
    font-size: 3.5rem;
}

.risk-score-badge {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    color: white;
    font-weight: 900;
    font-size: 1.3rem;
    margin-top: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.result-explanation {
    padding: 24px 36px;
    font-size: 1.1rem;
    line-height: 1.8;
    color: var(--text-secondary);
    font-weight: 600;
    background: var(--bg);
    border-bottom: 1px solid var(--border-light);
}

/* Safe Message Display */
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
}

.safe-text {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--success);
}

/* Simplified Warnings */
.warnings-section.simplified {
    padding: 24px 36px;
    border-bottom: 1px solid var(--border-light);
}

.warning-list.simplified {
    gap: 10px;
}

.warning-item.simple {
    padding: 12px 16px;
    font-size: 0.95rem;
}

/* Action Guidance */
.action-guidance {
    padding: 24px 36px;
    background: var(--status-bg);
    display: flex;
    align-items: center;
    gap: 16px;
    border-left-width: 4px;
    border-left-style: solid;
}

[dir="ltr"] .action-guidance {
    border-left: none;
    border-right-width: 4px;
    border-right-style: solid;
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

/* Technical Details */
.technical-details {
    margin: 20px 36px;
    border: 2px solid var(--border-light);
    border-radius: 12px;
    overflow: hidden;
}

.technical-details summary {
    padding: 16px 20px;
    background: var(--bg);
    cursor: pointer;
    font-weight: 700;
    color: var(--text-muted);
    font-size: 0.9rem;
    user-select: none;
    transition: all 0.3s ease;
}

.technical-details summary:hover {
    background: var(--card-bg);
    color: var(--text);
}

.tech-content {
    padding: 16px 20px;
    background: var(--card-bg);
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.tech-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--bg);
    border-radius: 8px;
    font-size: 0.9rem;
}

.tech-item.trusted {
    background: rgba(5, 150, 105, 0.1);
    border: 1px solid var(--success);
    font-weight: 700;
    color: var(--success);
}

.tech-label {
    font-weight: 600;
    color: var(--text-secondary);
}

.tech-value {
    font-weight: 800;
    color: var(--text);
}

/* Color Variants */
.result-card.low-risk {
    --status-color: #f59e0b;
    --status-color-light: #fbbf24;
    --status-bg: rgba(245, 158, 11, 0.05);
}

.result-card.high-risk {
    --status-color: #dc2626;
    --status-color-light: #ef4444;
    --status-bg: rgba(220, 38, 38, 0.05);
}

@media (max-width: 768px) {
    .result-header.simplified,
    .result-explanation,
    .warnings-section.simplified,
    .action-guidance {
        padding: 20px 24px;
    }
    
    .technical-details {
        margin: 16px 24px;
    }
    
    .action-text {
        font-size: 1rem;
    }
}
</style>
`;

// Inject enhanced styles
if (!document.getElementById('enhanced-result-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'enhanced-result-styles';
    styleEl.innerHTML = enhancedStyles;
    document.head.appendChild(styleEl);
}

// Export the enhanced function
window.displayEnhancedResult = displayEnhancedResult;

/**
 * Update the main analyze function to use enhanced display
 */
function displayResult(result) {
    // Use enhanced display if available
    if (window.displayEnhancedResult) {
        window.displayEnhancedResult(result);
    } else {
        // Fallback to original display
        console.warn('Enhanced display not available, using fallback');
    }
}