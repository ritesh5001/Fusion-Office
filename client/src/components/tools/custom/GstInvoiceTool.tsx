"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import { GST_RATES, STATES, checkGstin, computeInvoice, inr, rupeesInWords, type InvoiceItem } from "@/lib/tools/gst";
import type { InvoiceData, Party } from "@/lib/tools/gstPdf";
import { downloadFile } from "@/lib/tools/files";
import { cn } from "@/lib/cn";

const STORE = "fusion-office.gst-invoice";
const today = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const blankParty = (): Party => ({ name: "", address: "", gstin: "", stateCode: "", phone: "", email: "" });
const blankItem = (): InvoiceItem => ({ description: "", hsn: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gstRate: 18 });
const STATE_OPTIONS = Object.entries(STATES).sort((a, b) => a[1].localeCompare(b[1]));

/** Next invoice number: keep the prefix, increase the number, keep its width (INV-0007 → INV-0008). */
const nextNumber = (n: string) => n.replace(/(\d+)(?!.*\d)/, (d) => String(Number(d) + 1).padStart(d.length, "0"));

const input = "h-9 w-full min-w-0 rounded-lg bg-sunken text-fg placeholder:text-fg-subtle px-2.5 text-[14px] ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-[12px] font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function GstinField({ value, onChange }: { value: string; onChange: (v: string, stateCode?: string) => void }) {
  const check = value.trim() ? checkGstin(value) : null;
  return (
    <Field label="GSTIN">
      <div className="relative">
        <input className={cn(input, "pr-8 uppercase")} value={value} maxLength={15} placeholder="27AAPFU0939F1ZV" onChange={(e) => {
          const v = e.target.value.toUpperCase();
          const c = checkGstin(v);
          onChange(v, c.ok ? c.stateCode : undefined);
        }} />
        {check && (check.ok ? <CheckCircle2 className="absolute right-2 top-2.5 h-4 w-4 text-emerald-300" aria-label="Valid GSTIN" /> : <XCircle className="absolute right-2 top-2.5 h-4 w-4 text-red-400" aria-hidden="true" />)}
      </div>
      {check && !check.ok && value.length >= 15 && <span className="block text-[11px] text-red-300">{check.reason}</span>}
    </Field>
  );
}

function PartyForm({ title, party, set, optionalGstin }: { title: string; party: Party; set: (p: Partial<Party>) => void; optionalGstin?: boolean }) {
  return (
    <section className="space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
      <h2 className="text-[15px] font-bold">{title}</h2>
      <Field label="Name">
        <input className={input} value={party.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Address">
        <textarea className={cn(input, "h-auto py-2")} rows={2} value={party.address} onChange={(e) => set({ address: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <GstinField value={party.gstin} onChange={(gstin, stateCode) => set({ gstin, ...(stateCode ? { stateCode } : {}) })} />
        <Field label="State">
          <select className={input} value={party.stateCode} onChange={(e) => set({ stateCode: e.target.value })}>
            <option value="">Choose…</option>
            {STATE_OPTIONS.map(([code, name]) => (
              <option key={code} value={code}>
                {name} ({code})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phone">
          <input className={input} value={party.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className={input} type="email" value={party.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
      </div>
      {optionalGstin && <p className="text-[12px] text-fg-muted">Leave GSTIN empty for an unregistered customer (B2C).</p>}
    </section>
  );
}

export function GstInvoiceTool() {
  const [seller, setSeller] = useState<Party>(blankParty);
  const [buyer, setBuyer] = useState<Party>(blankParty);
  const [meta, setMeta] = useState({ title: "TAX INVOICE", number: "INV-0001", date: today(), dueDate: "", placeOfSupplyCode: "", reverseCharge: false, notes: "Payment due within 15 days. Thank you for your business.", signatory: "" });
  const [bank, setBank] = useState({ name: "", account: "", ifsc: "", branch: "" });
  const [items, setItems] = useState<InvoiceItem[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remember the business, bank and numbering on this device.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (saved?.seller) setSeller(saved.seller);
      if (saved?.bank) setBank(saved.bank);
      if (saved?.number || saved?.signatory || saved?.notes) setMeta((m) => ({ ...m, number: saved.number ?? m.number, signatory: saved.signatory ?? m.signatory, notes: saved.notes ?? m.notes }));
    } catch {
      /* nothing saved */
    }
  }, []);

  // Place of supply follows the customer's state unless set by hand.
  const place = meta.placeOfSupplyCode || buyer.stateCode;
  const totals = useMemo(() => computeInvoice(items, seller.stateCode, place), [items, seller.stateCode, place]);

  const setItem = (i: number, patch: Partial<InvoiceItem>) => setItems((list) => list.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v)));

  const problems = [
    !seller.name.trim() && "Add your business name.",
    seller.gstin && !checkGstin(seller.gstin).ok && "Your GSTIN doesn't look right.",
    !seller.stateCode && "Choose your state.",
    !buyer.name.trim() && "Add the customer's name.",
    buyer.gstin && !checkGstin(buyer.gstin).ok && "The customer's GSTIN doesn't look right.",
    !place && "Choose the place of supply (the customer's state).",
    !totals.lines.length && "Add at least one item.",
  ].filter(Boolean) as string[];

  const download = async () => {
    if (problems.length) return setError(problems[0]);
    setError(null);
    setBusy(true);
    try {
      const { invoicePdf } = await import("@/lib/tools/gstPdf");
      const data: InvoiceData = { ...meta, placeOfSupplyCode: place, seller, buyer, items, bank };
      const bytes = await invoicePdf(data);
      downloadFile({ name: `${meta.number.replace(/[\\/:*?"<>|]+/g, "-") || "invoice"}.pdf`, bytes, type: "application/pdf" });
      const next = nextNumber(meta.number);
      localStorage.setItem(STORE, JSON.stringify({ seller, bank, number: next, signatory: meta.signatory, notes: meta.notes }));
      setMeta((m) => ({ ...m, number: next }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <PartyForm title="Your business" party={seller} set={(p) => setSeller((s) => ({ ...s, ...p }))} />
          <PartyForm title="Bill to" party={buyer} set={(p) => setBuyer((s) => ({ ...s, ...p }))} optionalGstin />
        </div>

        <section className="grid gap-3 rounded-2xl bg-surface p-5 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Invoice no.">
            <input className={input} value={meta.number} onChange={(e) => setMeta({ ...meta, number: e.target.value })} />
          </Field>
          <Field label="Invoice date">
            <input className={input} value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} />
          </Field>
          <Field label="Due date (optional)">
            <input className={input} value={meta.dueDate} placeholder="e.g. 17 Oct 2026" onChange={(e) => setMeta({ ...meta, dueDate: e.target.value })} />
          </Field>
          <Field label="Place of supply">
            <select className={input} value={place} onChange={(e) => setMeta({ ...meta, placeOfSupplyCode: e.target.value })}>
              <option value="">Same as customer</option>
              {STATE_OPTIONS.map(([code, name]) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
            <input type="checkbox" checked={meta.reverseCharge} onChange={(e) => setMeta({ ...meta, reverseCharge: e.target.checked })} className="h-4 w-4 accent-brand-500" />
            Tax payable on reverse charge
          </label>
        </section>

        <section className="min-w-0 rounded-2xl bg-surface p-5 ring-1 ring-line">
          <h2 className="text-[15px] font-bold">Items</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-fg-muted">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="w-24 pb-2 font-medium">HSN/SAC</th>
                  <th className="w-16 pb-2 font-medium">Qty</th>
                  <th className="w-20 pb-2 font-medium">Unit</th>
                  <th className="w-24 pb-2 font-medium">Rate</th>
                  <th className="w-16 pb-2 font-medium">Disc. %</th>
                  <th className="w-20 pb-2 font-medium">GST</th>
                  <th className="w-24 pb-2 text-right font-medium">Amount</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const line = computeInvoice([it], seller.stateCode, place).lines[0];
                  return (
                    <tr key={i} className="align-top">
                      <td className="py-1 pr-2">
                        <input className={input} value={it.description} placeholder="Item or service" onChange={(e) => setItem(i, { description: e.target.value })} aria-label={`Item ${i + 1} description`} />
                      </td>
                      <td className="py-1 pr-2">
                        <input className={input} value={it.hsn} onChange={(e) => setItem(i, { hsn: e.target.value })} aria-label={`Item ${i + 1} HSN or SAC`} />
                      </td>
                      <td className="py-1 pr-2">
                        <input className={input} type="number" min={0} value={it.qty} onChange={(e) => setItem(i, { qty: num(e.target.value) })} aria-label={`Item ${i + 1} quantity`} />
                      </td>
                      <td className="py-1 pr-2">
                        <input className={input} value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} aria-label={`Item ${i + 1} unit`} />
                      </td>
                      <td className="py-1 pr-2">
                        <input className={input} type="number" min={0} step="0.01" value={it.rate} onChange={(e) => setItem(i, { rate: num(e.target.value) })} aria-label={`Item ${i + 1} rate`} />
                      </td>
                      <td className="py-1 pr-2">
                        <input className={input} type="number" min={0} max={100} value={it.discount} onChange={(e) => setItem(i, { discount: Math.min(100, num(e.target.value)) })} aria-label={`Item ${i + 1} discount`} />
                      </td>
                      <td className="py-1 pr-2">
                        <select className={input} value={it.gstRate} onChange={(e) => setItem(i, { gstRate: Number(e.target.value) })} aria-label={`Item ${i + 1} GST rate`}>
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1 pr-2 pt-3 text-right tabular-nums">{inr(line?.total ?? 0)}</td>
                      <td className="py-1">
                        <button
                          type="button"
                          aria-label={`Remove item ${i + 1}`}
                          disabled={items.length === 1}
                          onClick={() => setItems((l) => l.filter((_, k) => k !== i))}
                          className="flex h-9 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setItems((l) => [...l, blankItem()])} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-brand-300 ring-1 ring-brand-500/35 hover:bg-brand-500/15">
            <Plus className="h-4 w-4" /> Add item
          </button>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
            <h2 className="text-[15px] font-bold">Bank details (optional)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bank">
                <input className={input} value={bank.name} onChange={(e) => setBank({ ...bank, name: e.target.value })} />
              </Field>
              <Field label="Account no.">
                <input className={input} value={bank.account} onChange={(e) => setBank({ ...bank, account: e.target.value })} />
              </Field>
              <Field label="IFSC">
                <input className={cn(input, "uppercase")} value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Branch">
                <input className={input} value={bank.branch} onChange={(e) => setBank({ ...bank, branch: e.target.value })} />
              </Field>
            </div>
          </section>
          <section className="space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
            <h2 className="text-[15px] font-bold">Notes & signature</h2>
            <Field label="Notes and terms">
              <textarea className={cn(input, "h-auto py-2")} rows={3} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
            </Field>
            <Field label="Authorised signatory">
              <input className={input} value={meta.signatory} placeholder="Name of the person signing" onChange={(e) => setMeta({ ...meta, signatory: e.target.value })} />
            </Field>
          </section>
        </div>
      </div>

      {/* Live totals */}
      <aside className="h-fit space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line xl:sticky xl:top-24">
        <h2 className="text-[15px] font-bold">Summary</h2>
        <p className={cn("rounded-lg px-3 py-2 text-[12px]", totals.interState ? "bg-sky-500/10 text-sky-200" : "bg-emerald-500/10 text-emerald-200")}>
          {!seller.stateCode || !place ? "Choose both states to work out the tax type." : totals.interState ? "Different states: IGST applies." : "Same state: CGST + SGST apply."}
        </p>
        <dl className="space-y-1.5 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-fg-muted">Taxable value</dt>
            <dd className="tabular-nums">{inr(totals.taxable)}</dd>
          </div>
          {totals.interState ? (
            <div className="flex justify-between">
              <dt className="text-fg-muted">IGST</dt>
              <dd className="tabular-nums">{inr(totals.igst)}</dd>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <dt className="text-fg-muted">CGST</dt>
                <dd className="tabular-nums">{inr(totals.cgst)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-muted">SGST</dt>
                <dd className="tabular-nums">{inr(totals.sgst)}</dd>
              </div>
            </>
          )}
          {totals.roundOff !== 0 && (
            <div className="flex justify-between">
              <dt className="text-fg-muted">Round off</dt>
              <dd className="tabular-nums">{inr(totals.roundOff)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-[17px] font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">₹ {inr(totals.total)}</dd>
          </div>
        </dl>
        <p className="text-[12px] leading-relaxed text-fg-muted">{rupeesInWords(totals.total)}</p>
        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download invoice PDF
        </button>
        <p className="text-[12px] leading-relaxed text-fg-muted">Made on your device. Your business and bank details are remembered in this browser for next time, and the invoice number moves up after each download.</p>
      </aside>
    </div>
  );
}
