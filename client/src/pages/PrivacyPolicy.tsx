import { Header } from "@/components/Header";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 mobile-feed-padding">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors" data-testid="link-back">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </span>
        </Link>

        <div className="bg-card rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Kebijakan Privasi</h1>
              <p className="text-xs text-muted-foreground">Terakhir diperbarui: Februari 2026</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">1. Informasi yang Kami Kumpulkan</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CTRXL48 mengumpulkan informasi berikut saat Anda menggunakan layanan kami:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Alamat email (untuk verifikasi akun dan keamanan)</li>
                <li>Username dan kata sandi (disimpan dalam bentuk terenkripsi)</li>
                <li>Konten yang Anda buat (postingan, komentar, vote)</li>
                <li>Foto profil dan banner yang Anda unggah</li>
                <li>Aktivitas di platform (interaksi, preferensi)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">2. Penggunaan Informasi</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Informasi yang kami kumpulkan digunakan untuk:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Menyediakan dan memelihara layanan forum</li>
                <li>Mengelola akun pengguna dan keamanan</li>
                <li>Menghitung skor reputasi dan karma</li>
                <li>Menampilkan konten yang relevan di feed</li>
                <li>Memproses transaksi pembayaran (Premium, Verified, Tips)</li>
                <li>Mengirim notifikasi terkait aktivitas akun</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">3. Penyimpanan Data</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Data Anda disimpan dengan aman di server kami. Postingan akan otomatis dihapus setelah 48 jam (atau 7 hari untuk pengguna Premium). Gambar yang diunggah disimpan di layanan cloud storage yang aman.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">4. Keamanan</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami menggunakan langkah-langkah keamanan berikut:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Enkripsi kata sandi menggunakan bcrypt</li>
                <li>Sesi aman dengan cookie terenkripsi</li>
                <li>Verifikasi email dengan kode OTP</li>
                <li>Pembatasan rate pada API untuk mencegah penyalahgunaan</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">5. Berbagi Informasi</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami tidak menjual atau membagikan informasi pribadi Anda kepada pihak ketiga, kecuali dalam kasus berikut:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Diperlukan oleh hukum atau perintah pengadilan</li>
                <li>Untuk memproses pembayaran melalui penyedia layanan pembayaran kami (bayar.gg)</li>
                <li>Untuk melindungi hak dan keamanan pengguna lain</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">6. Hak Pengguna</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Anda memiliki hak untuk:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Mengakses dan mengubah informasi profil Anda</li>
                <li>Menghapus postingan dan komentar Anda</li>
                <li>Meminta penghapusan akun dengan menghubungi admin</li>
                <li>Menolak pengiriman notifikasi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">7. Perubahan Kebijakan</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami berhak memperbarui kebijakan privasi ini sewaktu-waktu. Perubahan akan diumumkan melalui platform dan berlaku efektif setelah dipublikasikan.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
