import { requirements, type Account } from "./data.ts";

export type AccountSection =
  | "Overview"
  | "Onboarding"
  | "Activity"
  | "Contacts"
  | "Relationships"
  | "Commercial"
  | "Tasks & cases"
  | "Notes & files";

const setupSteps = [
  "Complete company profile",
  "Set up users & permissions",
  "Configure products",
  "Connect billing",
  "Configure checkout",
  "Complete shipping setup",
];

/** Read-only guidance: verification and activation still use the guarded workflow. */
export function accountNextStep(account: Account): {
  label: string;
  description: string;
  section: AccountSection;
} {
  if (account.type !== "Corporate Brand") {
    return {
      label: "Review partnership",
      description: `Current stage: ${account.stage}. Review contacts, connected retailers, and the next follow-up.`,
      section: "Overview",
    };
  }
  if (account.status === "Active") {
    return {
      label: "Setup complete",
      description:
        "This brand has been approved and activated. Its launch requirements are complete.",
      section: "Onboarding",
    };
  }
  if (account.approval === "Rejected") {
    return {
      label: "Review requested changes",
      description:
        "Operations requested changes. Review the feedback in the onboarding workspace before resubmitting.",
      section: "Onboarding",
    };
  }
  if (account.approval === "Pending approval") {
    return {
      label: "Awaiting Operations",
      description:
        "This brand is verified and submitted to Operations for activation review.",
      section: "Onboarding",
    };
  }
  const pending = requirements.findIndex((_, index) => !account.checks[index]);
  if (pending !== -1) {
    return {
      label: setupSteps[pending],
      description: `Next requirement: ${requirements[pending]}. Complete all six checks before verification.`,
      section: "Onboarding",
    };
  }
  return account.verification === "Verified"
    ? {
        label: "Submit to Operations",
        description:
          "Verification is complete. Submit the brand to Operations for activation review.",
        section: "Onboarding",
      }
    : {
        label: "Verify setup",
        description:
          "All requirements are complete. Run verification before submitting to Operations.",
        section: "Onboarding",
      };
}

export function accountUpdatedAt(account: Account): number {
  return [...account.history, ...account.notes].reduce((latest, entry) => {
    const timestamp = Date.parse(entry.at);
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);
}

export function compareAccounts(
  a: Account,
  b: Account,
  sort: string,
  asc: boolean,
): number {
  let result: number;
  if (sort === "updated") result = accountUpdatedAt(a) - accountUpdatedAt(b);
  else if (sort === "setup")
    result = a.checks.filter(Boolean).length - b.checks.filter(Boolean).length;
  else
    result = String(a[sort as keyof Account] ?? "").localeCompare(
      String(b[sort as keyof Account] ?? ""),
    );
  return result * (asc ? 1 : -1);
}
