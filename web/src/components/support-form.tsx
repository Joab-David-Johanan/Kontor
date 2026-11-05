"use client";

// The "raise an issue" form. A CLIENT component because it reacts while you type
// (character counter, chosen severity) and shows a "Sending…" state.
// The actual saving happens on the server, in the server action passed in as a prop.

import { useActionState, useState, type ReactNode } from "react";
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES } from "@/lib/types";
import type { SupportFormState } from "@/app/(tenant)/support/actions";
import { categoryLabels, severityMeta } from "./support-badges";

const MAX_DESCRIPTION = 2000;

const initialState: SupportFormState = { attempt: 0, status: "idle" };

export function SupportForm({
  action,
}: {
  action: (state: SupportFormState, formData: FormData) => Promise<SupportFormState>;
}) {
  // useActionState gives: the latest result from the server, a function to put on
  // the <form>, and whether a submit is currently running.
  const [state, formAction, pending] = useActionState(action, initialState);

  const errors = state.fieldErrors ?? {};
  const values = state.status === "error" ? state.values : undefined;

  return (
    <div>
      {state.status === "success" && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <span className="font-semibold">{state.createdId}</span> was sent to the CLAR AI
          platform team. You&apos;ll find it in your issue history below.
        </div>
      )}
      {state.status === "error" && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      )}

      {/* key={state.attempt}: after each submit the form is rebuilt, so it is empty after a
          success and pre-filled with your input (defaultValue) after an error. */}
      <form key={state.attempt} action={formAction} className="space-y-6" noValidate>
        <Field id="title" label="Title" error={errors.title}>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            defaultValue={values?.title}
            placeholder="e.g. Approvals stay pending after the HIS sync"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "title-error" : undefined}
            className={inputClass(!!errors.title)}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="category" label="Category" error={errors.category}>
            <select
              id="category"
              name="category"
              required
              defaultValue={values?.category ?? ""}
              aria-invalid={!!errors.category}
              className={inputClass(!!errors.category)}
            >
              <option value="" disabled>
                Choose…
              </option>
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="relatedTicketId"
            label="Related ticket"
            optional
            hint="The ticket number from your ticket system, if there is one."
            error={errors.relatedTicketId}
          >
            <input
              id="relatedTicketId"
              name="relatedTicketId"
              type="text"
              defaultValue={values?.relatedTicketId}
              placeholder="C-1002"
              aria-invalid={!!errors.relatedTicketId}
              className={`${inputClass(!!errors.relatedTicketId)} font-mono uppercase`}
            />
          </Field>
        </div>

        <SeverityPicker defaultValue={values?.severity ?? "medium"} error={errors.severity} />

        <DescriptionField defaultValue={values?.description ?? ""} error={errors.description} />

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <p className="max-w-md text-xs text-slate-500">
            CLAR AI platform staff will read this. Don&apos;t include patient names or health
            details. Refer to ticket numbers instead.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            {pending && (
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
            )}
            {pending ? "Sending…" : "Send to CLAR AI"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Pieces used only by this form ───────────────────────────

function inputClass(hasError: boolean) {
  return `block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-slate-300 focus:border-slate-500 focus:ring-slate-200"
  }`;
}

// Label + input + hint + error message, laid out the same way for every field.
function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-900">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// Four radio buttons styled as cards. The real <input type="radio"> is visually hidden
// (sr-only) but still works with the keyboard; the card around it changes style
// when it is checked (has-checked:…).
function SeverityPicker({ defaultValue, error }: { defaultValue: string; error?: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-900">Severity</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {ISSUE_SEVERITIES.map((s) => {
          const m = severityMeta[s];
          return (
            <label
              key={s}
              className="relative flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 has-checked:border-slate-900 has-checked:ring-1 has-checked:ring-slate-900 has-focus-visible:ring-2 has-focus-visible:ring-slate-400"
            >
              <input
                type="radio"
                name="severity"
                value={s}
                defaultChecked={defaultValue === s}
                className="sr-only"
              />
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.dot}`} aria-hidden />
              <span>
                <span className="block text-sm font-medium text-slate-900">{m.label}</span>
                <span className="block text-xs text-slate-600">{m.description}</span>
                <span className="mt-1 block text-xs text-slate-400">{m.response}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </fieldset>
  );
}

// Textarea with a live character counter. This is why the form is a client component.
function DescriptionField({ defaultValue, error }: { defaultValue: string; error?: string }) {
  const [length, setLength] = useState(defaultValue.length);
  const nearLimit = length > MAX_DESCRIPTION * 0.9;

  return (
    <div>
      <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-900">
        What happened?
      </label>
      <textarea
        id="description"
        name="description"
        rows={6}
        required
        maxLength={MAX_DESCRIPTION}
        defaultValue={defaultValue}
        onChange={(e) => setLength(e.target.value.length)}
        placeholder="What did you expect, what happened instead, and since when?"
        aria-invalid={!!error}
        className={inputClass(!!error)}
      />
      <div className="mt-1.5 flex justify-between gap-4 text-xs">
        <span className="font-medium text-red-600">{error}</span>
        <span className={`tabular-nums ${nearLimit ? "text-amber-700" : "text-slate-400"}`}>
          {length} / {MAX_DESCRIPTION}
        </span>
      </div>
    </div>
  );
}
