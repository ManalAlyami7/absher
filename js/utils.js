/**
 * ========================================
 * Tanabbah - Utility Functions
 * ========================================
 * Purpose: Helper functions, storage, validation, translations
 * Author: Manal Alyami
 * Version: 2.0.0
 * ========================================
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const CONFIG = {
    HISTORY_KEY: 'tanabbah_history',
    DARK_MODE_KEY: 'tanabbah_dark',
    LANGUAGE_KEY: 'tanabbah_lang',
    MAX_HISTORY: 20,
    MAX_MESSAGE_LENGTH: 5000
};

// ============================================================================
// SECURITY & VALIDATION
// ============================================================================

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Validate message length
 * @param {string} message - Message to validate
 * @returns {boolean} True if valid
 */
function validateMessageLength(message) {
    return message.length <= CONFIG.MAX_MESSAGE_LENGTH;
}

// ============================================================================
// URL EXTRACTION
// ============================================================================

/**
 * Extract URLs from text
 * @param {string} text - Text containing URLs
 * @returns {Array<string>} Array of URLs
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
    
    return [...new Set(urls)]; // Remove duplicates
}

// ============================================================================
// STORAGE MANAGEMENT
// ============================================================================

/**
 * Save data to localStorage safely
 * @param {string} key - Storage key
 * @param {*} data - Data to save
 * @returns {boolean} Success status
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Storage error:', error);
        return false;
    }
}

/**
 * Load data from localStorage safely
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Loaded data or default value
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Storage error:', error);
        return defaultValue;
    }
}

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Storage error:', error);
        return false;
    }
}

// ============================================================================
// TRANSLATION SYSTEM
// ============================================================================

const translations = {
    ar: {
        // Header & Brand
        language: 'English',
        languageAr: 'العربية',
        darkMode: 'نمط العرض',
        history: 'السجل',
        save: 'تصدير',
        report: 'إبلاغ',
        app: 'التطبيق',
        
        // Privacy
        privacyNotice: 'نحن لا نحفظ أو نخزن الرسائل التي تفحصها. خصوصيتك مهمة لنا',
        
        // Main Section
        mainTitle: 'ماسح الرسائل الاحتيالية',
        mainSubtitle: 'الصق الرسالة المشبوهة أدناه لتحليلها فورًا',
        placeholder: 'مثال: تم تعليق حسابك في أبشر. يُرجى النقر على الرابط bit.ly/abs123 لتحديثه خلال 24 ساعة...',
        paste: 'لصق',
        clear: 'مسح',
        analyze: 'تحليل الرسالة',
        analyzing: 'جاري تحليل الرسالة وفحص محتواها باستخدام الذكاء الاصطناعي...',
        
        // Results
        safe: 'آمنة',
        suspicious: 'مشبوهة',
        fraud: 'احتيالية',
        riskScore: 'نسبة الخطر',
        explanation: 'تم تحليل الرسالة بنجاح باستخدام الذكاء الاصطناعي',
        
        // Tips Section
        tipsTitle: 'توصيات الأمان',
        tip1: 'لا تُشارك معلوماتك السرية أو رموز التحقق مطلقًا',
        tip2: 'تحقّق من صحة الروابط قبل النقر عليها',
        tip3: 'النطاق الرسمي لأبشر: ',
        tip3Value: 'absher.sa',
        tip4: 'المواقع الحكومية تنتهي بـ: ',
        tip4Value: '.gov.sa',
        tip5: 'احذر من الرسائل التي تطالب باتخاذ إجراء فوري',
        
        // Official Sites
        officialSitesTitle: 'المواقع الرسمية',
        
        // History
        historyTitle: 'الرسائل التي تم تحليلها',
        noHistory: 'لم تتم تحليل أية رسائل بعد',
        deleteHistory: 'حذف السجل بأكمله',
        confirmDeleteOne: 'هل ترغب في حذف هذا السجل؟',
        confirmDeleteAll: 'هل ترغب في حذف السجل بأكمله؟\n\nلا يمكن التراجع عن هذا الإجراء.',
        confirmClear: 'هل ترغب في مسح الرسالة؟',
        searchHistory: 'البحث في السجل...',
        searchLabel: 'البحث في السجل',
        searchBtnLabel: 'بحث',
        clearHistory: 'حذف السجل بأكمله',
        
        // Report
        reportTitle: 'الإبلاغ عن رسالة احتيالية',
        reportDescription: 'سيتم إرسال الرسالة إلى الجهات المختصة لاتخاذ الإجراءات اللازمة. نُقدّر مساهمتكم في حماية المجتمع من الاحتيال الإلكتروني.',
        reportInfo: 'سيتم إرسال البلاغ بشكل سري وآمن',
        sendReport: 'إرسال البلاغ',
        cancel: 'إلغاء',
        reportThisMessage: 'الإبلاغ عن هذه الرسالة',
        
        // Notifications
        notifPasted: '✅ تم اللصق بنجاح',
        notifCleared: '🗑️ تم المسح',
        notifSaved: '✅ تم حفظ النتيجة بنجاح',
        notifPasteFailed: '⚠️ يُرجى استخدام Ctrl+V للصق',
        notifNoResult: '⚠️ لا توجد نتيجة للحفظ',
        notifNoMessage: '⚠️ يُرجى لصق الرسالة أولًا',
        notifDeleted: '🗑️ تم حذف السجل',
        notifAllDeleted: '🗑️ تم حذف جميع السجلات',
        notifMessageTooLong: '⚠️ الرسالة طويلة جدًا. الحد الأقصى 5000 حرف',
        reportSending: '⏳ جاري إرسال البلاغ...',
        reportSent: '✅ تم إرسال البلاغ بنجاح إلى الجهات المختصة',
        reportFailed: '⚠️ فشل إرسال البلاغ. يُرجى المحاولة لاحقًا',
        
        // Footer
        footerText: 'يُعد \"تنـبَّـه\" تطبيقًا مستقلًا غير تابع لأية جهة حكومية. يهدف التطبيق إلى التوعية وحماية المستخدمين من الاحتيال الإلكتروني.',
        
        // Premium Mobile App
        premiumTitle: 'تنـبَّـه - تطبيق مميز',
        premiumHeader: 'حماية مُتقدمة من الرسائل الاحتيالية',
        premiumDesc: 'احمِ نفسك وعائلتك من الاحتيال الإلكتروني مع <strong>التحديثات التلقائية</strong> وتحليل الرسائل في الخلفية',
        feature1: 'فحص تلقائي',
        feature2: 'تنبيهات فورية',
        feature3: 'تقارير مفصلة',
        feature4: 'تحليل ذكي',
        downloadBtn: 'ابدأ الآن - تجربة مجانية',
        trial: '✨ تجربة مجانية 7 أيام - لا حاجة لبطاقة ائتمان',
        termsAr: 'بتنزيل التطبيق، أنت توافق على <a href="#" style="color: var(--primary); text-decoration: underline;">الشروط والأحكام</a>. يمكنك إلغاء الاشتراك في أي وقت',
        
        // New Premium Modal Texts
        premiumBadgeText: '✓ حماية مُتقدمة',
        proofLabel1: 'مستخدم',
        proofLabel2: 'دقة',
        proofLabel3: 'حماية',
        guaranteeText: '✓ ضمان استرداد الأموال لمدة 30 يومًا'
    },
    en: {
        // Header & Brand
        language: 'Arabic',
        languageAr: 'عربي',
        darkMode: 'Theme',
        history: 'History',
        save: 'Export',
        report: 'Report',
        app: 'App',
        
        // Privacy
        privacyNotice: 'We do not save or store the messages you check. Your privacy matters to us',
        
        // Main Section
        mainTitle: 'Fraud Message Scanner',
        mainSubtitle: 'Paste the suspicious message below to scan it instantly',
        placeholder: 'Example: Your Absher account has been suspended. Click bit.ly/abs456 to update within 24 hours...',
        paste: 'Paste',
        clear: 'Clear',
        analyze: 'Analyze Message',
        analyzing: 'Analyzing message with AI and scanning content...',
        
        // Results
        safe: 'Likely Safe',
        suspicious: 'Suspicious',
        fraud: 'Fraudulent',
        riskScore: 'Risk Score',
        explanation: 'Message analyzed successfully with AI',
        
        // Tips Section
        tipsTitle: 'Security Tips',
        tip1: 'Never share passwords or verification codes',
        tip2: 'Verify links before clicking',
        tip3: 'Official domain: ',
        tip3Value: 'absher.sa',
        tip4: 'Government sites end with: ',
        tip4Value: '.gov.sa',
        tip5: 'Beware of messages requesting urgent action',
        
        // Official Sites
        officialSitesTitle: 'Official Websites',
        
        // History
        historyTitle: 'Previously Analyzed Messages',
        noHistory: 'No messages analyzed yet',
        deleteHistory: 'Delete All History',
        confirmDeleteOne: 'Do you want to delete this record?',
        confirmDeleteAll: 'Do you want to delete all history?\n\nThis action cannot be undone.',
        confirmClear: 'Do you want to clear the message?',
        searchHistory: 'Search history...',
        searchLabel: 'Search history',
        searchBtnLabel: 'Search',
        clearHistory: 'Delete all history',
        
        // Report
        reportTitle: 'Report Fraudulent Message',
        reportDescription: 'The message will be sent to authorities for investigation. Thank you for your contribution to protecting the community from fraud.',
        reportInfo: 'Report will be sent securely and anonymously',
        sendReport: 'Send Report',
        cancel: 'Cancel',
        reportThisMessage: 'Report this message',
        
        // Notifications
        notifPasted: '✅ Pasted successfully',
        notifCleared: '🗑️ Cleared',
        notifSaved: '✅ Result copied successfully',
        notifPasteFailed: '⚠️ Use Ctrl+V to paste',
        notifNoResult: '⚠️ No result to save',
        notifNoMessage: '⚠️ Please paste the message first',
        notifDeleted: '🗑️ Record deleted',
        notifAllDeleted: '🗑️ All records deleted',
        notifMessageTooLong: '⚠️ Message too long. Maximum 5000 characters',
        reportSending: '⏳ Sending report...',
        reportSent: '✅ Report sent successfully to authorities',
        reportFailed: '⚠️ Failed to send report. Try again later',
        
        // Footer
        footerText: 'Tanabbah is an independent app not affiliated with any government entity. Its purpose is to raise awareness and protect users from online fraud.',
        
        // Premium Mobile App
        premiumTitle: 'Tanabbah Premium App',
        premiumHeader: 'Advanced Protection from Fraudulent Messages',
        premiumDesc: 'Protect yourself and your family from online fraud with <strong>automatic updates</strong> and background message analysis',
        feature1: 'Automatic Scanning',
        feature2: 'Real-time Alerts',
        feature3: 'Detailed Reports',
        feature4: 'Smart Analysis',
        downloadBtn: 'Start Now - Free Trial',
        trial: '✨ 7-day free trial - No credit card required',
        terms: 'By downloading the app, you agree to <a href="#" style="color: var(--primary); text-decoration: underline;">Terms & Conditions</a>. Cancel anytime',
        
        // New Premium Modal Texts
        premiumBadgeText: '🔥 Security & Protection 🔥',
        proofLabel1: 'Users',
        proofLabel2: 'Accuracy',
        proofLabel3: 'Protection',
        guaranteeText: '✓ 30-Day Money-Back Guarantee'
    }
};

/**
 * Get translation for key
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
function t(key) {
    // currentLanguage is defined in script.js
    return translations[window.currentLanguage || 'ar'][key] || key;
}

/**
 * Translate LLM flag to Arabic
 * @param {string} flag - Flag text
 * @returns {string} Translated flag
 */
function translateLLMFlag(flag) {
    const flagTranslations = {
        'urgency': 'أسلوب الاستعجال والضغط',
        'url': 'روابط مشبوهة',
        'shortener': 'روابط مختصرة',
        'government': 'انتحال صفة جهة حكومية',
        'personal': 'طلب معلومات شخصية',
        'threat': 'تهديدات وإنذارات',
        'reward': 'وعود بجوائز ومكافآت',
        'suspicious domain': 'نطاق مشبوه',
        'insecure': 'اتصال غير آمن',
        'impersonation': 'انتحال الهوية',
        'social engineering': 'هندسة اجتماعية',
        'data harvesting': 'محاولة سرقة بيانات'
    };
    
    const lowerFlag = flag.toLowerCase();
    for (const [key, value] of Object.entries(flagTranslations)) {
        if (lowerFlag.includes(key)) {
            return value;
        }
    }
    return flag;
}

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Get formatted timestamp
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
    return new Date().toLocaleString(
        window.currentLanguage === 'ar' ? 'ar-SA' : 'en-US'
    );
}

// ============================================================================
// COPYRIGHT PROTECTION
// ============================================================================

/**
 * Initialize copyright protection
 * This embeds attribution information in the runtime
 */
function initCopyrightProtection() {
    // Embedded attribution marker
    const _attribution = {
        original_concept: 'Naif Saleh',
        enhanced_development: 'Manal Alyami',
        implementation: 'Manal Alyami',
        version: '2.0.0',
        year: 2025,
        __verify: function() {
            return this.enhanced_development === 'Manal Alyami';
        }
    };
    
    Object.freeze(_attribution);
    
    // Store in multiple locations for protection
    window.__tanabbah_credits = _attribution;
    document.documentElement.setAttribute('data-dev', 'MA-2025');
    
    // Console signature
    console.log(
        '%cTanabbah Security Platform',
        'font-size: 16px; font-weight: bold; color: #059669;'
    );
    console.log(
        '%cOriginal Concept: Naif Saleh',
        'font-size: 12px; color: #6b7280;'
    );
    console.log(
        '%cEnhanced Development: Manal Alyami',
        'font-size: 12px; color: #6b7280;'
    );
    console.log(
        '%c© 2025 All Rights Reserved',
        'font-size: 12px; color: #6b7280;'
    );
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Run copyright protection on load
if (typeof window !== 'undefined') {
    initCopyrightProtection();
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        sanitizeHTML,
        validateMessageLength,
        extractURLs,
        saveToStorage,
        loadFromStorage,
        removeFromStorage,
        t,
        translateLLMFlag,
        getTimestamp,
        initCopyrightProtection
    };
}

