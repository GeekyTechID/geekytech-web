import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kebijakan Pengembalian",
  description:
    "Kebijakan pengembalian dan penukaran barang GeekyTech. Pelajari syarat, cara pengajuan, dan estimasi waktu pengembalian dana.",
};

const sections = [
  {
    title: "1. Syarat Pengembalian Barang",
    content: [
      "GeekyTech menyediakan kebijakan pengembalian gratis dalam waktu 7 hari sejak barang diterima, dengan syarat barang dalam kondisi original, belum digunakan, dan kelengkapan (dus, aksesori, kartu garansi) masih utuh.",
      "Pengembalian karena kecacatan pabrik dapat diajukan kapan saja selama garansi resmi produk masih berlaku, tanpa batas waktu 7 hari di atas.",
      "Barang yang dikembalikan karena tidak sesuai pesanan (salah warna/varian yang dikirim oleh GeekyTech) mengikuti syarat yang sama seperti kecacatan pabrik.",
    ],
  },
  {
    title: "2. Barang yang Tidak Dapat Dikembalikan",
    content: [
      "Barang yang sudah digunakan, dipasang, atau menunjukkan tanda pemakaian di luar untuk keperluan pengecekan awal.",
      "Barang dengan segel/garansi yang sudah rusak akibat pembukaan yang tidak wajar, kecuali kerusakan tersebut adalah bagian dari cacat pabrik yang diklaim.",
      "Kerusakan yang timbul akibat kesalahan penggunaan, kecelakaan, atau modifikasi oleh pembeli setelah barang diterima.",
      "Produk yang dibeli dalam kategori kebutuhan khusus atau pre-order dengan ketentuan tertulis berbeda saat pemesanan.",
    ],
  },
  {
    title: "3. Cara Mengajukan Pengembalian",
    content: [
      "Hubungi customer service GeekyTech melalui halaman Kontak selambat-lambatnya 7 hari sejak barang diterima, sertakan nomor pesanan dan foto/video kondisi barang.",
      "Tim kami akan memverifikasi pengajuan dan mengirimkan instruksi pengiriman balik (termasuk alamat tujuan retur) melalui email atau WhatsApp.",
      "Kemas barang beserta seluruh kelengkapannya, lalu kirim menggunakan kurir yang diinstruksikan oleh tim kami.",
    ],
  },
  {
    title: "4. Proses Verifikasi dan Biaya Pengiriman Balik",
    content: [
      "Setelah barang retur diterima, tim kami akan melakukan verifikasi kondisi barang dalam waktu 2-3 hari kerja.",
      "Biaya pengiriman balik ditanggung oleh GeekyTech jika pengembalian disebabkan oleh kecacatan pabrik atau kesalahan pengiriman dari pihak kami.",
      "Biaya pengiriman balik ditanggung oleh pembeli jika pengembalian disebabkan oleh alasan di luar cacat pabrik/kesalahan pengiriman (misal berubah pikiran), sepanjang barang masih memenuhi syarat pada bagian 1.",
    ],
  },
  {
    title: "5. Estimasi Waktu Pengembalian Dana",
    content: [
      "Dana akan dikembalikan dalam waktu 5-7 hari kerja setelah barang retur diterima dan lolos verifikasi.",
      "Pengembalian dana dilakukan melalui metode pembayaran yang sama dengan metode pembayaran saat transaksi berlangsung.",
      "Untuk transaksi yang belum melewati status pembayaran berhasil (settlement), pembatalan pesanan tidak memerlukan proses retur fisik — dana otomatis tidak terpotong.",
    ],
  },
  {
    title: "6. Penukaran Barang",
    content: [
      "Penukaran varian (misal ukuran, warna) hanya dapat dilakukan jika stok varian yang diminta tersedia, dan mengikuti syarat kondisi barang pada bagian 1.",
      "Jika terjadi selisih harga antara barang lama dan barang pengganti, selisih akan ditagihkan atau dikembalikan sesuai kondisi.",
      "Proses penukaran mengikuti alur pengajuan yang sama seperti pengembalian pada bagian 3.",
    ],
  },
  {
    title: "7. Hubungi Kami",
    content: [
      "Untuk pertanyaan atau pengajuan pengembalian, silakan hubungi kami melalui:",
      "Email: support@geekytech.com",
      "WhatsApp: +62 812-3456-7890",
      "Jam operasional: Senin - Minggu, 09:00 - 21:00",
    ],
  },
];

export default function KebijakanPengembalianPage() {
  return (
    <div className="bg-white">
      {/* Hero — light tile */}
      <section className="w-full px-6 py-20 md:pt-[80px] md:pb-0 text-center bg-white">
        <div className="mx-auto max-w-[980px]">
          <p className="text-[14px] font-semibold text-[#EA5329] mb-4">
            Legal
          </p>
          <h1 className="text-[28px] sm:text-[40px] lg:text-[56px] font-semibold leading-[1.07] text-[#1d1d1f] mb-6">
            Kebijakan Pengembalian
          </h1>
          <p className="text-[17px] font-light leading-[1.5] text-[#1d1d1f] max-w-[600px] mx-auto mb-8">
            Pelajari syarat, cara pengajuan, dan estimasi waktu pengembalian dana untuk barang yang kamu beli di GeekyTech.
          </p>
          <p className="text-[14px] text-[#7a7a7a]">
            Terakhir diperbarui: 13 Mei 2026
          </p>
        </div>
      </section>

      {/* Content — light tile */}
      <section className="w-full px-6 bg-white">
        <div className="mx-auto max-w-[980px]">
          <div className="prose prose-invert max-w-none">
            {sections.map((section, idx) => (
              <div key={idx} className="mb-12 last:mb-0">
                <h2 className="text-[21px] font-semibold leading-[1.19] text-[#1d1d1f] mb-4">
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.content.map((text, contentIdx) => (
                    <p
                      key={contentIdx}
                      className="text-[17px] font-normal leading-[1.47] text-[#1d1d1f]"
                    >
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {/* Final CTA */}
            <div className="mt-[80px] pt-[80px] border-t border-[#e0e0e0] text-center">
              <h3 className="text-[21px] font-semibold leading-[1.19] text-[#1d1d1f] mb-4">
                Ingin mengajukan pengembalian barang?
              </h3>
              <p className="text-[17px] font-normal leading-[1.47] text-[#7a7a7a] mb-6">
                Hubungi tim customer service kami dan kami akan bantu proses pengajuannya.
              </p>
              <Button asChild variant="primary">
                <Link href="/contact">Hubungi Customer Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Related Links — parchment tile */}
      <section className="w-full px-6 py-[80px] bg-[#f5f5f7]">
        <div className="mx-auto max-w-[980px]">
          <div className="text-center mb-12">
            <h2 className="text-[34px] font-semibold leading-[1.1] text-[#1d1d1f]">
              Dokumen Legal Lainnya
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-[800px] mx-auto">
            {[
              {
                title: "Syarat & Ketentuan",
                desc: "Ketentuan penggunaan platform GeekyTech.",
                href: "/syarat-ketentuan",
              },
              {
                title: "Kebijakan Privasi",
                desc: "Bagaimana kami menggunakan dan melindungi data pribadi Anda.",
                href: "/kebijakan-privasi",
              },
              {
                title: "Hubungi Kami",
                desc: "Ada pertanyaan? Hubungi tim support kami sekarang.",
                href: "/contact",
              },
            ].map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 hover:border-[#EA5329] transition-colors"
              >
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                  {link.title}
                </h3>
                <p className="text-[14px] text-[#7a7a7a]">
                  {link.desc}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
