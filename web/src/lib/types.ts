// Friendly names for the API types. The types themselves are GENERATED:
//
//   api/core/schemas.py (Pydantic)  →  api/openapi.json  →  src/lib/api-types.ts
//
// Never edit api-types.ts by hand. Change the Pydantic model, then run:
//   cd api && uv run python -m core.export_openapi openapi.json
//   cd web && npm run gen:api

import type { components } from "./api-types";

type Schemas = components["schemas"];

export type Me = Schemas["Me"];
export type TenantRef = Schemas["TenantRef"];

export type Conversation = Schemas["Conversation"];
export type Channel = Conversation["channel"];
export type ConversationStatus = Conversation["status"];

export type Dashboard = Schemas["Dashboard"];

export type SecurityOverview = Schemas["SecurityOverview"];
export type StaffUser = Schemas["StaffUser"];
export type StaffRole = StaffUser["role"];

export type SupportIssue = Schemas["SupportIssue"];
export type NewSupportIssue = Schemas["NewSupportIssue"];
export type IssueSeverity = SupportIssue["severity"];
export type IssueCategory = SupportIssue["category"];
export type IssueStatus = SupportIssue["status"];

// Runtime lists for the form. Written as Record<Union, true> so TypeScript fails the
// build if the API adds or removes a value and this list isn't updated: the lists can
// never silently disagree with the generated types.
const severities: Record<IssueSeverity, true> = { critical: true, high: true, medium: true, low: true };
export const ISSUE_SEVERITIES = Object.keys(severities) as IssueSeverity[];

const categories: Record<IssueCategory, true> = {
  agent_behaviour: true,
  integration: true,
  performance: true,
  access: true,
  billing: true,
  other: true,
};
export const ISSUE_CATEGORIES = Object.keys(categories) as IssueCategory[];
