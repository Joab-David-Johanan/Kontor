"use server";

// SERVER ACTION: runs on the Next.js server when the support form is submitted.
//
// The core API is the source of truth: it validates every field (Pydantic), checks
// that a related ticket belongs to the caller's tenant, takes the tenant and reporter
// from the caller's token, and assigns the SUP-… code. The quick checks below only
// give friendlier messages before the request goes out; the API repeats them all.

import { revalidatePath } from "next/cache";
import { createSupportIssue } from "@/lib/api";
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  type IssueCategory,
  type IssueSeverity,
} from "@/lib/types";

export type SupportFormValues = {
  title: string;
  category: string;
  severity: string;
  relatedTicketRef: string;
  description: string;
};

export type SupportFormState = {
  attempt: number; // increases on every submit; used to reset the form
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof SupportFormValues, string>>;
  values?: SupportFormValues; // sent back on error so the user's input isn't lost
  createdRef?: string;
};

// Type guards: check a plain string is one of the allowed values.
// "value is IssueSeverity" tells TypeScript the string is narrowed after a true result.
function isSeverity(value: string): value is IssueSeverity {
  return (ISSUE_SEVERITIES as readonly string[]).includes(value);
}
function isCategory(value: string): value is IssueCategory {
  return (ISSUE_CATEGORIES as readonly string[]).includes(value);
}

const FIELDS = new Set<keyof SupportFormValues>([
  "title",
  "category",
  "severity",
  "relatedTicketRef",
  "description",
]);

export async function submitSupportIssue(
  previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  // formData.get() returns string | File | null; String(...) makes it a string.
  const values: SupportFormValues = {
    title: String(formData.get("title") ?? "").trim(),
    category: String(formData.get("category") ?? ""),
    severity: String(formData.get("severity") ?? ""),
    relatedTicketRef: String(formData.get("relatedTicketRef") ?? "").trim().toUpperCase(),
    description: String(formData.get("description") ?? "").trim(),
  };
  const attempt = previous.attempt + 1;
  const fail = (
    message: string,
    fieldErrors: SupportFormState["fieldErrors"] = {},
  ): SupportFormState => ({ attempt, status: "error", message, fieldErrors, values });

  // Quick, friendly checks (UX only).
  const fieldErrors: SupportFormState["fieldErrors"] = {};
  if (values.title.length < 5) fieldErrors.title = "Give the issue a title of at least 5 characters.";
  if (values.title.length > 120) fieldErrors.title = "Keep the title under 120 characters.";
  if (!isCategory(values.category)) fieldErrors.category = "Choose a category.";
  if (!isSeverity(values.severity)) fieldErrors.severity = "Choose a severity.";
  if (values.description.length < 20)
    fieldErrors.description = "Describe the problem in at least 20 characters.";
  if (values.description.length > 2000)
    fieldErrors.description = "Keep the description under 2000 characters.";

  if (Object.keys(fieldErrors).length > 0 || !isCategory(values.category) || !isSeverity(values.severity)) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  // The real check and the save happen in the core API.
  const result = await createSupportIssue({
    title: values.title,
    description: values.description,
    category: values.category, // narrowed to IssueCategory by isCategory above
    severity: values.severity, // narrowed to IssueSeverity by isSeverity above
    relatedTicketRef: values.relatedTicketRef || null,
  });

  if (!result.ok) {
    // Map the API's per-field errors (e.g. "relatedTicketRef") onto the form's fields.
    const apiErrors: SupportFormState["fieldErrors"] = {};
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (FIELDS.has(field as keyof SupportFormValues)) {
        apiErrors[field as keyof SupportFormValues] = message;
      }
    }
    return fail(result.message, apiErrors);
  }

  // Re-render the pages that show issues, so the new one appears.
  revalidatePath("/support");
  revalidatePath("/platform/support");
  revalidatePath("/");

  return { attempt, status: "success", createdRef: result.issue.ref };
}
