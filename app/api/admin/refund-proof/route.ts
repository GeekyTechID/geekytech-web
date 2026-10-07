import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { uploadRefundProof } from "@/lib/orders/refund-proof";

const inputSchema = z.object({
  orderId: z.string().uuid({ message: "ID pesanan tidak valid." }),
  file: z.instanceof(File, { message: "File bukti transfer wajib diisi." }),
});

/** Upload bukti transfer refund (admin saja). Path dipakai saat ubah status ke "refunded". */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Tidak terautentikasi." }, { status: 401 });
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const formData = await req.formData();
    const parsed = inputSchema.safeParse({ orderId: formData.get("orderId"), file: formData.get("file") });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const result = await uploadRefundProof(parsed.data.file, parsed.data.orderId);
    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: { path: result.path } });
  } catch {
    return NextResponse.json({ success: false, error: "Upload bukti transfer gagal. Coba lagi." }, { status: 500 });
  }
}
