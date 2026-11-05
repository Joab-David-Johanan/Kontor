import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "./icons";

// A large clickable card for the home page. The whole card is one <Link>.
// "group" lets children react when the card is hovered (group-hover:…).
export function NavCard({
  href,
  title,
  description,
  icon,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </span>
        <ArrowRightIcon className="h-5 w-5 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-900" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 flex-1 text-sm leading-6 text-slate-600">{description}</p>
      {meta && (
        <p className="mt-5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
          {meta}
        </p>
      )}
    </Link>
  );
}
