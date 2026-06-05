import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const contactFormSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  phone: z.string().min(10).regex(/^(\+62|0)[0-9]{9,}$/),
  subject: z.string().min(5).max(100),
  message: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = contactFormSchema.parse(body);

    // TODO: Simpan ke database atau kirim email via Resend
    // const supabase = await createServerClient();
    // await supabase.from("contact_messages").insert({
    //   name: data.name,
    //   email: data.email,
    //   phone: data.phone,
    //   subject: data.subject,
    //   message: data.message,
    //   status: "new",
    //   created_at: new Date().toISOString(),
    // });

    // TODO: Kirim email notifikasi ke admin
    // await resend.emails.send({
    //   from: "noreply@geekytech.com",
    //   to: "support@geekytech.com",
    //   subject: `Pesan Kontak Baru: ${data.subject}`,
    //   html: `...`,
    // });

    console.log("Contact form submission:", data);

    return NextResponse.json(
      { success: true, message: "Pesan berhasil dikirim" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Data tidak valid", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengirim pesan. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
