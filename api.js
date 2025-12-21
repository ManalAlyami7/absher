/**
 * ========================================
 * Tanabbah - API Integration Module
 * ========================================
 * Original Concept: Naif Saleh
 * Enhanced Development: Manal Alyami
 * © 2025 All Rights Reserved
 * ========================================
 */

const API_URL = 'https://tanabbah-production-a91f.up.railway.app/api/analyze';
const REPORT_URL = API_URL.replace('/analyze', '/report');

/**
 * Analyze message via API
 * @param {string} message - Message to analyze
 * @param {boolean} enableLLM - Enable LLM analysis
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeViaAPI(message, enableLLM = true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: message,
                enable_llm: enableLLM
            }),
            signal: controller.signal
        });

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
    
    // Add URL predictions as warnings
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
    
    // Add LLM red flags
    if (data.llm_analysis && data.llm_analysis.red_flags) {
        data.llm_analysis.red_flags.slice(0, 3).forEach(flag => {
            warnings.push(
                currentLanguage === 'ar'
                    ? `🧠 ${translateLLMFlag(flag)}`
                    : `🧠 ${flag}`
            );
        });
    }
    
    return {
        classification,
        classification_ar,
        riskScore,
        icon,
        explanation: currentLanguage === 'ar'
            ? `تم فحص الرسالة بالذكاء الاصطناعي وتحليل ${warnings.length} مؤشر أمني`
            : `Message analyzed with AI and ${warnings.length} security indicators checked`,
        warnings: warnings,
        urlsFound: data.urls_found || 0,
        mlScore: Math.round(data.ml_risk_score || 0),
        llmScore: data.llm_analysis ? Math.round(data.llm_analysis.context_score) : undefined,
        llmAnalysis: data.llm_analysis
    };
}

/**
 * Send report to authorities
 * @param {string} message - Message to report
 * @returns {Promise<boolean>} Success status
 */
async function sendReport(message) {
    try {
        const payload = {
            message: sanitizeHTML(message.substring(0, 1000)),
            timestamp: new Date().toISOString(),
            language: currentLanguage
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(REPORT_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        console.error('Report error:', error);
        return false;
    }
}