"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { approveReturn, confirmReturnReceived, createReplacementShipment } from "../../_actions";

type ReturnData = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  return_shipments: { awb_number: string | null; courier: string | null; status: string | null }[];
};

type OrderItem = {
  product_name: string;
  price: number;
  quantity: number;
  variant_id: string | null;
  weight: number;
};

type OrderSnap = {
  id: string;
  order_number: string;
  shipping_address: string;
  shipping_phone: string;
  shipping_name: string;
  order_items: OrderItem[];
};

export function ReturnManager({
  complaintId,
  complaintStatus,
  returnData,
  order,
  userId,
}: {
  complaintId: string;
  complaintStatus: string;
  returnData: ReturnData | null;
  order: OrderSnap | null;
  userId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [courier, setCourier] = useState("");
  const [courierType, setCourierType] = useState("reg");
  const [itemQtys, setItemQtys] = useState<Record<number, number>>(
    () => Object.fromEntries((order?.order_items ?? []).map((item, i) => [i, item.quantity]))
  );
  const [itemSelected, setItemSelected] = useState<Record<number, boolean>>(
    () => Object.fromEntries((order?.order_items ?? []).map((_, i) => [i, true]))
  );

  function handleApprove() {
    startTransition(async () => {
      const { error } = await approveReturn(complaintId);
      if (error) toast.error(error);
      else toast.success("Retur disetujui.");
    });
  }

  function handleConfirmReceived() {
    if (!returnData) return;
    startTransition(async () => {
      const { error } = await confirmReturnReceived(returnData.id, complaintId);
      if (error) toast.error(error);
      else toast.success("Penerimaan barang dikonfirmasi.");
    });
  }

  function handleCreateShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!returnData || !order) return;
    const items = (order.order_items ?? [])
      .filter((_, i) => itemSelected[i])
      .map((item, i) => ({
        name: item.product_name,
        value: item.price,
        quantity: itemQtys[i] ?? item.quantity,
        weight: item.weight ?? 500,
      }));
    if (items.length === 0) {
      toast.error("Pilih minimal satu item.");
      return;
    }

    startTransition(async () => {
      const { error } = await createReplacementShipment({
        returnId: returnData.id,
        complaintId,
        orderId: order.id,
        items,
        destinationName: order.shipping_name,
        destinationPhone: order.shipping_phone,
        destinationAddress: order.shipping_address,
        destinationPostalCode: 0,
        courierCompany: courier,
        courierType,
        userId,
      });
      if (error) toast.error(error);
      else toast.success("Shipment Biteship berhasil dibuat.");
    });
  }

  return (
    <div className="space-y-4">
      {complaintStatus === "in_review" && !returnData && (
        <Button type="button" variant="primary" size="sm" onClick={handleApprove} loading={pending}>
          Setujui Retur
        </Button>
      )}

      {returnData && (
        <div className="space-y-3 text-[14px]">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Status retur</p>
          <p className="font-medium capitalize">{returnData.status.replace(/_/g, " ")}</p>

          {returnData.return_awb && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Resi dari pembeli</p>
              <p>{returnData.return_courier}</p>
              <p className="font-mono font-semibold">{returnData.return_awb}</p>
            </div>
          )}

          {returnData.status === "shipped_back" && (
            <Button type="button" variant="pearl" size="sm" onClick={handleConfirmReceived} loading={pending}>
              Konfirmasi Terima Barang
            </Button>
          )}

          {returnData.status === "received" && order && (
            <form onSubmit={handleCreateShipment} className="space-y-4 rounded-lg border border-[#e0e0e0] p-4">
              <p className="font-semibold">Buat Shipment Penggantian</p>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Item yang diganti</p>
                {order.order_items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={itemSelected[i] ?? true}
                      onChange={(e) =>
                        setItemSelected((p) => ({ ...p, [i]: e.target.checked }))
                      }
                    />
                    <span className="flex-1 text-[13px]">{item.product_name}</span>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={itemQtys[i] ?? item.quantity}
                      onChange={(e) =>
                        setItemQtys((p) => ({ ...p, [i]: Number(e.target.value) }))
                      }
                      className="w-16 rounded border border-[#e0e0e0] px-2 py-1 text-[13px]"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Kurir</Label>
                  <Input
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    required
                    placeholder="jne / jnt / sicepat"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Tipe layanan</Label>
                  <Input
                    value={courierType}
                    onChange={(e) => setCourierType(e.target.value)}
                    required
                    placeholder="reg / yes / oke"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="submit" variant="primary" size="sm" loading={pending}>
                Buat Shipment Biteship
              </Button>
            </form>
          )}

          {returnData.return_shipments.length > 0 && (
            <div className="rounded-lg border border-[#e0e0e0] p-3 space-y-1 text-[13px]">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Pengiriman penggantian</p>
              <p>{returnData.return_shipments[0].courier}</p>
              <p className="font-mono font-semibold">{returnData.return_shipments[0].awb_number}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
