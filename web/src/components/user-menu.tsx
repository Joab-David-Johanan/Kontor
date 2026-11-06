import type { StaffRole } from "@/lib/types";

const roleLabels: Record<StaffRole, string> = {
  tenant_admin: "Admin",
  tenant_operator: "Operator",
  platform_staff: "Platform staff",
};

// Who is signed in, and a Sign out button.
// The button POSTs a plain HTML form to /auth/logout (a route handler): signing out
// changes state, so it must never be a simple link that a GET could trigger.
export function UserMenu({
  name,
  role,
  dark = false,
}: {
  name: string;
  role: StaffRole;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <p className={`text-sm font-medium ${dark ? "text-white" : "text-slate-900"}`}>{name}</p>
        <p className={`text-xs ${dark ? "text-slate-300" : "text-slate-500"}`}>{roleLabels[role]}</p>
      </div>
      <form action="/auth/logout" method="post">
        <button
          type="submit"
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            dark
              ? "border-white/20 text-white hover:bg-white/10"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
