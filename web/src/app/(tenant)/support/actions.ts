"use server";

// SERVER ACTIONS: functions that run on the server but can be called from a form
// in the browser. Next.js turns the form submit into a POST request behind the scenes.
//
// Rule: never trust what the browser sends. Everything is checked again here,
// and the tenant comes from the SERVER (config.ts), never from a form field,
// so nobody can file an issue in another tenant's name by editing the page.

import { revalidatePath } from "next/cache";
import { CURRENT_TENANT, CURRENT_USER } from "@/lib/config";
import { createSupportIssue, getConversations } from "@/lib/api";
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
  relatedTicketId: string;
  description: string;
};

export type SupportFormState = {
  attempt: number; // increases on every submit; used to reset the form
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof SupportFormValues, string>>;
  values?: SupportFormValues; // sent back on error so the user's input isn't lost
  createdId?: string;
};

// Type guards: check a plain string is one of the allowed values.
// "value is IssueSeverity" tells TypeScript the string is narrowed after a true result.
function isSeverity(value: string): value is IssueSeverity {
  return (ISSUE_SEVERITIES as readonly string[]).includes(value);
}
function isCategory(value: string): value is IssueCategory {
  return (ISSUE_CATEGORIES as readonly string[]).includes(value);
}

export async function submitSupportIssue(
  previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  // formData.get() returns string | File | null; String(...) makes it a string.
  const values: SupportFormValues = {
    title: String(formData.get("title") ?? "").trim(),
    category: String(formData.get("category") ?? ""),
    severity: String(formData.get("severity") ?? ""),
    relatedTicketId: String(formData.get("relatedTicketId") ?? "").trim().toUpperCase(),
    description: String(formData.get("description") ?? "").trim(),
  };

  const fieldErrors: SupportFormState["fieldErrors"] = {};

  if (values.title.length < 5) fieldErrors.title = "Give the issue a title of at least 5 characters.";
  if (values.title.length > 120) fieldErrors.title = "Keep the title under 120 characters.";
  if (!isCategory(values.category)) fieldErrors.category = "Choose a category.";
  if (!isSeverity(values.severity)) fieldErrors.severity = "Choose a severity.";
  if (values.description.length < 20)
    fieldErrors.description = "Describe the problem in at least 20 characters.";
  if (values.description.length > 2000)
    fieldErrors.description = "Keep the description under 2000 characters.";

  if (values.relatedTicketId) {
    // The ticket must exist AND belong to this tenant.
    const own = await getConversations(CURRENT_TENANT.id);
    const exists = own.some((c) => c.id.toUpperCase() === values.relatedTicketId);
    if (!exists) fieldErrors.relatedTicketId = `No ticket ${values.relatedTicketId} in your ticket system.`;
  }

  const attempt = previous.attempt + 1;

  if (Object.keys(fieldErrors).length > 0 || !isCategory(values.category) || !isSeverity(values.severity)) {
    return {
      attempt,
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
      values,
    };
  }

  const issue = await createSupportIssue(CURRENT_TENANT, CURRENT_USER.name, {
    title: values.title,
    description: values.description,
    category: values.category, // narrowed to IssueCategory by isCategory above
    severity: values.severity, // narrowed to IssueSeverity by isSeverity above
    relatedTicketId: values.relatedTicketId || null,
  });

  // Re-render the pages that show issues, so the new one appears.
  revalidatePath("/support");
  revalidatePath("/platform/support");
  revalidatePath("/");

  return { attempt, status: "success", createdId: issue.id };
}
