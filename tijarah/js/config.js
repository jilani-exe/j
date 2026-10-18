// GOOGLE APPS SCRIPT WEB APP URL
const APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT";

const SECURITY_REG_CODE = "AT-TIJARAH2023";
const shoeSizes = {
    "Ladies": ["34","35","36","37","38","39","40","41"],
    "Gents": ["38","39","40","41","42","43","44","45","46","47","48"],
    "Kids": ["15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37"],
    "Hand Bags": ["Standard", "Small", "Medium", "Large"],
    "Hair Clip": ["Standard"],
    "Jewelry": ["Standard", "Adjustable"],
    "Card": ["Standard"] // <--- Card category with no size/color breakdown
};

const categoriesList = ["Ladies", "Gents", "Kids", "Hand Bags", "Hair Clip", "Jewelry", "Card"];

// True only when a real Google Apps Script URL has been set above.
function isCloudConfigured() {
    return !APPS_SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT");
}
