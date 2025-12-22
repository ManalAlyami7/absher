/**
 * ========================================
 * Tanabbah - Enhanced API Integration v2.2
 * ========================================
 * Complete API communication with language support
 * Author: Manal Alyami
 * Version: 2.2.0
 * ========================================
 */

// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://tanabbah-production-a91f.up.railway.app',
    ANALYZE_ENDPOINT: '/api/analyze',
    REPORT_ENDPOINT: '/api/report',
    TIMEOUT: 20000
};

/**
 * Analyze message via API with complete technical details
 * @param {string} message - Message to analyze
 * @param {boolean} enableLLM - Enable LLM analysis
 * @returns {Promise<Object>} Complete analysis result
 */
async function analyzeViaAPI(message, enableLLM = true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
        const language = window.currentLanguage || 'ar';
        
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ANALYZE_ENDPOINT}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: message,
                    enable_llm: enableLLM,
                    language: language
                }),
                signal: controller.signal
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return processEnhancedAPIResponse(data);
        
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

/**
 * Process enhanced API response
 * @param {Object} data - Raw API response
 * @returns {Object} Processed result
 */
function processEnhancedAPIResponse(data) {
    // The API now returns complete data, so we just need to ensure it's formatted correctly
    return {
        // Classification
        classification: data.classification,
        classification_ar: data.classification_ar,
        
        // Explanations
        explanation: data.explanation,
        explanation_ar: data.explanation_ar,
        
        // Risk Score
        risk_score: data.risk_score,
        riskScore: data.risk_score, // Backward compatibility
        combined_risk_score: data.combined_risk_score,
        
        // Red Flags
        red_flags: data.red_flags || [],
        red_flags_ar: data.red_flags_ar || [],
        warnings: data.red_flags_ar || [], // Backward compatibility
        
        // Action Guidance
        action: data.action,
        action_ar: data.action_ar,
        
        // Technical Details
        technical_details: data.technical_details,
        
        // URL Information
        urls_found: data.urls_found || 0,
        urlsFound: data.urls_found || 0, // Backward compatibility
        url_predictions: data.url_predictions || [],
        
        // ML/LLM Scores
        ml_risk_score: data.ml_risk_score,
        mlScore: data.ml_risk_score, // Backward compatibility
        llm_analysis: data.llm_analysis,
        llmScore: data.llm_analysis?.confidence,
        llmAnalysis: data.llm_analysis, // Backward compatibility
        
        // Icon (for backward compatibility)
        icon: getIconForClassification(data.classification),
        
        // Status
        status: data.status
    };
}

/**
 * Get icon for classification
 * @param {string} classification - Classification type
 * @returns {string} Emoji icon
 */
function getIconForClassification(classification) {
    const icons = {
        'SAFE': '✅',
        'LOW_RISK': '⚠️',
        'SUSPICIOUS': '🚨',
        'HIGH_RISK': '❌'
    };
    return icons[classification] || '✅';
}

/**
 * Local fallback analysis with enhanced details
 * @param {string} text - Text to analyze
 * @returns {Object} Analysis result
 */
function performLocalAnalysis(text) {
    const isArabic = window.currentLanguage === 'ar';
    const urls = extractURLs(text);
    let riskScore = 0;
    const redFlags = [];
    const redFlagsAr = [];
    const urlTypes = [];
    
    // Check for URLs
    if (urls.length > 0) {
        riskScore += 15;
        
        // Check for URL shorteners (HIGH RISK)
        const shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 't.co', 'is.gd'];
        const hasShorteners = urls.some(url => 
            shorteners.some(s => url.toLowerCase().includes(s))
        );
        
        if (hasShorteners) {
            riskScore += 35;
            redFlags.push('Contains shortened URLs');
            redFlagsAr.push('يحتوي على روابط مختصرة مشبوهة');
            urlTypes.push('Suspicious');
        }
        
        // Check for insecure links
        if (urls.some(url => url.toLowerCase().startsWith('http://'))) {
            riskScore += 20;
            redFlags.push('Insecure HTTP links');
            redFlagsAr.push('روابط غير آمنة (HTTP)');
        }
    }
    
    // Check for urgency patterns
    const urgencyPatterns = ['تعليق', 'إيقاف', 'suspended', 'urgent', 'فوراً', 'immediately'];
    if (urgencyPatterns.some(p => text.toLowerCase().includes(p.toLowerCase()))) {
        riskScore += 25;
        redFlags.push('Urgency tactics');
        redFlagsAr.push('أسلوب الاستعجال والضغط');
    }
    
    // Check for government impersonation
    const govServices = ['أبشر', 'absher', 'ناجز', 'najiz', 'وزارة', 'ministry'];
    const officialDomains = ['absher.sa', 'najiz.sa', '.gov.sa'];
    
    if (govServices.some(s => text.toLowerCase().includes(s.toLowerCase())) && 
        urls.length > 0 && 
        !urls.some(url => officialDomains.some(d => url.toLowerCase().includes(d)))) {
        riskScore += 35;
        redFlags.push('Potential government impersonation');
        redFlagsAr.push('انتحال صفة جهة حكومية');
        urlTypes.push('Phishing');
    }
    
    // Check for sensitive data requests
    const sensitiveKeywords = ['password', 'pin', 'otp', 'cvv', 
                               'كلمة المرور', 'رمز التحقق', 'بطاقة'];
    if (sensitiveKeywords.some(word => text.toLowerCase().includes(word))) {
        riskScore += 30;
        redFlags.push('Requests sensitive information');
        redFlagsAr.push('طلب معلومات حساسة');
    }
    
    // Cap risk score
    riskScore = Math.min(100, riskScore);
    
    // Determine classification
    let classification, classificationAr;
    if (riskScore <= 30) {
        classification = 'SAFE';
        classificationAr = 'آمنة';
    } else if (riskScore <= 55) {
        classification = 'LOW_RISK';
        classificationAr = 'منخفضة الخطورة';
    } else if (riskScore <= 75) {
        classification = 'SUSPICIOUS';
        classificationAr = 'مشبوهة';
    } else {
        classification = 'HIGH_RISK';
        classificationAr = 'عالية الخطورة';
    }
    
    // Ensure we have at least one flag
    if (redFlags.length === 0) {
        redFlags.push('No significant red flags detected');
        redFlagsAr.push('لم يتم اكتشاف مؤشرات احتيال واضحة');
    }
    
    // Generate explanations
    const isTrusted = false;
    const explanationAr = getExplanationText(classification, riskScore, isTrusted, 'ar');
    const explanationEn = getExplanationText(classification, riskScore, isTrusted, 'en');
    
    // Get action guidance
    const actionAr = getActionText(classification, 'ar');
    const actionEn = getActionText(classification, 'en');
    
    // Build technical details
    const technicalDetails = {
        urls_found: urls.length,
        url_types: urlTypes.length > 0 ? urlTypes : ['No URLs'],
        ml_risk_score: riskScore,
        llm_confidence: null,
        trusted_source: false,
        red_flags_details: [
            ...redFlagsAr,
            `تم اكتشاف ${urls.length} رابط`,
            `طريقة التحليل: محلية (Heuristic)`,
            `درجة الخطر الإجمالية: ${riskScore}%`
        ],
        analysis_method: 'Local Heuristic',
        features_analyzed: urls.length * 41
    };
    
    return {
        classification,
        classification_ar: classificationAr,
        explanation: isArabic ? explanationAr : explanationEn,
        explanation_ar: explanationAr,
        risk_score: riskScore,
        riskScore: riskScore,
        combined_risk_score: riskScore,
        red_flags: redFlags,
        red_flags_ar: redFlagsAr,
        warnings: redFlagsAr,
        action: isArabic ? actionAr : actionEn,
        action_ar: actionAr,
        technical_details: technicalDetails,
        urls_found: urls.length,
        urlsFound: urls.length,
        url_predictions: [],
        ml_risk_score: riskScore,
        mlScore: riskScore,
        llm_analysis: null,
        llmScore: null,
        icon: getIconForClassification(classification),
        status: 'success'
    };
}

/**
 * Get explanation text
 */
function getExplanationText(classification, riskScore, isTrusted, language) {
    if (language === 'ar') {
        if (classification === 'SAFE') {
            if (isTrusted) {
                return `الرسالة تبدو رسمية وصادرة من جهة موثوقة. لم يتم اكتشاف مؤشرات احتيال واضحة. (درجة الخطر: ${riskScore}%)`;
            }
            return `الرسالة تبدو آمنة بشكل عام. لا توجد مؤشرات خطر واضحة. (درجة الخطر: ${riskScore}%)`;
        } else if (classification === 'LOW_RISK') {
            return `الرسالة تحتوي على بعض العلامات التي تستدعي الحذر المعتدل. يُنصح بالتحقق من المصدر. (درجة الخطر: ${riskScore}%)`;
        } else if (classification === 'SUSPICIOUS') {
            return `الرسالة تحتوي على عدة مؤشرات مشبوهة. توخَّ الحذر الشديد ولا تضغط على أي روابط. (درجة الخطر: ${riskScore}%)`;
        } else {
            return `الرسالة تحتوي على مؤشرات احتيال قوية. لا تتفاعل معها ويُنصح بحذفها فوراً. (درجة الخطر: ${riskScore}%)`;
        }
    } else {
        if (classification === 'SAFE') {
            if (isTrusted) {
                return `Message appears official from a trusted source. No clear fraud indicators detected. (Risk score: ${riskScore}%)`;
            }
            return `Message appears generally safe. No clear risk indicators found. (Risk score: ${riskScore}%)`;
        } else if (classification === 'LOW_RISK') {
            return `Message contains some signs requiring moderate caution. Verify the source. (Risk score: ${riskScore}%)`;
        } else if (classification === 'SUSPICIOUS') {
            return `Message contains several suspicious indicators. Exercise extreme caution and don't click any links. (Risk score: ${riskScore}%)`;
        } else {
            return `Message contains strong fraud indicators. Do not interact and delete immediately. (Risk score: ${riskScore}%)`;
        }
    }
}

/**
 * Get action text
 */
function getActionText(classification, language) {
    const actions = {
        'SAFE': { ar: '✅ لا يوجد إجراء مطلوب', en: '✅ No action required' },
        'LOW_RISK': { ar: '⚠️ تحقق قبل الضغط على أي رابط', en: '⚠️ Verify before clicking any links' },
        'SUSPICIOUS': { ar: '🚫 لا تضغط على الروابط حتى تتأكد من المصدر', en: '🚫 Do not click links until you verify the source' },
        'HIGH_RISK': { ar: '❌ يُنصح بحذف الرسالة وعدم التفاعل معها', en: '❌ Recommended to delete and not interact' }
    };
    return actions[classification]?.[language] || actions['SAFE'][language];
}

/**
 * Extract URLs from text
 */
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
    
    return [...new Set(urls)];
}

/**
 * Send report to authorities
 */
async function sendReportToAPI(message) {
    try {
        const language = window.currentLanguage || 'ar';
        const payload = {
            message: sanitizeHTML(message.substring(0, 1000)),
            timestamp: new Date().toISOString(),
            language: language
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.REPORT_ENDPOINT}`,
            {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            }
        );

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.error('Report error:', error);
        return false;
    }
}

/**
 * Check API health
 */
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        return response.ok;
    } catch (error) {
        console.error('Health check failed:', error);
        return false;
    }
}

/**
 * HTML sanitization helper
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Export functions for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        analyzeViaAPI,
        processEnhancedAPIResponse,
        performLocalAnalysis,
        sendReportToAPI,
        checkAPIHealth
    };
}

// Make functions available globally in browser
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
    window.analyzeViaAPI = analyzeViaAPI;
    window.processEnhancedAPIResponse = processEnhancedAPIResponse;
    window.performLocalAnalysis = performLocalAnalysis;
    window.sendReportToAPI = sendReportToAPI;
    window.checkAPIHealth = checkAPIHealth;
}