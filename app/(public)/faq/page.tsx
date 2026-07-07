import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { Button } from "@/components/ui/button";
import { getWhatsappCs } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "FAQ - Pertanyaan Umum",
  description:
    "Jawaban atas pertanyaan umum tentang GeekyTech. Temukan solusi cepat untuk pertanyaanmu.",
};

export default async function FAQPage() {
  const whatsappCs = await getWhatsappCs();
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
            `Hubungi kami melalui:\n- WhatsApp: ${waLine}\n- Email: support@geeky.id\n- Form kontak: /contact\nJam operasional: Senin - Minggu, 09:00 - 21:00`,
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
            Bantuan & Dukungan
          </p>
          <h1 className="text-[28px] sm:text-[40px] lg:text-[56px] font-semibold leading-[1.07] text-[#1d1d1f] mb-6">
            Pertanyaan yang<br className="hidden sm:block" /> sering diajukan
          </h1>
          <p className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto">
            Temukan jawaban cepat untuk pertanyaanmu. Jika tidak ketemu, hubungi tim support kami.
          </p>
        </div>
      </section>

      {/* FAQ Categories — alternating tiles */}
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

      {/* CTA — dark tile */}
      <section className="w-full px-6 py-[80px] bg-[#272729]">
        <div className="mx-auto max-w-[980px] text-center">
          <p className="text-[14px] font-semibold text-[#FFAD88] mb-4">
            Tidak menemukan jawaban?
          </p>
          <h2 className="text-[34px] font-semibold leading-[1.1] text-white mb-6">
            Tim kami siap membantu
          </h2>
          <p className="text-[17px] font-normal leading-[1.47] text-[#cccccc] max-w-[600px] mx-auto mb-8">
            Hubungi customer service kami melalui WhatsApp, email, atau form kontak. Kami akan merespon dalam waktu singkat.
          </p>
          <Button asChild variant="primary">
            <Link href="/contact">Hubungi Support</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
