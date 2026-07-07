import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress, getStoreOriginMapsUrl } from "@/lib/settings/store-origin";
import { LEGAL_ENTITY_NAME } from "@/lib/constants/business-identity";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Hubungi tim GeekyTech untuk konsultasi produk, pertanyaan pesanan, atau keluhan. Kami siap membantu 24/7.",
};

export default async function ContactPage() {
  const [storeOrigin, whatsappCs] = await Promise.all([getStoreOrigin(), getWhatsappCs()]);
  const fullAddress = getStoreOriginFullAddress(storeOrigin);

  const contactChannels = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Chat langsung dengan tim kami",
      value: whatsappCs ? `+${whatsappCs}` : "Belum diatur",
      href: whatsappCs ? `https://wa.me/${whatsappCs}` : "#",
      label: "Buka WhatsApp",
    },
    {
      icon: Mail,
      title: "Email",
      description: "Kirim email pertanyaanmu",
      value: "support@geeky.id",
      href: "mailto:support@geeky.id",
      label: "Kirim Email",
    },
    {
      icon: MapPin,
      title: "Lokasi",
      description: "Kunjungi showroom kami",
      value: fullAddress || "Belum diatur",
      href: getStoreOriginMapsUrl(storeOrigin),
      label: "Lihat Peta",
    },
    {
      icon: Clock,
      title: "Jam Operasional",
      description: "Kami siap melayani",
      value: "Senin - Minggu, 09:00 - 21:00",
      href: "#",
      label: "Hubungi Sekarang",
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero — light tile */}
      <section className="w-full px-6 py-20 md:py-[80px] text-center bg-white">
        <div className="mx-auto max-w-[980px]">
          <p className="text-[14px] font-semibold text-[#EA5329] mb-4">
            Hubungi Kami
          </p>
          <h1 className="text-[28px] sm:text-[40px] lg:text-[56px] font-semibold leading-[1.07] text-[#1d1d1f] mb-6">
            Ada yang bisa<br className="hidden sm:block" /> kami bantu?
          </h1>
          <p className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto">
            Tim kami siap membantu dengan konsultasi produk, pertanyaan pesanan, atau keluhan apapun. Hubungi kami melalui channel favoritmu.
          </p>
          <p className="mt-4 text-[13px] text-[#7a7a7a]">
            Dioperasikan oleh {LEGAL_ENTITY_NAME}.
          </p>
        </div>
      </section>

      {/* Contact Channels — dark tile */}
      <section className="w-full px-6 py-[80px] bg-[#272729]">
        <div className="mx-auto max-w-[1440px]">
          <div className="text-center mb-12">
            <p className="text-[14px] font-semibold text-[#FFAD88] mb-4">
              Cara Menghubungi
            </p>
            <h2 className="text-[34px] font-semibold leading-[1.1] text-white">
              Pilih cara komunikasi yang paling mudah
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.title}
                  href={channel.href}
                  className="bg-[#2a2a2c] rounded-[18px] p-6 hover:bg-[#333335] transition-colors group"
                >
                  <div className="mb-4">
                    <Icon className="w-8 h-8 text-[#FFAD88]" />
                  </div>
                  <h3 className="text-[17px] font-semibold text-white mb-2">
                    {channel.title}
                  </h3>
                  <p className="text-[14px] font-normal text-[#cccccc] mb-3">
                    {channel.description}
                  </p>
                  <p className="text-[14px] font-semibold text-[#FFAD88] mb-4">
                    {channel.value}
                  </p>
                  <span className="text-[14px] font-normal text-brand transition-colors group-hover:text-brand-hover">
                    {channel.label} →
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form — light tile */}
      <section className="w-full px-6 py-[80px] bg-white">
        <div className="mx-auto max-w-[600px]">
          <div className="text-center mb-12">
            <p className="text-[14px] font-semibold text-[#EA5329] mb-4">
              Formulir Kontak
            </p>
            <h2 className="text-[34px] font-semibold leading-[1.1] text-[#1d1d1f] mb-3">
              Kirim pesan ke kami
            </h2>
            <p className="text-[17px] font-normal leading-[1.47] text-[#7a7a7a][#cccccc]">
              Isi form di bawah dan kami akan membalas dalam waktu singkat.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>

      {/* FAQ Preview — parchment tile */}
      <section className="w-full px-6 py-20 md:py-[80px] bg-[#f5f5f7][#1a1a1a]">
        <div className="mx-auto max-w-[980px]">
          <div className="text-center mb-12">
            <p className="text-[14px] font-semibold text-[#EA5329] mb-4">
              Pertanyaan Umum
            </p>
            <h2 className="text-[34px] font-semibold leading-[1.1] text-[#1d1d1f]">
              Jawaban cepat untuk pertanyaanmu
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-[800px] mx-auto">
            {[
              {
                q: "Berapa lama pengiriman?",
                a: "Pengiriman ke Jakarta 1-2 hari, luar Jakarta 2-4 hari kerja tergantung kurir.",
              },
              {
                q: "Apakah ada garansi?",
                a: "Semua produk kami 100% original dengan garansi resmi dari distributor.",
              },
              {
                q: "Bisa retur/ganti barang?",
                a: "Tentu! Retur gratis 7 hari setelah barang sampai jika ada cacat pabrik.",
              },
              {
                q: "Metode pembayaran apa saja?",
                a: "Kami terima transfer bank, kartu kredit, e-wallet, dan cicilan tanpa bunga.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white[#272729] rounded-[18px] border border-[#e0e0e0][#3a3a3a] p-6"
              >
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                  {faq.q}
                </h3>
                <p className="text-[14px] font-normal text-[#7a7a7a][#cccccc]">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a
              href="/faq"
              className="inline-block text-[17px] font-normal text-[#EA5329] hover:text-[#d44820] transition-colors"
            >
              Lihat semua FAQ →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
