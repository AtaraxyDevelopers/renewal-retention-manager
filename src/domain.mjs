import { round, sum, ratio, days, money, metric, notice } from "./lib.mjs";
export const config = {
  slug: "renewal-retention-manager",
  title: "Renewal Retention Manager",
  description:
    "Prepare for renewals and track customer health before contracts expire.",
  scope:
    "A local planning workspace. Review suggestions before acting; no automatic messages or financial transactions.",
  method:
    "Due renewals include active contracts already overdue or within the planning window. Amount is the next contract value. Renewed rows are historical until you enter the next active renewal.",
  port: 4422,
  asOf: "2026-11-15",
  fields: [
    {
      key: "name",
      label: "Customer / business name",
      type: "text",
    },
    {
      key: "email",
      label: "Customer email",
      type: "email",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      min: 0,
      max: 100000000,
    },
    {
      key: "renewal",
      label: "Renewal date",
      type: "date",
    },
    {
      key: "lastCheckin",
      label: "Last customer check-in",
      type: "date",
    },
    {
      key: "health",
      label: "Customer health",
      type: "select",
      options: ["healthy", "needs-attention", "at-risk"],
    },
    {
      key: "status",
      label: "Contract status",
      type: "select",
      options: ["active", "renewed", "cancelled"],
    },
    {
      key: "reason",
      label: "Health / cancellation notes",
      type: "text",
    },
  ],
  settings: [
    {
      key: "currency",
      label: "Currency code (one currency per workspace)",
      type: "text",
      maxLength: 3,
    },
    {
      key: "windowDays",
      label: "Renewal planning window (days)",
      type: "number",
      min: 0,
      max: 365,
      integer: true,
    },
    {
      key: "checkinDays",
      label: "Check-in interval (days)",
      type: "number",
      min: 0,
      max: 365,
      integer: true,
    },
  ],
  actions: [
    {
      label: "Record check-in",
      patch: {
        lastCheckin: "$date",
      },
      when: {
        status: ["active"],
      },
    },
    {
      label: "Mark renewed",
      patch: {
        status: "renewed",
      },
      when: {
        status: ["active"],
      },
    },
  ],
  document: false,
};

export const example = {
  schemaVersion: 1,
  project: "renewal-retention-manager",
  settings: {
    currency: "USD",
    windowDays: 30,
    checkinDays: 30,
  },
  records: [
    {
      id: "renewal-1",
      name: "Maple Studio",
      email: "buyer@example.com",
      amount: 2400,
      renewal: "2026-11-30",
      lastCheckin: "2026-10-01",
      health: "at-risk",
      status: "active",
      reason: "Customer needs onboarding help",
    },
    {
      id: "renewal-2",
      name: "River Foods",
      email: "team@example.com",
      amount: 1200,
      renewal: "2027-02-01",
      lastCheckin: "2026-11-10",
      health: "healthy",
      status: "active",
      reason: "Quarterly review completed",
    },
  ],
};
export function analyze(records, s, asOf) {
  const due = records.filter(
    (r) => r.status === "active" && days(r.renewal, asOf) <= s.windowDays,
  );
  return {
    metrics: [
      metric("Renewals to review", due.length),
      metric(
        "Upcoming contract value",
        money(sum(due.map((r) => r.amount))),
        s.currency,
      ),
      metric(
        "At-risk renewal value",
        money(
          sum(due.filter((r) => r.health === "at-risk").map((r) => r.amount)),
        ),
        s.currency,
      ),
    ],
    notices: records
      .filter(
        (r) =>
          r.status === "active" && days(asOf, r.lastCheckin) > s.checkinDays,
      )
      .map((r) =>
        notice(r.id, `${r.name}: customer check-in overdue.`, "warning"),
      ),
    columns: ["Customer", "Renewal", "Health", "Status", "Notes"],
    rows: records.map((r) => ({
      id: r.id,
      Customer: r.name,
      Renewal: r.renewal,
      Health: r.health,
      Status: r.status,
      Notes: r.reason,
    })),
  };
}
