import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { Button } from "@/components/ui/button";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress, getStoreOriginMapsUrl } from "@/lib/settings/store-origin";
import { LEGAL_ENTITY_NAME } from "@/lib/constants/business-identity";

export const metadata: Metadata = {
  title: "Tentang GeekyTech",
  description:
    "GeekyTech adalah toko tech & gadget terpercaya dengan produk original bergaransi resmi. Melayani lebih dari 3.500 pelanggan setia di seluruh Indonesia.",
};

const stats = [
  { value: "107+", label: "Produk Original" },
  { value: "3.565", label: "Pelanggan Setia" },
  { value: "23.000+", label: "Transaksi Selesai" },
  { value: "100%", label: "Garansi Resmi" },
];

const values = [
  {
    title: "Produk Original",
    description:
      "Setiap produk yang kami jual adalah barang original bergaransi resmi dari distributor resmi. Tidak ada kompromi soal keaslian.",
  },
  {
    title: "Harga Transparan",
    description:
      "Harga yang kami tampilkan adalah harga final. Tidak ada biaya tersembunyi, tidak ada kejutan saat checkout.",
  },
  {
    title: "Pengiriman Cepat",
    description:
      "Kami bermitra dengan kurir terpercaya untuk memastikan produk sampai ke tanganmu dengan aman dan tepat waktu.",
  },
  {
    title: "Pelayanan Tulus",
    description:
      "Tim kami siap membantu dari konsultasi produk hingga after-sales. Kepuasanmu adalah ukuran keberhasilan kami.",
  },
];

export default async function AboutPage() {
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
      href: null,
      label: null,
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero — light tile */}
      <section className="w-full px-6 py-20 md:pt-[80px] md:pb-0 text-center bg-white">
        <div className="mx-auto max-w-[980px]">
          <p
            className="text-[14px] font-semibold text-[#EA5329] mb-4"
          >
            Tentang Kami
          </p>
          <h1
            className="text-[28px] sm:text-[40px] lg:text-[56px] font-semibold leading-[1.07] text-[#1d1d1f] mb-6"
          >
            Gadget terbaik,<br className="hidden sm:block" /> di tangan yang tepat.
          </h1>
          <p
            className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto"
          >
            GeekyTech hadir untuk memastikan semua orang bisa mengakses teknologi terbaik dengan mudah, aman, dan terpercaya.
          </p>
          <p className="mt-4 mb-6 text-[17px] font-black text-black">
            Dioperasikan oleh {LEGAL_ENTITY_NAME}.
          </p>
        </div>
      </section>

      {/* Story — dark tile */}
      <section className="w-full px-6 py-[80px] bg-[#272729]">
        <div className="mx-auto max-w-[980px] grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[14px] font-semibold text-[#FFAD88] mb-4">
              Cerita Kami
            </p>
            <h2
              className="text-[34px] font-semibold leading-[1.1] text-white mb-6"
            >
              Berawal dari passion,<br /> berkembang bersama kepercayaan.
            </h2>
            <p className="text-[17px] font-normal leading-[1.47] text-[#cccccc] mb-4">
              GeekyTech dimulai dari kecintaan mendalam terhadap teknologi dan keinginan untuk berbagi akses ke gadget terbaik dengan harga yang adil. Kami memulai perjalanan di Tokopedia dan membangun kepercayaan satu per satu bersama pelanggan kami.
            </p>
            <p className="text-[17px] font-normal leading-[1.47] text-[#cccccc]">
              Kini, dengan lebih dari 23.000 transaksi yang telah diselesaikan, kami hadir dengan platform sendiri untuk memberikan pengalaman belanja yang lebih baik — lebih cepat, lebih personal, dan lebih terpercaya.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-[#2a2a2c] rounded-[18px] p-6 text-center"
              >
                <p className="text-[40px] font-semibold leading-[1.1] text-white mb-2">
                  {stat.value}
                </p>
                <p className="text-[14px] font-normal text-[#cccccc]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values — parchment tile */}
      <section className="w-full px-6 py-[80px] bg-[#f5f5f7][#1a1a1a]">
        <div className="mx-auto max-w-[980px]">
          <div className="text-center mb-12">
            <p className="text-[14px] font-semibold text-[#EA5329] mb-4">
              Nilai Kami
            </p>
            <h2
              className="text-[34px] font-semibold leading-[1.1] text-[#1d1d1f]"
            >
              Mengapa memilih GeekyTech?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-white[#272729] rounded-[18px] border border-[#e0e0e0][#3a3a3a] p-6"
              >
                <h3 className="text-[17px] font-semibold leading-[1.24] text-[#1d1d1f] mb-3">
                  {value.title}
                </h3>
                <p className="text-[17px] font-normal leading-[1.47] text-[#7a7a7a][#cccccc]">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission — dark tile */}
      <section className="w-full px-6 py-[80px] bg-[#252527] text-center">
        <div className="mx-auto max-w-[680px]">
          <p className="text-[14px] font-semibold text-[#FFAD88] mb-4">
            Misi Kami
          </p>
          <h2
            className="text-[34px] font-semibold leading-[1.1] text-white mb-6"
          >
            Mendekatkan teknologi ke semua orang.
          </h2>
          <p className="text-[17px] font-light leading-[1.5] text-[#cccccc] max-w-[560px] mx-auto">
            Kami percaya bahwa teknologi yang tepat dapat mengubah cara kamu bekerja, berkreasi, dan menikmati hidup. Itulah mengapa kami berkomitmen untuk selalu menghadirkan produk terbaik, dukungan tulus, dan pengalaman belanja yang menyenangkan.
          </p>
        </div>
      </section>

      {/* Contact Channels — dark tile */}
      <section id="kontak" className="w-full px-6 py-[80px] bg-[#272729] scroll-mt-20">
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
                  href={channel.href ?? undefined}
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
                  {channel.label && (
                    <span className="text-[14px] font-normal text-brand transition-colors group-hover:text-brand-hover">
                      {channel.label} →
                    </span>
                  )}
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

      {/* CTA — white tile */}
      <section className="w-full px-6 py-[80px] bg-white text-center">
        <div className="mx-auto max-w-[680px]">
          <h2
            className="text-[40px] font-semibold leading-[1.1] text-[#1d1d1f] mb-4"
          >
            Siap eksplor koleksi kami?
          </h2>
          <p className="text-[21px] font-normal leading-[1.19] text-[#1d1d1f][#cccccc] mb-8">
            107 produk tech & gadget original menunggumu.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild variant="primary">
              <Link href="/products">Lihat Semua Produk</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#kontak">Hubungi Kami</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
