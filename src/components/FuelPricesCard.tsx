import { useEffect, useState } from "react";
import { Fuel, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NumberInput from "@/components/NumberInput";
import { toast } from "sonner";
import { FuelPrices, getFuelPrices, saveFuelPrices } from "@/lib/db";
import { fmtNumber } from "@/lib/format";

const FuelPricesCard = () => {
  const [prices, setPrices] = useState<FuelPrices>({
    price92: 0,
    price95: 0,
    priceDiesel: 0,
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FuelPrices>(prices);

  useEffect(() => {
    (async () => setPrices(await getFuelPrices()))();
  }, []);

  const openEdit = () => {
    setDraft(prices);
    setOpen(true);
  };

  const save = async () => {
    await saveFuelPrices(draft);
    setPrices(draft);
    setOpen(false);
    toast.success("Fuel prices updated");
  };

  const updatedLabel = prices.updatedAt
    ? `Updated ${new Date(prices.updatedAt).toLocaleDateString()}`
    : "Update weekly";

  return (
    <section className="surface-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold tracking-wider uppercase text-sm">
            Fuel Prices
          </h2>
        </div>
        <button
          onClick={openEdit}
          className="text-xs text-primary inline-flex items-center gap-1 hover:opacity-80"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border/60">
        <PriceCell label="92" value={prices.price92} />
        <PriceCell label="95" value={prices.price95} />
        <PriceCell label="Diesel" value={prices.priceDiesel} />
      </div>
      <p className="text-[10px] text-muted-foreground px-4 py-2 border-t border-border/60">
        {updatedLabel}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">
              Update Fuel Prices
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="92">
              <NumberInput
                value={draft.price92}
                onChange={(n) => setDraft({ ...draft, price92: n })}
                placeholder="0"
              />
            </Field>
            <Field label="95">
              <NumberInput
                value={draft.price95}
                onChange={(n) => setDraft({ ...draft, price95: n })}
                placeholder="0"
              />
            </Field>
            <Field label="Diesel">
              <NumberInput
                value={draft.priceDiesel}
                onChange={(n) => setDraft({ ...draft, priceDiesel: n })}
                placeholder="0"
              />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={save}
              className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

const PriceCell = ({ label, value }: { label: string; value: number }) => (
  <div className="p-4 text-center">
    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
      {label}
    </p>
    <p className="font-display text-2xl font-bold text-primary tabular mt-1">
      {fmtNumber(value, { decimals: value % 1 === 0 ? 0 : 2 })}
    </p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
      {label}
    </Label>
    {children}
  </div>
);

export default FuelPricesCard;
