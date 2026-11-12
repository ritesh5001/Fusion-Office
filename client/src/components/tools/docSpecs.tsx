"use client";

/** Document makers that need no upload: rent receipts and salary slips. Made on the device. */
import { Plus, Trash2 } from "lucide-react";
import { PDF } from "@/lib/tools/files";
import { inr, rupeesInWords } from "@/lib/tools/gst";
import { rentNeedsPan, rentNeedsStamp, salaryTotals, type PayLine, type RentReceiptData, type SalarySlipData } from "@/lib/tools/receipts";
import type { ToolSpec } from "./ToolRunner";
import { NumberField, Segmented, TextArea, TextInput } from "./controls";

const receipts = () => import("@/lib/tools/receipts");
const thisMonth = () => new Date().toISOString().slice(0, 7);
const safeName = (s: string) => s.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").toLowerCase() || "document";

const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] leading-relaxed text-fg-muted">{children}</p>;
const Warn = ({ children }: { children: React.ReactNode }) => <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200">{children}</p>;
const Heading = ({ children }: { children: React.ReactNode }) => <p className="border-t border-line pt-4 text-[13px] font-semibold text-fg">{children}</p>;

// ─── Rent receipt ───────────────────────────────────────────────────

const rentReceipt: ToolSpec<RentReceiptData> = {
  action: "Create rent receipts",
  noFiles: true,
  defaults: { tenant: "", landlord: "", landlordPan: "", address: "", rent: 0, from: thisMonth(), months: 1, mode: "Bank transfer", place: "" },
  Options: ({ options: o, set }) => (
    <>
      <TextInput label="Tenant's name" hint="The person paying the rent." value={o.tenant} onChange={(tenant) => set({ tenant })} autoComplete="name" />
      <TextInput label="Landlord's name" value={o.landlord} onChange={(landlord) => set({ landlord })} />
      <TextArea label="Address of the rented property" value={o.address} onChange={(address) => set({ address })} rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Monthly rent" value={o.rent} min={0} step={500} suffix="₹" onChange={(rent) => set({ rent })} />
        <TextInput label="Place (optional)" value={o.place} onChange={(place) => set({ place })} />
        <TextInput label="First month" type="month" value={o.from} onChange={(from) => set({ from })} />
        <NumberField label="Number of months" value={o.months} min={1} max={24} onChange={(months) => set({ months })} />
      </div>
      <Segmented label="Paid by" value={o.mode} onChange={(mode) => set({ mode })} options={(["Bank transfer", "UPI", "Cash", "Cheque"] as const).map((m) => ({ value: m, label: m }))} />
      <TextInput label="Landlord's PAN" hint={rentNeedsPan(o.rent) ? "Needed for an HRA claim: this rent is more than ₹1,00,000 a year." : "Optional below ₹1,00,000 a year of rent."} value={o.landlordPan} onChange={(landlordPan) => set({ landlordPan: landlordPan.toUpperCase() })} placeholder="ABCDE1234F" />
      {rentNeedsPan(o.rent) && !o.landlordPan.trim() && <Warn>Employers ask for the landlord&apos;s PAN when the rent is above ₹1,00,000 a year (₹8,333 a month).</Warn>}
      {rentNeedsStamp(o) && <Warn>Cash receipts above ₹5,000 need a ₹1 revenue stamp, signed across by the landlord. A box for it is printed on each receipt.</Warn>}
      {o.rent > 0 && <Note>{rupeesInWords(o.rent)} a month · ₹{inr(o.rent * Math.max(1, o.months))} for {Math.max(1, o.months)} month{o.months > 1 ? "s" : ""}.</Note>}
      <Note>One receipt per month, three to a page, each with a line for the landlord&apos;s signature. Made on your device; nothing is uploaded.</Note>
    </>
  ),
  validate: (_f, o) =>
    !o.tenant.trim() || !o.landlord.trim()
      ? "Enter the tenant's and the landlord's names."
      : !(o.rent > 0)
        ? "Enter the monthly rent."
        : !/^\d{4}-\d{2}$/.test(o.from)
          ? "Choose the first month."
          : o.landlordPan.trim() && !/^[A-Z]{5}\d{4}[A-Z]$/.test(o.landlordPan.trim().toUpperCase())
            ? "A PAN has 10 characters, like ABCDE1234F."
            : null,
  run: async (_f, o) => {
    const r = await (await receipts()).rentReceiptsPdf(o);
    return { files: [{ name: `rent-receipts-${safeName(o.tenant)}.pdf`, bytes: r.bytes, type: PDF }], summary: `${r.receipts} receipt${r.receipts === 1 ? "" : "s"} for ₹${inr(r.total)} in all. Print, and have the landlord sign each one.` };
  },
};

// ─── Salary slip ────────────────────────────────────────────────────

function Lines({ title, lines, onChange, add }: { title: string; lines: PayLine[]; onChange: (l: PayLine[]) => void; add: string }) {
  const input = "h-9 min-w-0 rounded-lg bg-sunken px-2.5 text-[14px] text-fg ring-1 ring-line-strong outline-none placeholder:text-fg-subtle focus:ring-2 focus:ring-brand-500";
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium text-fg">{title}</p>
      {lines.map((l, i) => (
        <div key={i} className="flex gap-1.5">
          <input aria-label={`${title} ${i + 1} name`} className={`${input} flex-1`} value={l.label} placeholder="Name" onChange={(e) => onChange(lines.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
          <input aria-label={`${title} ${i + 1} amount`} className={`${input} w-28 text-right tabular-nums`} type="number" min={0} value={l.amount || ""} placeholder="0" onChange={(e) => onChange(lines.map((x, k) => (k === i ? { ...x, amount: Math.max(0, Number(e.target.value)) } : x)))} />
          <button type="button" aria-label={`Remove ${l.label || `${title} ${i + 1}`}`} onClick={() => onChange(lines.filter((_, k) => k !== i))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-red-500/10 hover:text-red-300">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...lines, { label: "", amount: 0 }])} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-brand-300 ring-1 ring-brand-500/35 hover:bg-brand-500/15">
        <Plus className="h-3.5 w-3.5" /> {add}
      </button>
    </div>
  );
}

const salarySlip: ToolSpec<SalarySlipData> = {
  action: "Create salary slip",
  noFiles: true,
  defaults: {
    company: "", companyAddress: "", month: thisMonth(), employee: "", employeeId: "", designation: "", department: "", pan: "", uan: "", bankAccount: "", joined: "", paidDays: 0, lopDays: 0,
    earnings: [{ label: "Basic salary", amount: 0 }, { label: "House rent allowance (HRA)", amount: 0 }, { label: "Special allowance", amount: 0 }],
    deductions: [{ label: "Provident fund (PF)", amount: 0 }, { label: "Professional tax", amount: 0 }, { label: "Income tax (TDS)", amount: 0 }],
  },
  Options: ({ options: o, set }) => {
    const t = salaryTotals(o);
    return (
      <>
        <TextInput label="Company name" value={o.company} onChange={(company) => set({ company })} autoComplete="organization" />
        <TextArea label="Company address (optional)" value={o.companyAddress} onChange={(companyAddress) => set({ companyAddress })} rows={2} />
        <TextInput label="Pay month" type="month" value={o.month} onChange={(month) => set({ month })} />
        <Heading>Employee</Heading>
        <TextInput label="Employee name" value={o.employee} onChange={(employee) => set({ employee })} />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Employee ID" value={o.employeeId} onChange={(employeeId) => set({ employeeId })} />
          <TextInput label="Designation" value={o.designation} onChange={(designation) => set({ designation })} />
          <TextInput label="Department" value={o.department} onChange={(department) => set({ department })} />
          <TextInput label="Date of joining" value={o.joined} onChange={(joined) => set({ joined })} placeholder="01 Apr 2024" />
          <TextInput label="PAN" value={o.pan} onChange={(pan) => set({ pan: pan.toUpperCase() })} />
          <TextInput label="UAN (PF number)" value={o.uan} onChange={(uan) => set({ uan })} />
          <TextInput label="Bank account" value={o.bankAccount} onChange={(bankAccount) => set({ bankAccount })} placeholder="XXXX1234" />
          <NumberField label="Paid days" value={o.paidDays} min={0} max={31} onChange={(paidDays) => set({ paidDays })} />
        </div>
        <Heading>Pay</Heading>
        <Lines title="Earnings" add="Add earning" lines={o.earnings} onChange={(earnings) => set({ earnings })} />
        <Lines title="Deductions" add="Add deduction" lines={o.deductions} onChange={(deductions) => set({ deductions })} />
        <dl className="space-y-1 rounded-xl bg-sunken p-3 text-[13px] ring-1 ring-line">
          <div className="flex justify-between">
            <dt className="text-fg-muted">Gross earnings</dt>
            <dd className="tabular-nums">₹ {inr(t.gross)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">Deductions</dt>
            <dd className="tabular-nums">₹ {inr(t.deductions)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5 text-[15px] font-bold">
            <dt>Net pay</dt>
            <dd className="tabular-nums">₹ {inr(t.net)}</dd>
          </div>
        </dl>
        <Note>You type each amount; nothing is calculated for you, so the slip matches your payroll exactly. Lines left at 0 are left out. Made on your device.</Note>
      </>
    );
  },
  validate: (_f, o) => {
    const t = salaryTotals(o);
    return !o.company.trim() ? "Enter the company's name." : !o.employee.trim() ? "Enter the employee's name." : !/^\d{4}-\d{2}$/.test(o.month) ? "Choose the pay month." : !(t.gross > 0) ? "Enter at least one earning." : t.net < 0 ? "Deductions are more than the earnings." : null;
  },
  run: async (_f, o) => {
    const bytes = await (await receipts()).salarySlipPdf(o);
    return { files: [{ name: `salary-slip-${safeName(o.employee)}-${o.month}.pdf`, bytes, type: PDF }], summary: `Net pay ₹${inr(salaryTotals(o).net)} for ${o.employee.trim()}.` };
  },
};

export const DOC_SPECS = {
  "rent-receipt": rentReceipt,
  "salary-slip": salarySlip,
};
