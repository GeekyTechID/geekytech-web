"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { settingsLabelClass } from "../../_lib/label-class";
import { saveSetting } from "../../_actions";
import type { BiteshipCourierService } from "@/lib/biteship/fetch-active-couriers";

export type ActiveCourier = {
  courier_code: string;
  courier_service_code: string;
  courier_name: string;
  service_name: string;
};

interface CourierFormProps {
  allCouriers: BiteshipCourierService[];
  activeCouriers: ActiveCourier[];
}

function makeKey(courier_code: string, courier_service_code: string) {
  return `${courier_code.toLowerCase()}:${courier_service_code.toLowerCase()}`;
}

export function CourierForm({ allCouriers, activeCouriers }: CourierFormProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(activeCouriers.map((c) => makeKey(c.courier_code, c.courier_service_code))),
  );
  const [isPending, startTransition] = useTransition();

  const groups = allCouriers.reduce<Record<string, BiteshipCourierService[]>>((acc, c) => {
    if (!acc[c.courier_code]) acc[c.courier_code] = [];
    acc[c.courier_code].push(c);
    return acc;
  }, {});

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (services: BiteshipCourierService[]) => {
    const keys = services.map((c) => makeKey(c.courier_code, c.courier_service_code));
    const allChecked = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const activeList: ActiveCourier[] = allCouriers
        .filter((c) => selected.has(makeKey(c.courier_code, c.courier_service_code)))
        .map((c) => ({
          courier_code: c.courier_code,
          courier_service_code: c.courier_service_code,
          courier_name: c.courier_name,
          service_name: c.courier_service_name,
        }));

      const { error } = await saveSetting("active_couriers", activeList);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Pengaturan kurir diperbarui.");
    });
  };

  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([courierCode, services]) => {
        const courierName = services[0].courier_name;
        const groupKeys = services.map((c) => makeKey(c.courier_code, c.courier_service_code));
        const allChecked = groupKeys.every((k) => selected.has(k));

        return (
          <div key={courierCode}>
            <div className="mb-3 flex items-center justify-between">
              <span className={settingsLabelClass}>{courierName}</span>
              <button
                type="button"
                onClick={() => toggleGroup(services)}
                className="text-[11px] font-semibold uppercase text-brand hover:underline"
              >
                {allChecked ? "Hapus Semua" : "Pilih Semua"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {services.map((c) => {
                const key = makeKey(c.courier_code, c.courier_service_code);
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e0e0e0] px-3 py-2 transition-colors hover:border-brand/50 dark:border-border"
                  >
                    <Checkbox
                      checked={selected.has(key)}
                      onCheckedChange={() => toggle(key)}
                    />
                    <span className="text-sm">{c.courier_service_name}</span>
                    <span className="text-xs uppercase text-muted-foreground">
                      ({c.courier_service_code})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="border-t border-[#e0e0e0] pt-6 dark:border-border">
        <Button type="button" variant="primary" size="sm" onClick={handleSave} loading={isPending}>
          Simpan
        </Button>
      </div>
    </div>
  );
}
