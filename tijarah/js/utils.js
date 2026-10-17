// Small shared helpers used by every other file.

// Escape text before putting it inside innerHTML (prevents broken markup / script injection).
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// JSON.parse that never throws (corrupted localStorage must not kill the app).
function safeJsonParse(raw, fallback) {
    try {
        const v = JSON.parse(raw);
        return v ?? fallback;
    } catch (e) {
        return fallback;
    }
}

// Today's date in Dhaka time: YYYY-MM-DD  (toISOString() is UTC and is wrong 12am-6am in Bangladesh)
function getDhakaDateStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

// Current Dhaka time: YYYY-MM-DD HH:MM:SS (24-hour)
function getDhakaFormattedTime() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Dhaka', hourCycle: 'h23' });
}

// "2026-10-17 14:03:22" -> Date (Safari cannot parse the space-separated form directly)
function parseTimestamp(ts) {
    return new Date(String(ts).replace(' ', 'T'));
}
