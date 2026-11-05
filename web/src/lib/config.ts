// Stand-in for "the organisation of the logged-in user".
// Replaced by real authentication later.
export const CURRENT_TENANT = {
  id: "hospital",
  name: "Klinikum Demo",
} as const;

// Stand-in for "the person who is logged in". Also replaced by real logins (Milestone 3).
export const CURRENT_USER = {
  name: "Dr. Anna Weber",
  email: "a.weber@klinikum-demo.de",
} as const;
