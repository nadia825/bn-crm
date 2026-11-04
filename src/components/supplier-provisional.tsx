import { Info } from "lucide-react";

export function SupplierProvisionalNotice() {
  return (
    <div
      className="role-demo-note"
      role="note"
      aria-label="Suppliers are provisional"
    >
      <Info size={17} aria-hidden="true" />
      <span>
        <strong>Suppliers · Provisional</strong>
        <br />
        The relationship between suppliers, brands and affiliates is still to be
        defined. Supplier records, pipeline stages and relationship links are
        illustrative mock data.
      </span>
    </div>
  );
}
