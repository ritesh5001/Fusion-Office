/** What a QR code holds for each kind of code (links, UPI, Wi-Fi, contact cards…). Pure. */

export type QrKind = "url" | "text" | "upi" | "wifi" | "contact" | "phone" | "email";
export interface QrFields {
  kind: QrKind;
  url: string;
  text: string;
  upiId: string;
  upiName: string;
  upiAmount: string;
  upiNote: string;
  ssid: string;
  wifiPassword: string;
  security: "WPA" | "WEP" | "nopass";
  name: string;
  org: string;
  phone: string;
  email: string;
  website: string;
  subject: string;
}

const escWifi = (s: string) => s.replace(/([\;,:"])/g, "\\$1");
const escV = (s: string) => s.replace(/([\;,])/g, "\\$1").replace(/\n/g, "\\n");

/** The text a QR code holds for each kind. */
export function qrPayload(o: QrFields): string {
  switch (o.kind) {
    case "url":
      return /^[a-z][a-z0-9+.-]*:/i.test(o.url.trim()) ? o.url.trim() : o.url.trim() ? `https://${o.url.trim()}` : "";
    case "text":
      return o.text;
    case "upi": {
      if (!o.upiId.trim()) return "";
      // UPI apps expect the ID as written (name@bank), so only the other values are escaped.
      const parts = [`pa=${o.upiId.trim().replace(/[^\w.@-]/g, "")}`];
      if (o.upiName.trim()) parts.push(`pn=${encodeURIComponent(o.upiName.trim())}`);
      if (Number(o.upiAmount) > 0) parts.push(`am=${Number(o.upiAmount).toFixed(2)}`);
      parts.push("cu=INR");
      if (o.upiNote.trim()) parts.push(`tn=${encodeURIComponent(o.upiNote.trim())}`);
      return `upi://pay?${parts.join("&")}`;
    }
    case "wifi":
      return o.ssid.trim() ? `WIFI:T:${o.security};S:${escWifi(o.ssid)};${o.security === "nopass" ? "" : `P:${escWifi(o.wifiPassword)};`};` : "";
    case "contact":
      return o.name.trim() || o.phone.trim()
        ? ["BEGIN:VCARD", "VERSION:3.0", `N:${escV(o.name.trim())};;;;`, `FN:${escV(o.name.trim())}`, o.org && `ORG:${escV(o.org)}`, o.phone && `TEL;TYPE=CELL:${o.phone.replace(/\s+/g, "")}`, o.email && `EMAIL:${o.email.trim()}`, o.website && `URL:${o.website.trim()}`, "END:VCARD"].filter(Boolean).join("\n")
        : "";
    case "phone":
      return o.phone.trim() ? `tel:${o.phone.replace(/[^\d+]/g, "")}` : "";
    case "email":
      return o.email.trim() ? `mailto:${o.email.trim()}${o.subject.trim() ? `?subject=${encodeURIComponent(o.subject.trim())}` : ""}` : "";
  }
}

