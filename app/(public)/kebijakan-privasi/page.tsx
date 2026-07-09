import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getWhatsappCs } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for GeekyTech. Learn how we collect, use, and protect your personal data.",
};

export default async function KebijakanPrivasiPage() {
  const whatsappCs = await getWhatsappCs();

  const sections = [
    {
      title: "1. Pendahuluan",
      content: [
        "GeekyTech ('kami', 'Platform', atau 'Perusahaan') berkomitmen untuk melindungi privasi dan data pribadi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.",
        "Dengan menggunakan platform GeekyTech, Anda menyetujui praktik privasi yang dijelaskan dalam kebijakan ini. Jika Anda tidak setuju dengan kebijakan kami, mohon jangan menggunakan layanan kami.",
      ],
    },
    {
      title: "2. Data Pribadi yang Kami Kumpulkan",
      content: [
        "Kami mengumpulkan informasi pribadi yang Anda berikan secara langsung, termasuk: nama lengkap, alamat email, nomor telepon, dan alamat pengiriman.",
        "Data transaksi yang dikumpulkan meliputi: riwayat pembelian, metode pembayaran (tanpa menyimpan nomor kartu), jumlah pembelian, tanggal transaksi, dan riwayat pesanan.",
        "Data perilaku pengguna yang kami kumpulkan melalui teknologi pelacakan termasuk: log akses, perangkat yang digunakan, browser, sistem operasi, alamat IP, dan halaman yang dikunjungi.",
        "Kami juga mengumpulkan komunikasi Anda: pesan customer service, pertanyaan produk, keluhan, dan feedback yang Anda kirimkan.",
      ],
    },
    {
      title: "3. Cara Kami Menggunakan Data Pribadi Anda",
      content: [
        "Kami menggunakan data pribadi Anda untuk memproses pesanan, mengirim produk, dan mengelola transaksi Anda.",
        "Data digunakan untuk memberikan dukungan pelanggan melalui WhatsApp, email, atau form kontak untuk menjawab pertanyaan dan menyelesaikan masalah.",
        "Kami mengirimkan notifikasi pesanan, konfirmasi pembayaran, status pengiriman, dan pembaruan penting lainnya melalui email atau SMS.",
        "Data dianalisis untuk meningkatkan layanan, mengoptimalkan pengalaman pengguna, dan mengembangkan fitur baru platform.",
        "Kami menggunakan data untuk keperluan keamanan, pencegahan fraud, dan penegakan kebijakan platform.",
        "Dengan persetujuan Anda, kami dapat mengirimkan promosi, penawaran khusus, dan berita tentang produk terbaru.",
      ],
    },
    {
      title: "4. Bagaimana Kami Melindungi Data Pribadi Anda",
      content: [
        "Platform GeekyTech menggunakan enkripsi SSL (Secure Socket Layer) untuk melindungi data yang ditransmisikan antara perangkat Anda dan server kami.",
        "Semua data sensitif disimpan dalam database yang aman dengan kontrol akses terbatas. Hanya karyawan yang berwenang yang dapat mengakses data pribadi Anda.",
        "Kami mengimplementasikan protokol keamanan berlapis (multi-layer security) termasuk firewall, intrusion detection, dan monitoring berkelanjutan.",
        "Password akun Anda di-hash menggunakan algoritma enkripsi modern dan tidak disimpan dalam bentuk plaintext.",
        "Kami secara berkala melakukan audit keamanan dan penetration testing untuk mengidentifikasi dan mengatasi potensi kerentanan.",
      ],
    },
    {
      title: "5. Lama Penyimpanan Data",
      content: [
        "Data akun pengguna disimpan selama akun aktif dan hingga 1 tahun setelah akun dihapus, untuk keperluan audit dan compliance.",
        "Data transaksi dan pesanan disimpan minimal 7 tahun sesuai dengan regulasi pajak dan kepatuhan keuangan yang berlaku.",
        "Data komunikasi customer service disimpan minimal 2 tahun untuk referensi dan penyelesaian masalah.",
        "Anda dapat meminta penghapusan data pribadi Anda kapan saja dengan menghubungi customer service kami, kecuali data diperlukan untuk keperluan legal atau transaksi yang belum selesai.",
        "Log aktivitas dan cookie tracking dihapus setelah 90 hari, kecuali Anda telah memberikan persetujuan untuk penyimpanan jangka panjang.",
      ],
    },
    {
      title: "6. Hak-Hak Privasi Anda",
      content: [
        "Anda memiliki hak untuk mengakses, mengoreksi, atau menghapus data pribadi yang kami simpan tentang Anda.",
        "Anda dapat menarik persetujuan untuk pengumpulan data atau penggunaan data kapan saja, meski hal ini mungkin mempengaruhi kemampuan kami memberikan layanan.",
        "Anda berhak untuk mengetahui data apa yang kami kumpulkan, bagaimana kami menggunakannya, dan kepada pihak mana kami membagikannya.",
        "Anda dapat meminta kami untuk membatasi pemrosesan data pribadi Anda dalam keadaan-keadaan tertentu.",
        "Anda berhak untuk membatalkan langganan dari komunikasi pemasaran kami kapan saja dengan mengklik link 'unsubscribe' di email atau melalui pengaturan akun.",
      ],
    },
    {
      title: "7. Cookies dan Teknologi Pelacakan",
      content: [
        "Platform GeekyTech menggunakan cookies untuk meningkatkan pengalaman pengguna, menyimpan preferensi, dan menganalisis perilaku pengguna.",
        "Cookies yang kami gunakan adalah: essential cookies (untuk fungsionalitas dasar), preference cookies (untuk menyimpan pengaturan), analytics cookies (Google Analytics untuk mengukur kinerja), dan marketing cookies (untuk personalisasi iklan).",
        "Anda dapat mengatur browser Anda untuk menolak cookies atau memberikan notifikasi ketika cookies akan disimpan. Namun, beberapa fitur platform mungkin tidak berfungsi dengan baik jika Anda menonaktifkan cookies.",
        "Kami tidak menjual cookie tracking data Anda kepada pihak ketiga, tetapi data dapat dibagikan dengan analytics partners untuk keperluan peningkatan layanan.",
        "Pixel tracking dan web beacons digunakan untuk mengukur efektivitas kampanye email dan membaca artikel.",
      ],
    },
    {
      title: "8. Pembagian Data dengan Pihak Ketiga",
      content: [
        "Kami TIDAK menjual atau membagikan data pribadi Anda kepada pihak ketiga untuk keperluan pemasaran tanpa persetujuan eksplisit Anda.",
        "Data dapat dibagikan dengan mitra layanan kami yang diperlukan untuk memproses transaksi Anda, termasuk: payment gateway (Midtrans), penyedia pengiriman (Biteship, JNE, TIKI, Pos Indonesia), dan penyedia email (Resend).",
        "Partner-partner ini memiliki komitmen privasi serupa dan hanya menggunakan data untuk tujuan yang telah ditentukan.",
        "Kami dapat membagikan data jika diwajibkan oleh hukum, keputusan pengadilan, atau peraturan pemerintah.",
        "Data dapat dibagikan dengan ahli hukum kami untuk keperluan perlindungan legal dan penegakan hak-hak GeekyTech.",
        "Dalam hal akuisisi, merger, atau penjualan aset, data pribadi Anda mungkin akan ditransfer sebagai bagian dari transaksi bisnis.",
      ],
    },
    {
      title: "9. Privasi Anak-Anak",
      content: [
        "Platform GeekyTech tidak ditujukan untuk anak-anak di bawah 13 tahun. Kami tidak sengaja mengumpulkan data pribadi dari anak-anak di bawah 13 tahun.",
        "Jika kami mengetahui bahwa kami telah mengumpulkan data pribadi dari anak di bawah 13 tahun tanpa persetujuan orang tua, kami akan menghapus data tersebut segera.",
        "Anak-anak berusia 13-18 tahun hanya dapat menggunakan platform dengan persetujuan dan pengawasan orang tua atau wali mereka.",
        "Jika Anda mengetahui bahwa anak di bawah 13 tahun telah memberikan informasi pribadi kepada kami, silakan hubungi customer service kami segera.",
      ],
    },
    {
      title: "10. Tautan ke Situs Pihak Ketiga",
      content: [
        "Platform GeekyTech mungkin berisi tautan ke situs web atau layanan pihak ketiga yang tidak berada di bawah kontrol kami.",
        "Kebijakan privasi ini hanya berlaku untuk platform GeekyTech. Kami tidak bertanggung jawab atas praktik privasi situs web pihak ketiga.",
        "Kami sarankan Anda membaca kebijakan privasi pihak ketiga sebelum memberikan data pribadi kepada mereka.",
      ],
    },
    {
      title: "11. Perubahan Kebijakan Privasi",
      content: [
        "GeekyTech berhak untuk mengubah kebijakan privasi ini kapan saja. Perubahan akan berlaku sejak tanggal yang ditentukan di halaman ini.",
        "Jika ada perubahan signifikan yang mempengaruhi hak privasi Anda, kami akan memberitahu Anda melalui email atau notifikasi di platform.",
        "Penggunaan berkelanjutan platform setelah perubahan berarti Anda menerima kebijakan privasi yang baru.",
      ],
    },
    {
      title: "12. Hubungi Kami",
      content: [
        "Jika Anda memiliki pertanyaan, kekhawatiran, atau permintaan terkait privasi data Anda, silakan hubungi kami melalui:",
        "Email: support@geeky.id",
        `WhatsApp: ${whatsappCs ? `+${whatsappCs}` : "Belum diatur"}`,
        "Jam operasional: Senin - Minggu, 09:00 - 21:00",
        "Kami akan merespons pertanyaan privasi Anda dalam waktu 7 hari kerja.",
      ],
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero — light tile */}
      <section className="w-full px-6 py-20 md:py-[80px] text-center bg-white">
        <div className="mx-auto max-w-[980px]">
          <p className="text-[14px] font-semibold text-[#EA5329] mb-4">
            Legal
          </p>
          <h1 className="text-[28px] sm:text-[40px] lg:text-[56px] font-semibold leading-[1.07] text-[#1d1d1f] mb-6">
            Kebijakan Privasi
          </h1>
          <p className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto mb-8">
            Kami menghormati privasi Anda. Baca bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda.
          </p>
          <p className="text-[14px] text-[#7a7a7a][#cccccc]">
            Terakhir diperbarui: 13 Mei 2026
          </p>
        </div>
      </section>

      {/* Content — light tile */}
      <section className="w-full px-6 pb-[80px] bg-white">
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
                Ada pertanyaan tentang kebijakan privasi kami?
              </h3>
              <p className="text-[17px] font-normal leading-[1.47] text-[#7a7a7a][#cccccc] mb-6">
                Hubungi tim customer service kami dan kami akan membantu menjawab pertanyaanmu.
              </p>
              <Button asChild variant="primary">
                <Link href="/about">Hubungi Customer Service</Link>
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
                title: "Syarat & Ketentuan",
                desc: "Ketentuan penggunaan platform GeekyTech.",
                href: "/syarat-ketentuan",
              },
              {
                title: "Kebijakan Pengembalian",
                desc: "Proses pengembalian barang dan penukaran produk.",
                href: "/kebijakan-pengembalian",
              },
              {
                title: "Hubungi Kami",
                desc: "Ada pertanyaan? Hubungi tim support kami sekarang.",
                href: "/about",
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
