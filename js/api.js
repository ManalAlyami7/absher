/**
 * ========================================
 * Tanabbah - API Integration
 * ========================================
 * Purpose: Backend communication, API calls
 * Author: Manal Alyami
 * Version: 2.0.0
 * ========================================
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_CONFIG = {
    BASE_URL: 'https://tanabbah-production-a91f.up.railway.app',
    ANALYZE_ENDPOINT: '/api/analyze',
    REPORT_ENDPOINT: '/api/report',
    TIMEOUT: 20000 // 20 seconds
};

// ============================================================================
// API CALL FUNCTIONS
// ============================================================================

/**
 * Analyze message via API
 * @param {string} message - Message to analyze
 * @param {boolean} enableLLM - Enable LLM analysis
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeViaAPI(message, enableLLM = true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ANALYZE_ENDPOINT}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: message,
                    enable_llm: enableLLM
                }),
                signal: controller.signal
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return processAPIResponse(data);
        
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

/**
 * Process API response into standard format
 * @param {Object} data - Raw API response
 * @returns {Object} Processed result
 */
function processAPIResponse(data) {
    const riskScore = Math.round(
        data.combined_risk_score || 
        data.ml_risk_score || 
        0
    );
    
    let classification, classification_ar, icon;
    
    // Determine classification based on risk score
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
    
    // Add URL predictions as warnings
    if (data.url_predictions && data.url_predictions.length > 0) {
        data.url_predictions.forEach(pred => {
            if (pred.probability >= 0.75) {
                warnings.push(
                    window.currentLanguage === 'ar'
                        ? `🚨 الرابط ${pred.url} عالي الخطورة (${(pred.probability * 100).toFixed(0)}%)`
                        : `🚨 URL ${pred.url} is high-risk (${(pred.probability * 100).toFixed(0)}%)`
                );
            }
        });
    }
    
    // Add LLM red flags
    if (data.llm_analysis && data.llm_analysis.red_flags) {
        data.llm_analysis.red_flags.slice(0, 3).forEach(flag => {
            warnings.push(
                window.currentLanguage === 'ar'
                    ? `🧠 ${translateLLMFlag(flag)}`
                    : `🧠 ${flag}`
            );
        });
    }
    
    // Calculate LLM score
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
        explanation: window.currentLanguage === 'ar'
            ? `تم فحص الرسالة بالذكاء الاصطناعي وتحليل ${warnings.length} مؤشر أمني`
            : `Message analyzed with AI and ${warnings.length} security indicators checked`,
        warnings: warnings.slice(0, 8),
        urlsFound: data.urls_found || 0,
        mlScore: Math.round(data.ml_risk_score || 0),
        llmScore: llmScore !== undefined ? Math.round(llmScore) : undefined,
        llmAnalysis: data.llm_analysis
    };
}

// ============================================================================
// LOCAL FALLBACK ANALYSIS
// ============================================================================

/**
 * Perform local analysis when API fails
 * @param {string} text - Text to analyze
 * @returns {Object} Analysis result
 */
function performLocalAnalysis(text) {
    const urls = extractURLs(text);
    let riskScore = 0;
    const warnings = [];
    
    // Check for URLs
    if (urls.length > 0) {
        riskScore += 15;
        
        // Check for URL shorteners
        const shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 'ow.ly'];
        if (urls.some(url => shorteners.some(s => url.toLowerCase().includes(s)))) {
            riskScore += 30;
            warnings.push(
                window.currentLanguage === 'ar' 
                    ? '🚨 يحتوي على روابط مختصرة' 
                    : '🚨 Contains shortened URLs'
            );
        }
        
        // Check for insecure links
        if (urls.some(url => url.toLowerCase().startsWith('http://'))) {
            riskScore += 20;
            warnings.push(
                window.currentLanguage === 'ar' 
                    ? '⚠️ روابط غير آمنة' 
                    : '⚠️ Insecure links'
            );
        }
    }
    
    // Check for urgency patterns
    const urgencyPatterns = ['تعليق', 'إيقاف', 'suspended', 'urgent', 'فوراً'];
    if (urgencyPatterns.some(p => text.toLowerCase().includes(p.toLowerCase()))) {
        riskScore += 25;
        warnings.push(
            window.currentLanguage === 'ar' 
                ? '🚨 أسلوب الضغط' 
                : '🚨 Pressure tactics'
        );
    }
    
    // Check for government impersonation
    const govServices = ['أبشر', 'absher', 'ناجز', 'najiz'];
    const officialDomains = ['absher.sa', 'najiz.sa', '.gov.sa'];
    
    if (govServices.some(s => text.toLowerCase().includes(s.toLowerCase())) && 
        urls.length > 0 && 
        !urls.some(url => officialDomains.some(d => url.toLowerCase().includes(d)))) {
        riskScore += 35;
        warnings.push(
            window.currentLanguage === 'ar' 
                ? '🚨 انتحال جهة حكومية' 
                : '🚨 Government impersonation'
        );
    }
    
    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);
    
    // Determine classification
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

// ============================================================================
// REPORT SUBMISSION
// ============================================================================

/**
 * Send report to authorities
 * @param {string} message - Message to report
 * @returns {Promise<boolean>} Success status
 */
async function sendReportToAPI(message) {
    try {
        const payload = {
            message: sanitizeHTML(message.substring(0, 1000)),
            timestamp: new Date().toISOString(),
            language: window.currentLanguage || 'ar'
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(
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
        return true;
    } catch (error) {
        console.error('Report error:', error);
        return false;
    }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check API health status
 * @returns {Promise<boolean>} True if API is healthy
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

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        analyzeViaAPI,
        processAPIResponse,
        performLocalAnalysis,
        sendReportToAPI,
        checkAPIHealth
    };
}