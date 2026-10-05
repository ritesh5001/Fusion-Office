/**
 * Feedback moderation: keeps the inbox for real feedback. Abuse is caught by a
 * word list first (instant, works without AI), then the AI judges whether the
 * rest is genuine or junk (keyboard mashing, random names, test spam). If the
 * AI is unavailable, feedback is accepted: real people are never blocked by an
 * outage.
 */
import { judgeFeedback, aiEnabled } from "./ai.js";

export type Verdict = "real" | "fake" | "abusive";

/** Replies to abusive feedback (the site owner's own lines), picked at random. */
export const ROASTS = [
  "Feedback mein gali? Bhosdike, yahan review likh, rap mat likh.",
  "Gaali detect hui. Chutiye, star do, family tree mat do.",
  "Bhenchod energy received. Form reset. Dubara, bina maa ke.",
  "Tu feedback de raha hai ya madarchod ka audition?",
  "Submit nahi hua. Reason: high levels of chutiya.",
  "Error 403: bakchod quota khatam. Kal try kar.",
  "Message blocked. Itni purani gaali, filter ne pehle hi dekh li.",
  "Saale, bug bata. Maa ke lode mat suna.",
  "Gaandu mode on hai. Off karke dubara likh.",
  "Harami paragraph hata. Seedha masla likh.",
  "Randi rona nahi chahiye. Review chahiye.",
  "Bhosdike, keyboard thanda kar, phir type kar.",
  "Penchod, yeh form hai, gali ka stage nahi.",
  "Teri gaali save nahi hogi. Sirf tu embarrass hoga.",
  "Chutiyapa detected. Hata ke bhej, warna cancel.",
  "Kutta banne ki zarurat nahi. Insaan banke likh.",
  "Lund choosne wali line mat daal. Point daal.",
  "Kanjar energy skip. Normal sentence try kar.",
  "Raand-level abuse blocked. Dubara, saaf.",
  "Lavdya, feedback do. Gaali ghar le ja.",
  "Bhenchod, yeh feedback hai, gaali ka competition nahi.",
  "ma ke lode, gaali mat de. Seedha point de.",
  "bsdk, yeh form hai, gaali ka stage nahi. Feedback de.",
  "bc, gaali mat de. Seedha masla likh.",
  "mc, yeh feedback hai, gaali ka audition nahi. Point de.",

];

export const ABUSE_REPLY_TAIL = "Ab dubara real feedback de.";
export const FAKE_REPLY =
  "This doesn't look like real feedback. Please tell us what you actually think: what you liked, what's missing or what broke, and use your real name.";

export const roast = (pick = Math.random()) => `${ROASTS[Math.floor(pick * ROASTS.length) % ROASTS.length]} ${ABUSE_REPLY_TAIL}`;

/**
 * Common Hindi/Hinglish and English abuse, as stems matched inside words
 * ("bhosdike", "bhosdiwala"), plus short forms matched only as whole words
 * ("bc", "mc", "bsdk") so ordinary words that contain them aren't flagged.
 */
const STEMS = [
  "bhosd", "bhosad", "chutiy", "chutia", "choot", "madarchod", "madar chod", "maderchod", "behenchod", "behen chod", "bhenchod", "bhen chod", "benchod",
  "penchod", "gaand", "gandu", "lavde", "lavda", "lawde", "lawda", "harami", "haraami", "kamina", "kaminey", "jhaat", "jhant", "chodu", "bakchod",
  "fuck", "motherfuck", "bitch", "bastard", "asshole", "dickhead", "whore", "slut",
  "भोसड", "चूतिय", "मादरचोद", "बहनचोद", "भेनचोद", "गांड", "लंड", "रंडी", "हरामी", "कमीन",
];
const SHORT = ["bc", "mc", "bsdk", "bkl", "mkc", "bkc", "lodu", "loda", "lode", "lund", "laude", "lavdya", "gand", "chut", "randi", "raand", "kutti", "cunt", "wtf", "stfu"];

export function hasAbuse(text: string): boolean {
  // Undo common masking: f*ck, ch@tiya, b$dk, ch0d.
  const unmasked = text.toLowerCase().replace(/\*/g, "u").replace(/@/g, "a").replace(/\$/g, "s").replace(/0/g, "o");
  if (STEMS.some((s) => unmasked.includes(s))) return true;
  const words = unmasked.split(/[^\p{L}\p{N}]+/u);
  return words.some((w) => SHORT.includes(w));
}

/** Decide what to do with a submission. Never throws. */
export async function moderate(name: string, message: string, ai = judgeFeedback, enabled = aiEnabled): Promise<Verdict> {
  if (hasAbuse(`${name} ${message}`)) return "abusive";
  if (!enabled) return "real";
  try {
    return await ai(name, message);
  } catch (err) {
    console.error("[moderation] AI check failed, accepting feedback:", (err as Error).message);
    return "real";
  }
}
