import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan platform GeekyTech. Harap baca dengan seksama sebelum melakukan pembelian.",
};

const sections = [
  {
    title: "1. Pengertian dan Definisi",
    content: [
      "GeekyTech adalah platform perdagangan elektronik (e-commerce) yang menyediakan layanan penjualan produk teknologi dan gadget original bergaransi.",
      "Pengguna adalah setiap individu yang mengakses, menjelajahi, atau melakukan transaksi di platform GeekyTech.",
      "Produk adalah barang teknologi dan gadget original yang dijual melalui platform GeekyTech dengan jaminan keaslian dan garansi resmi.",
    ],
  },
  {
    title: "2. Penggunaan Platform",
    content: [
      "Dengan mengakses dan menggunakan platform GeekyTech, Anda setuju untuk mematuhi syarat dan ketentuan ini secara penuh.",
      "Anda harus berusia minimal 18 tahun atau memiliki izin dari orang tua/wali untuk menggunakan layanan kami.",
      "Anda bertanggung jawab untuk menjaga kerahasiaan informasi akun Anda dan tidak boleh membagikan password kepada siapapun.",
      "Anda setuju untuk tidak menggunakan platform untuk aktivitas ilegal, merugikan, atau melanggar hak pihak ketiga.",
    ],
  },
  {
    title: "3. Produk dan Harga",
    content: [
      "Semua produk yang ditampilkan di platform GeekyTech adalah barang original dengan garansi resmi dari distributor resmi.",
      "Harga produk dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya. Harga yang berlaku adalah harga pada saat Anda melakukan checkout.",
      "Kami berhak untuk membatasi atau membatalkan pesanan jika ada kesalahan informasi produk atau harga.",
      "Stok produk terbatas dan tersedia sesuai dengan ketersediaan. Jika produk kosong, pesanan Anda akan dibatalkan dan dana dikembalikan penuh.",
    ],
  },
  {
    title: "4. Pemesanan dan Pembayaran",
    content: [
      "Untuk melakukan pembelian, Anda harus membuat akun dan mengisi formulir pesanan dengan informasi yang akurat dan lengkap.",
      "Pesanan dianggap sah setelah Anda menerima konfirmasi dari GeekyTech dan melakukan pembayaran sesuai dengan jumlah yang ditampilkan.",
      "Kami menerima berbagai metode pembayaran termasuk transfer bank, kartu kredit, e-wallet, dan cicilan tanpa bunga.",
      "Pembayaran harus dilakukan dalam waktu 3 jam setelah pesanan dibuat. Pesanan yang belum dibayar dalam waktu tersebut akan otomatis dibatalkan.",
    ],
  },
  {
    title: "5. Pengiriman dan Pengemasan",
    content: [
      "Pengiriman dilakukan oleh kurir terpercaya yang telah bekerja sama dengan GeekyTech. Produk akan dikemas dengan aman dan profesional.",
      "Estimasi waktu pengiriman untuk Jakarta adalah 1-2 hari kerja, sedangkan untuk luar Jakarta adalah 2-4 hari kerja tergantung lokasi.",
      "Anda akan menerima notifikasi dengan nomor resi pengiriman (AWB) melalui email dan SMS setelah paket dikirim.",
      "Kami tidak bertanggung jawab atas keterlambatan pengiriman yang disebabkan oleh kondisi cuaca ekstrem, bencana alam, atau kondisi luar biasa lainnya.",
      "Pengiriman dilakukan ke alamat yang Anda daftarkan saat checkout. Jika alamat tidak akurat, tanggung jawab ada pada pembeli.",
    ],
  },
  {
    title: "6. Penerimaan Barang",
    content: [
      "Saat menerima paket, mohon periksa kondisi kemasan dan isi paket sebelum menandatangani bukti pengiriman.",
      "Jika terdapat kerusakan atau barang tidak sesuai, segera hubungi customer service kami dalam waktu maksimal 24 jam.",
      "Barang dianggap diterima dengan baik jika penerima tidak melaporkan kerusakan atau ketidaksesuaian dalam waktu 24 jam setelah barang diterima.",
    ],
  },
  {
    title: "7. Pengembalian dan Penukaran",
    content: [
      "GeekyTech menyediakan kebijakan pengembalian gratis dalam waktu 7 hari setelah barang sampai, dengan syarat barang dalam kondisi original dan belum digunakan.",
      "Pengembalian karena kecacatan pabrik dapat dilakukan kapan saja selama garansi resmi masih berlaku.",
      "Untuk mengajukan pengembalian, hubungi customer service kami dan ikuti proses yang telah ditentukan.",
      "Biaya pengembalian ditanggung oleh GeekyTech jika pengembalian disebabkan oleh kecacatan pabrik atau barang tidak sesuai pesanan.",
      "Dana pengembalian akan diproses dalam waktu 5-7 hari kerja setelah barang retur diterima dan diverifikasi.",
    ],
  },
  {
    title: "8. Garansi Produk",
    content: [
      "Semua produk GeekyTech dilengkapi dengan garansi resmi dari distributor atau manufacturer sesuai dengan jenis produk.",
      "Garansi tidak berlaku jika produk digunakan tidak sesuai dengan panduan penggunaan atau mengalami kerusakan akibat penyalahgunaan.",
      "Untuk klaim garansi, hubungi customer service kami dan kami akan membantu proses garansi Anda ke pihak manufacturer.",
      "GeekyTech berhak menolak klaim garansi jika cacat merupakan hasil dari penggunaan yang tidak benar atau modifikasi.",
    ],
  },
  {
    title: "9. Pembatasan Tanggung Jawab",
    content: [
      "GeekyTech tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, atau konsekuensial yang mungkin timbul dari penggunaan platform atau produk kami.",
      "Tanggung jawab GeekyTech terbatas pada nilai produk yang dibeli melalui platform kami.",
      "GeekyTech tidak bertanggung jawab atas kehilangan atau kerusakan barang yang disebabkan oleh kesalahan pembeli dalam memberikan alamat atau data pribadi.",
    ],
  },
  {
    title: "10. Privasi dan Data Pribadi",
    content: [
      "GeekyTech menghormati privasi Anda dan berkomitmen untuk melindungi data pribadi Anda sesuai dengan undang-undang perlindungan data yang berlaku.",
      "Informasi pribadi Anda hanya akan digunakan untuk keperluan transaksi, pengiriman, dan komunikasi terkait pesanan Anda.",
      "Kami tidak akan membagikan data pribadi Anda kepada pihak ketiga tanpa izin dari Anda, kecuali diperlukan untuk proses pengiriman atau keperluan hukum.",
      "Untuk informasi lengkap tentang bagaimana kami menangani data Anda, silakan baca Kebijakan Privasi kami.",
    ],
  },
  {
    title: "11. Larangan dan Batasan",
    content: [
      "Anda tidak boleh menggunakan platform GeekyTech untuk tujuan yang ilegal, merugikan, atau melanggar hak pihak lain.",
      "Anda tidak boleh mengunggah atau mendistribusikan konten yang mengandung malware, virus, atau kode berbahaya lainnya.",
      "Anda tidak boleh melakukan aktivitas yang dapat mengganggu atau merusak keamanan platform GeekyTech.",
      "GeekyTech berhak untuk menangguhkan atau menutup akun Anda jika Anda melanggar syarat dan ketentuan ini.",
    ],
  },
  {
    title: "12. Perubahan Syarat dan Ketentuan",
    content: [
      "GeekyTech berhak untuk mengubah syarat dan ketentuan ini kapan saja tanpa pemberitahuan sebelumnya.",
      "Perubahan akan berlaku sejak tanggal yang ditentukan di halaman ini. Penggunaan berkelanjutan platform setelah perubahan berarti Anda menerima syarat dan ketentuan yang baru.",
      "Kami akan memberitahu Anda tentang perubahan signifikan melalui email atau notifikasi di platform kami.",
    ],
  },
  {
    title: "13. Hukum dan Yurisdiksi",
    content: [
      "Syarat dan ketentuan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di Republik Indonesia.",
      "Setiap sengketa yang timbul dari atau berkaitan dengan syarat dan ketentuan ini akan diselesaikan melalui jalur musyawarah terlebih dahulu.",
      "Jika musyawarah tidak berhasil, sengketa akan diselesaikan melalui pengadilan yang berwenang di Jakarta Selatan.",
    ],
  },
  {
    title: "14. Kontak Kami",
    content: [
      "Jika Anda memiliki pertanyaan tentang syarat dan ketentuan ini, silakan hubungi kami melalui:",
      "Email: support@geekytech.com",
      "WhatsApp: +62 812-3456-7890",
      "Jam operasional: Senin - Minggu, 09:00 - 21:00",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="bg-white">
      {/* Hero — light tile */}
      <section className="bg-red-500 w-full px-6 py-20 md:pt-[80px] md:pb-0 text-center bg-white">
        <div className="mx-auto max-w-[980px]">
          <p className="text-[14px] font-semibold text-[#EA5329] mb-4">
            Legal
          </p>
          <h1 className="text-[28px] sm:text-[40px] lg:text-[56px] font-semibold leading-[1.07] text-[#1d1d1f] mb-6">
            Syarat & Ketentuan
          </h1>
          <p className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto mb-8">
            Harap baca syarat dan ketentuan berikut dengan seksama sebelum melakukan transaksi di platform GeekyTech.
          </p>
          <p className="text-[14px] text-[#7a7a7a][#cccccc]">
            Terakhir diperbarui: 13 Mei 2026
          </p>
        </div>
      </section>

      {/* Content — light tile */}
      <section className="bg-blue-500 w-full px-6 bg-white">
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
                      className="text-[17px] font-normal leading-[1.47] text-[#1d1d1f][#cccccc]"
                    >
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {/* Final CTA */}
            <div className="mt-[80px] pt-[80px] border-t border-[#e0e0e0][#3a3a3a] text-center">
              <h3 className="text-[21px] font-semibold leading-[1.19] text-[#1d1d1f] mb-4">
                Ada pertanyaan tentang syarat dan ketentuan kami?
              </h3>
              <p className="text-[17px] font-normal leading-[1.47] text-[#7a7a7a][#cccccc] mb-6">
                Hubungi tim customer service kami dan kami akan membantu menjawab pertanyaanmu.
              </p>
              <Button asChild variant="primary">
                <Link href="/contact">Hubungi Customer Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Related Links — parchment tile */}
      <section className="w-full px-6 py-[80px] bg-[#f5f5f7][#1a1a1a]">
        <div className="mx-auto max-w-[980px]">
          <div className="text-center mb-12">
            <h2 className="text-[34px] font-semibold leading-[1.1] text-[#1d1d1f]">
              Dokumen Legal Lainnya
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-[800px] mx-auto">
            {[
              {
                title: "Kebijakan Privasi",
                desc: "Bagaimana kami menggunakan dan melindungi data pribadi Anda.",
                href: "/kebijakan-privasi",
              },
              {
                title: "Kebijakan Pengembalian",
                desc: "Proses pengembalian barang dan penukaran produk.",
                href: "/kebijakan-pengembalian",
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
                className="bg-white[#272729] rounded-[18px] border border-[#e0e0e0][#3a3a3a] p-6 hover:border-[#EA5329][#FFAD88] transition-colors"
              >
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                  {link.title}
                </h3>
                <p className="text-[14px] text-[#7a7a7a][#cccccc]">
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
