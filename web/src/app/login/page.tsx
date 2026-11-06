import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { PLATFORM_NAME } from "@/lib/platform";
import { ShieldIcon, TicketIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Sign in" };

// app/login/page.tsx → "/login": the dual sign-in page.
// Each button starts the OpenID Connect flow for its own Keycloak realm (/auth/login).
// The password is typed on Keycloak's page, never on ours.
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold tracking-tight text-slate-900">{PLATFORM_NAME}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-2 text-slate-600">Choose the sign-in that matches your account.</p>
        </div>

        {/* The status message depends on the URL (?error=…), which is request data,
            so it streams in inside <Suspense> while the cards render immediately. */}
        <Suspense fallback={null}>
          <StatusMessage searchParams={props.searchParams} />
        </Suspense>

        <div className="grid gap-6 md:grid-cols-2">
          <SignInCard
            realm="customers"
            icon={<TicketIcon className="h-6 w-6" />}
            title="Hospital & customer staff"
            description="For staff of organisations using Kontor: tickets, approvals, dashboards and support."
            button="Sign in as customer staff"
          />
          <SignInCard
            realm="kontor-staff"
            icon={<ShieldIcon className="h-6 w-6" />}
            title="Platform staff"
            description="For the team running the Kontor platform. Requires an authenticator app (multi-factor authentication)."
            button="Sign in as platform staff"
            dark
          />
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-slate-500">
          You&apos;ll continue to our secure sign-in service (OpenID Connect). {PLATFORM_NAME} never
          sees or stores your password.
        </p>
      </div>
    </main>
  );
}

function SignInCard({
  realm,
  icon,
  title,
  description,
  button,
  dark = false,
}: {
  realm: string;
  icon: ReactNode;
  title: string;
  description: string;
  button: string;
  dark?: boolean;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${
          dark ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
        }`}
      >
        {icon}
      </span>
      <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 flex-1 text-sm leading-6 text-slate-600">{description}</p>
      {/* A plain link (not <Link>): it goes to a route handler that redirects to Keycloak. */}
      <a
        href={`/auth/login?realm=${realm}`}
        className={`mt-6 inline-flex justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
          dark
            ? "bg-slate-900 text-white hover:bg-slate-700"
            : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
        }`}
      >
        {button}
      </a>
    </section>
  );
}

const MESSAGES: Record<string, { text: string; tone: "info" | "error" }> = {
  signed_out: { text: "You've been signed out.", tone: "info" },
  session_expired: { text: "Your session ended. Please sign in again.", tone: "info" },
  expired: { text: "The sign-in took too long. Please try again.", tone: "error" },
  sign_in_failed: { text: "Sign-in didn't complete. Please try again.", tone: "error" },
  not_allowed: {
    text: "This account has no access to that portal. Use the other sign-in.",
    tone: "error",
  },
  idp_unavailable: { text: "The sign-in service isn't reachable. Is Keycloak running?", tone: "error" },
  api_unavailable: { text: "The Kontor API isn't reachable. Is it running?", tone: "error" },
};

async function StatusMessage({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const key = params.signed_out ? "signed_out" : typeof params.error === "string" ? params.error : null;
  const message = key ? MESSAGES[key] : null;
  if (!message) return null;
  return (
    <p
      role={message.tone === "error" ? "alert" : "status"}
      className={`mx-auto mb-6 max-w-xl rounded-lg border px-4 py-3 text-center text-sm ${
        message.tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      {message.text}
    </p>
  );
}
