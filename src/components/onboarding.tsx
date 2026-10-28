"use client";
import { useState } from "react";
import {
  Check,
  CheckCheck,
  ShieldCheck,
  CircleCheck,
  ArrowRight,
  RotateCcw,
  LoaderCircle,
  Clock3,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { requirements, managers, event } from "@/lib/data";
import { Card, Badge, Textarea } from "./ui/primitives";
import { Button } from "./ui/button";
import { AccountLogo, Avatar, SectionTitle } from "./shared";
import { toast } from "sonner";
export function Onboarding() {
  const { data, setData } = useStore();
  const brands = data.accounts.filter((a) => a.type === "Corporate Brand");
  const [selected, setSelected] = useState(
    brands.find((a) => a.status === "Onboarding")?.id || brands[0]?.id,
  );
  const [verifying, setVerifying] = useState(false);
  const [reason, setReason] = useState("");
  const a = brands.find((b) => b.id === selected) || brands[0];
  if (!a) return null;
  const count = a.checks.filter(Boolean).length,
    all = count === 6;
  const update = (patch: Partial<typeof a>, text: string) =>
    setData((d) => ({
      ...d,
      accounts: d.accounts.map((x) =>
        x.id === a.id
          ? { ...x, ...patch, history: [event(text), ...x.history] }
          : x,
      ),
    }));
  const verify = async () => {
    if (!all) return;
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1200));
    update(
      { verification: "Verified", approval: "Not submitted" },
      "All six setup requirements passed simulated verification.",
    );
    setVerifying(false);
    toast.success("Simulated verification passed");
  };
  const step =
    a.status === "Active"
      ? 4
      : a.approval === "Pending approval"
        ? 3
        : a.verification === "Verified"
          ? 2
          : 1;
  return (
    <>
      <SectionTitle
        title="Brand onboarding"
        subtitle="A thoughtful launch starts with a complete setup."
      >
        <span className="demo-chip">
          <ShieldCheck size={14} />
          Simulated verification & approval
        </span>
      </SectionTitle>
      <div className="onboarding-summary">
        <Card>
          <span className="tile-icon purple">
            <Building2 size={20} />
          </span>
          <div>
            <strong>
              {brands.filter((a) => a.status === "Onboarding").length}
            </strong>
            <span>Brands in onboarding</span>
          </div>
        </Card>
        <Card>
          <span className="tile-icon amber">
            <Clock3 size={20} />
          </span>
          <div>
            <strong>
              {brands.filter((a) => a.approval === "Pending approval").length}
            </strong>
            <span>Awaiting approval</span>
          </div>
        </Card>
        <Card>
          <span className="tile-icon green">
            <CircleCheck size={20} />
          </span>
          <div>
            <strong>
              {brands.filter((a) => a.status === "Active").length}
            </strong>
            <span>Active brands</span>
          </div>
        </Card>
      </div>
      <div className="onboarding-layout">
        <Card className="brand-list">
          <h3>Brand launch queue</h3>
          {[
            ...brands.filter((a) => a.status !== "Active"),
            ...brands.filter((a) => a.status === "Active"),
          ].map((b) => (
            <button
              key={b.id}
              className={a.id === b.id ? "selected" : ""}
              onClick={() => {
                setSelected(b.id);
                setReason("");
              }}
            >
              <AccountLogo name={b.name} color={b.color} size={34} />
              <span>
                <strong>{b.name}</strong>
                <small>
                  {b.status === "Active"
                    ? "Active"
                    : `${b.checks.filter(Boolean).length} of 6 steps completed`}
                </small>
                <span className="progress">
                  <span
                    style={{
                      width: `${(b.checks.filter(Boolean).length / 6) * 100}%`,
                    }}
                  />
                </span>
              </span>
              <span className="queue-percent">
                {Math.round((b.checks.filter(Boolean).length / 6) * 100)}%
              </span>
            </button>
          ))}
        </Card>
        <div className="onboarding-main">
          <Card>
            <div className="onboarding-brand-heading">
              <AccountLogo name={a.name} color={a.color} size={48} />
              <div>
                <h2>{a.name}</h2>
                <span className="identity">
                  <Avatar name={a.manager} size={20} />
                  {a.manager} · Account manager
                </span>
              </div>
              <Badge>{a.status}</Badge>
            </div>
            <div className="activation-stepper">
              {[
                "Complete setup",
                "Verify configuration",
                "Operations approval",
                "Activate brand",
              ].map((s, i) => (
                <div key={s} className={step > i ? "complete" : ""}>
                  <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
                  <small>{s}</small>
                </div>
              ))}
            </div>
            <div className="checklist-heading">
              <div>
                <h3>Launch requirements</h3>
                <p>
                  All six requirements must be complete before verification.
                </p>
              </div>
              <strong>{count}/6</strong>
            </div>
            <div className="progress big">
              <span style={{ width: `${(count / 6) * 100}%` }} />
            </div>
            {requirements.map((req, i) => (
              <div className="onboarding-check" key={req}>
                <label>
                  <input
                    type="checkbox"
                    checked={a.checks[i]}
                    disabled={
                      a.status === "Active" ||
                      a.approval === "Pending approval" ||
                      verifying
                    }
                    onChange={(e) => {
                      const checks = [...a.checks];
                      checks[i] = e.target.checked;
                      update(
                        {
                          checks,
                          verification: "Pending",
                          approval: "Not submitted",
                        },
                        `${req} ${e.target.checked ? "completed" : "reopened"}.`,
                      );
                    }}
                  />
                  <span>
                    <strong>{req}</strong>
                    <small>
                      {
                        [
                          "Company details, brand assets, and legal profile",
                          "Team members, roles, and account permissions",
                          "Product catalog, variants, images, and pricing",
                          "Simulated billing profile and payment settings",
                          "Storefront integration and checkout experience",
                          "Shipping zones and connected distributors",
                        ][i]
                      }
                    </small>
                  </span>
                </label>
                <Avatar name={managers[i % 4]} size={26} />
                <Badge>{a.checks[i] ? "Done" : "Pending"}</Badge>
              </div>
            ))}
            <div className="verification-panel">
              <span
                className={`tile-icon ${a.verification === "Verified" ? "green" : "purple"}`}
              >
                <ShieldCheck size={22} />
              </span>
              <div>
                <h3>
                  {a.verification === "Verified"
                    ? "Configuration verified"
                    : "Automatic verification"}
                </h3>
                <p>
                  {a.verification === "Verified"
                    ? "All six requirements passed the simulated configuration check."
                    : "Complete all setup steps, then run the simulated checks."}
                </p>
              </div>
              <Button
                disabled={
                  !all ||
                  verifying ||
                  a.status === "Active" ||
                  a.approval === "Pending approval"
                }
                variant={a.verification === "Verified" ? "outline" : "default"}
                onClick={verify}
              >
                {verifying ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <ShieldCheck size={15} />
                )}
                {verifying
                  ? "Verifying…"
                  : a.verification === "Verified"
                    ? "Run again"
                    : "Run verification"}
              </Button>
            </div>
          </Card>
          <Card className="approval-panel">
            <div className="panel-heading">
              <div>
                <h3>Operations approval</h3>
                <p>A final review before the brand goes live.</p>
              </div>
              <Badge>{a.approval}</Badge>
            </div>
            {a.status === "Active" ? (
              <div className="success-panel">
                <CircleCheck size={26} />
                <div>
                  <h3>This brand is active</h3>
                  <p>
                    Setup, verification, and Operations approval are complete.
                  </p>
                </div>
              </div>
            ) : a.approval === "Pending approval" ? (
              <>
                <div className="info-callout">
                  Submitted for simulated Operations review. You can act as the
                  reviewer in this prototype.
                </div>
                <Textarea
                  aria-label="Approval review notes"
                  placeholder="Add a review note (required to reject)…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="approval-actions">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!reason.trim()) {
                        toast.error("Add a reason before rejecting.");
                        return;
                      }
                      update(
                        { approval: "Rejected", verification: "Pending" },
                        `Operations rejected activation: ${reason.trim()}`,
                      );
                      setReason("");
                      toast.info(
                        "Activation rejected. Revise setup and verify again.",
                      );
                    }}
                  >
                    Reject & return
                  </Button>
                  <Button
                    onClick={() => {
                      if (!all || a.verification !== "Verified") return;
                      update(
                        {
                          approval: "Approved",
                          status: "Active",
                          stage: "Active",
                        },
                        `Operations approved activation.${reason.trim() ? " " + reason.trim() : ""}`,
                      );
                      toast.success(`${a.name} is now active`);
                    }}
                  >
                    <CheckCheck size={16} />
                    Approve & activate
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="approval-copy">
                  {a.approval === "Rejected"
                    ? "The last review was rejected. Review the activity below, update setup as needed, and run verification again."
                    : "After configuration is verified, submit this brand for a final Operations review."}
                </p>
                <Button
                  disabled={!all || a.verification !== "Verified" || verifying}
                  onClick={() => {
                    update(
                      { approval: "Pending approval" },
                      "Submitted brand activation for Operations approval.",
                    );
                    toast.success("Submitted for Operations approval");
                  }}
                >
                  Submit for approval
                  <ArrowRight size={16} />
                </Button>
              </>
            )}
          </Card>
          <Card className="onboarding-history">
            <h3>Launch activity</h3>
            {a.history.slice(0, 5).map((h) => (
              <div className="history-row" key={h.id}>
                <Clock3 size={15} />
                <div>
                  <p>{h.text}</p>
                  <small>
                    {h.author} · {new Date(h.at).toLocaleString("en-US")}
                  </small>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
