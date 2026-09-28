import { PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";
import { loadPdf, save } from "./common";

export type FieldInfo =
  | { kind: "text"; name: string; value: string; multiline: boolean; maxLength?: number }
  | { kind: "checkbox"; name: string; value: boolean }
  | { kind: "radio"; name: string; value: string; options: string[] }
  | { kind: "dropdown"; name: string; value: string; options: string[] }
  | { kind: "list"; name: string; value: string[]; options: string[] }
  | { kind: "other"; name: string };

/** Detect the fillable fields in a PDF. */
export async function listFields(bytes: Uint8Array): Promise<FieldInfo[]> {
  const doc = await loadPdf(bytes);
  return doc.getForm().getFields().map((f): FieldInfo => {
    const name = f.getName();
    if (f instanceof PDFTextField)
      return { kind: "text", name, value: f.getText() ?? "", multiline: f.isMultiline(), maxLength: f.getMaxLength() };
    if (f instanceof PDFCheckBox) return { kind: "checkbox", name, value: f.isChecked() };
    if (f instanceof PDFRadioGroup) return { kind: "radio", name, value: f.getSelected() ?? "", options: f.getOptions() };
    if (f instanceof PDFDropdown) return { kind: "dropdown", name, value: f.getSelected()[0] ?? "", options: f.getOptions() };
    if (f instanceof PDFOptionList) return { kind: "list", name, value: f.getSelected(), options: f.getOptions() };
    return { kind: "other", name };
  });
}

export type FieldValues = Record<string, string | boolean | string[]>;

/** Fill fields by name; optionally flatten so the values become part of the page. */
export async function fillForm(bytes: Uint8Array, values: FieldValues, flatten: boolean): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const form = doc.getForm();
  for (const [name, value] of Object.entries(values)) {
    const f = form.getFieldMaybe(name);
    if (!f) continue;
    if (f instanceof PDFTextField) f.setText(String(value ?? ""));
    else if (f instanceof PDFCheckBox) (value ? f.check() : f.uncheck());
    else if (f instanceof PDFRadioGroup && typeof value === "string" && value) f.select(value);
    else if (f instanceof PDFDropdown && typeof value === "string" && value) f.select(value);
    else if (f instanceof PDFOptionList && Array.isArray(value)) f.select(value);
  }
  if (flatten) form.flatten();
  else form.updateFieldAppearances();
  return save(doc);
}
