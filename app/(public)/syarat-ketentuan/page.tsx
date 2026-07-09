import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { Button } from "@/components/ui/button";
import { getWhatsappCs } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan platform GeekyTech. Harap baca dengan seksama sebelum melakukan pembelian.",
};

export default async function SyaratKetentuanPage() {
  const whatsappCs = await getWhatsappCs();

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
        "Ketentuan lengkap mengenai syarat, cara pengajuan, dan estimasi waktu pengembalian dana dijelaskan secara rinci di halaman Kebijakan Pengembalian.",
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
        "Email: support@geeky.id",
        `WhatsApp: ${whatsappCs ? `+${whatsappCs}` : "Belum diatur"}`,
        "Jam operasional: Senin - Minggu, 09:00 - 21:00",
      ],
    },
  ];

  const waLine = whatsappCs ? `+${whatsappCs}` : "Belum diatur";

  const faqCategories = [
    {
      category: "Tentang GeekyTech",
      questions: [
        {
          id: "about-1",
          question: "Apa itu GeekyTech?",
          answer:
            "GeekyTech adalah platform e-commerce terpercaya yang menjual produk teknologi dan gadget original bergaransi resmi. Kami berkomitmen untuk memberikan pengalaman belanja yang aman, cepat, dan terpercaya dengan harga yang kompetitif.",
        },
        {
          id: "about-2",
          question: "Apakah semua produk GeekyTech original?",
          answer:
            "Ya, 100% produk yang kami jual adalah barang original bergaransi resmi dari distributor resmi. Kami tidak menjual produk palsu atau refurbish tanpa transparansi penuh.",
        },
        {
          id: "about-3",
          question: "Berapa lama GeekyTech beroperasi?",
          answer:
            "GeekyTech dimulai dari perjalanan di Tokopedia dan telah melayani lebih dari 3.500 pelanggan dengan 23.000+ transaksi yang berhasil diselesaikan. Kami terus berkembang untuk memberikan layanan terbaik.",
        },
      ],
    },
    {
      category: "Produk & Harga",
      questions: [
        {
          id: "product-1",
          question: "Bagaimana cara mencari produk yang saya inginkan?",
          answer:
            "Anda bisa menggunakan fitur pencarian di halaman utama atau menjelajahi kategori produk. Kami juga memiliki filter harga dan brand untuk memudahkan pencarian Anda.",
        },
        {
          id: "product-2",
          question: "Apakah harga produk bisa berubah?",
          answer:
            "Ya, harga produk dapat berubah kapan saja sesuai dengan kondisi pasar. Harga yang berlaku adalah harga yang tertera saat Anda melakukan checkout. Kami akan memberitahu jika ada perubahan harga signifikan.",
        },
        {
          id: "product-3",
          question: "Apakah ada diskon atau promo khusus?",
          answer:
            "Ya, kami secara berkala menawarkan promo menarik seperti flash sale, diskon kategori, dan voucher eksklusif. Ikuti media sosial kami untuk mendapatkan penawaran terbaru.",
        },
        {
          id: "product-4",
          question: "Bagaimana jika produk yang saya incar sedang kosong stok?",
          answer:
            "Jika produk kosong, Anda bisa mendaftar untuk notifikasi restock. Kami akan memberitahu Anda melalui email ketika produk kembali tersedia.",
        },
      ],
    },
    {
      category: "Pemesanan & Pembayaran",
      questions: [
        {
          id: "order-1",
          question: "Bagaimana cara melakukan pemesanan?",
          answer:
            "1. Pilih produk yang diinginkan dan klik 'Beli'\n2. Masukkan alamat pengiriman\n3. Pilih metode pembayaran\n4. Lakukan pembayaran\n5. Selesai! Anda akan menerima konfirmasi pesanan.",
        },
        {
          id: "order-2",
          question: "Metode pembayaran apa saja yang tersedia?",
          answer:
            "Kami menerima: transfer bank, kartu kredit, debit, e-wallet (OVO, DANA, GoPay, LinkAja), dan cicilan tanpa bunga via beberapa bank partner. Pilih metode yang paling nyaman untuk Anda.",
        },
        {
          id: "order-3",
          question: "Berapa lama waktu untuk membayar pesanan?",
          answer:
            "Anda memiliki waktu 3 jam untuk melakukan pembayaran setelah pesanan dibuat. Jika belum membayar dalam waktu tersebut, pesanan akan otomatis dibatalkan dan Anda bisa membuat pesanan baru.",
        },
        {
          id: "order-4",
          question: "Apakah bisa mengubah pesanan setelah dibuat?",
          answer:
            "Jika pesanan belum dibayar, Anda bisa membatalkannya dan membuat pesanan baru dengan produk atau jumlah yang berbeda. Jika sudah dibayar, hubungi customer service kami untuk bantuan lebih lanjut.",
        },
        {
          id: "order-5",
          question: "Apakah bisa membeli cicilan?",
          answer:
            "Ya, untuk pembelian tertentu Anda bisa menggunakan cicilan 0% melalui kartu kredit bank partner kami. Pilihan cicilan akan muncul saat checkout jika produk memenuhi persyaratan.",
        },
      ],
    },
    {
      category: "Pengiriman",
      questions: [
        {
          id: "shipping-1",
          question: "Berapa lama waktu pengiriman?",
          answer:
            "Estimasi pengiriman untuk Jakarta adalah 1-2 hari kerja, sedangkan untuk luar Jakarta adalah 2-4 hari kerja. Waktu ini bisa bertambah jika ada kondisi cuaca ekstrem atau bencana alam.",
        },
        {
          id: "shipping-2",
          question: "Apakah ada biaya pengiriman tambahan?",
          answer:
            "Biaya pengiriman sudah termasuk dalam harga total yang ditampilkan saat checkout. Tidak ada biaya tambahan yang akan muncul kemudian. Tarif pengiriman bervariasi sesuai dengan berat paket dan lokasi tujuan.",
        },
        {
          id: "shipping-3",
          question: "Bagaimana cara melacak paket saya?",
          answer:
            "Setelah paket dikirim, Anda akan menerima nomor resi (AWB) melalui email dan SMS. Gunakan nomor resi tersebut untuk melacak paket Anda di website kurir atau di dashboard akun GeekyTech.",
        },
        {
          id: "shipping-4",
          question: "Apakah pengiriman tersedia ke seluruh Indonesia?",
          answer:
            "Ya, kami melayani pengiriman ke seluruh Indonesia melalui kurir terpercaya. Untuk lokasi tertentu yang sulit dijangkau, estimasi waktu pengiriman bisa lebih lama.",
        },
        {
          id: "shipping-5",
          question: "Apa yang harus saya lakukan jika paket hilang atau rusak?",
          answer:
            "Jika paket tidak sampai atau mengalami kerusakan, segera hubungi customer service kami dengan bukti foto atau video. Kami akan membantu mengajukan klaim ke kurir atau memberikan penggantian barang.",
        },
      ],
    },
    {
      category: "Pengembalian & Garansi",
      questions: [
        {
          id: "return-1",
          question: "Berapa lama waktu untuk retur barang?",
          answer:
            "Anda bisa melakukan retur gratis dalam waktu 7 hari setelah barang sampai, dengan syarat barang dalam kondisi original dan belum digunakan. Untuk kecacatan pabrik, retur bisa dilakukan kapan saja selama garansi masih berlaku.",
        },
        {
          id: "return-2",
          question: "Bagaimana proses pengembalian barang?",
          answer:
            "1. Hubungi customer service kami melalui WhatsApp atau email\n2. Lakukan verifikasi barang dengan mengirim foto\n3. Terima instruksi pengiriman retur (gratis)\n4. Kirim barang ke alamat retur kami\n5. Dana akan dikembalikan dalam 5-7 hari kerja setelah barang diterima",
        },
        {
          id: "return-3",
          question: "Apakah ada garansi untuk produk?",
          answer:
            "Semua produk GeekyTech dilengkapi dengan garansi resmi dari manufacturer sesuai dengan jenis produk. Garansi ini berlaku selama produk digunakan sesuai dengan panduan penggunaan.",
        },
        {
          id: "return-4",
          question: "Apa yang tidak termasuk dalam garansi?",
          answer:
            "Garansi tidak berlaku untuk: kerusakan akibat penyalahgunaan, jatuh atau benturan, kontak dengan cairan, modifikasi atau pembongkaran, dan kerusakan akibat penggunaan tidak sesuai panduan.",
        },
        {
          id: "return-5",
          question: "Bagaimana cara klaim garansi?",
          answer:
            "Hubungi customer service kami dengan bukti pembelian dan foto kerusakan. Kami akan membantu proses klaim garansi Anda ke pihak manufacturer dan memberikan alternatif solusi jika diperlukan.",
        },
      ],
    },
    {
      category: "Akun & Keamanan",
      questions: [
        {
          id: "account-1",
          question: "Apakah aman berbelanja di GeekyTech?",
          answer:
            "Ya, keamanan Anda adalah prioritas kami. Kami menggunakan enkripsi SSL dan sistem pembayaran yang aman. Data pribadi Anda dilindungi sesuai dengan standar keamanan internasional.",
        },
        {
          id: "account-2",
          question: "Bagaimana cara membuat akun GeekyTech?",
          answer:
            "Klik tombol 'Daftar' di halaman utama, masukkan email dan password, verifikasi email Anda, dan selesai. Anda bisa langsung melakukan pembelian atau menyimpan beberapa barang di wishlist.",
        },
        {
          id: "account-3",
          question: "Bagaimana jika saya lupa password?",
          answer:
            "Klik 'Lupa Password' di halaman login, masukkan email Anda, dan kami akan mengirim link reset password. Ikuti link tersebut untuk membuat password baru.",
        },
        {
          id: "account-4",
          question: "Apakah data pribadi saya aman?",
          answer:
            "Ya, kami tidak pernah membagikan data pribadi Anda kepada pihak ketiga tanpa izin. Data Anda hanya digunakan untuk keperluan transaksi, pengiriman, dan komunikasi berkaitan dengan pesanan Anda.",
        },
      ],
    },
    {
      category: "Lainnya",
      questions: [
        {
          id: "other-1",
          question: "Bagaimana cara menghubungi customer service?",
          answer:
            `Hubungi kami melalui:\n- WhatsApp: ${waLine}\n- Email: support@geeky.id\n- Form kontak: /about\nJam operasional: Senin - Minggu, 09:00 - 21:00`,
        },
        {
          id: "other-2",
          question: "Apakah ada program loyalitas atau poin reward?",
          answer:
            "Saat ini kami sedang mengembangkan program loyalitas. Daftarkan email Anda untuk mendapatkan notifikasi ketika program diluncurkan. Anda akan mendapatkan benefit eksklusif sebagai member setia.",
        },
        {
          id: "other-3",
          question: "Bisakah saya menjadi reseller GeekyTech?",
          answer:
            "Kami membuka kesempatan bagi reseller. Jika tertarik, hubungi tim business development kami melalui email support@geeky.id dengan subjek 'Reseller Program'.",
        },
        {
          id: "other-4",
          question: "Apakah GeekyTech punya toko fisik?",
          answer:
            "Saat ini GeekyTech beroperasi sebagai e-commerce online. Kami sedang mempertimbangkan untuk membuka showroom fisik di Jakarta. Follow media sosial kami untuk update terbaru.",
        },
      ],
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero — light tile */}
      <section className="w-full px-6 py-20 md:pt-[80px] md:pb-0 text-center bg-white">
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
                <Link href="/about">Hubungi Customer Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — pertanyaan yang sering diajukan, alternating tiles */}
      {faqCategories.map((cat, catIdx) => (
        <section
          key={cat.category}
          className={`w-full px-6 py-[80px] ${
            catIdx % 2 === 0
              ? "bg-white"
              : "bg-[#f5f5f7][#1a1a1a]"
          }`}
        >
          <div className="mx-auto max-w-[980px]">
            <div className="text-center mb-12">
              <h2 className="text-[34px] font-semibold leading-[1.1] text-[#1d1d1f]">
                {cat.category}
              </h2>
            </div>

            <div className="space-y-4 max-w-[800px] mx-auto">
              {cat.questions.map((question) => (
                <FaqAccordion
                  key={question.id}
                  id={question.id}
                  question={question.question}
                  answer={question.answer}
                  isDark={catIdx % 2 === 0}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

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
