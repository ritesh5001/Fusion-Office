/** True inside the mobile app's in-app browser (pages opened with ?app=1; see motionInitScript). */
export const inApp = () => typeof document !== "undefined" && document.documentElement.dataset.embed === "app";
