import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

export default function AboutPage() {
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
              <Link href="/contact">Hubungi Kami</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
