import { Header } from "@/components/Header";
import { FileText, ArrowLeft, AlertTriangle, ThumbsDown, Skull, Lock, Clock, Crown } from "lucide-react";
import { Link } from "wouter";

export default function Terms() {
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
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Syarat & Ketentuan</h1>
              <p className="text-xs text-muted-foreground">Terakhir diperbarui: Februari 2026</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">1. Ketentuan Umum</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dengan menggunakan CTRXL48, Anda menyetujui semua syarat dan ketentuan yang berlaku di platform ini. CTRXL48 adalah forum diskusi dengan sistem chaos di mana postingan akan kedaluwarsa setelah periode tertentu dan reputasi pengguna mempengaruhi hak akses mereka.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                2. Kedaluwarsa Postingan
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Semua postingan memiliki batas waktu hidup:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li><strong>Pengguna biasa:</strong> Postingan otomatis dihapus setelah 48 jam</li>
                <li><strong>Pengguna Premium:</strong> Postingan bertahan hingga 7 hari</li>
                <li>Timer berwarna menunjukkan sisa waktu: hijau ({">"}24j), kuning (12-24j), oranye (6-12j), merah ({"<"}6j)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <ThumbsDown className="w-4 h-4 text-orange-500" />
                3. Sistem Skor & Voting
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CTRXL48 menggunakan sistem upvote/downvote yang mempengaruhi skor postingan dan reputasi pengguna:
              </p>
              <div className="mt-3 space-y-2">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-foreground mb-1">Skor Postingan Minus</p>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                    <li><strong>Skor &lt; -50:</strong> Postingan akan di-collapse (disembunyikan, bisa dibuka manual)</li>
                    <li><strong>Skor &lt; -200:</strong> Postingan disembunyikan sepenuhnya dari feed</li>
                    <li><strong>Skor &lt; -500:</strong> Postingan otomatis dikunci (tidak bisa dikomentari)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <Skull className="w-4 h-4 text-destructive" />
                4. Sistem Reputasi & Hukuman
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reputasi (karma) Anda menentukan status dan hak akses di platform:
              </p>
              <div className="mt-3 space-y-2">
                <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-3">
                  <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Konsekuensi Reputasi Negatif
                  </p>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                    <li><strong>Reputasi &lt; -100:</strong> Tidak bisa membuat postingan baru</li>
                    <li><strong>Reputasi &lt; -200:</strong> Akun otomatis di-shadow ban (postingan tidak terlihat oleh orang lain)</li>
                    <li><strong>Reputasi &lt; -300:</strong> Mendapat badge "MUSUH PUBLIK" yang terlihat di seluruh platform</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">5. Peraturan Postingan</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pengguna wajib mematuhi aturan berikut saat membuat konten:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Dilarang memposting konten ilegal, SARA, pornografi, atau kekerasan berlebihan</li>
                <li>Dilarang melakukan spam atau membuat postingan duplikat</li>
                <li>Dilarang menyebarkan informasi pribadi orang lain (doxxing)</li>
                <li>Dilarang menggunakan bot atau skrip otomatis</li>
                <li>Jeda minimal 30 detik antara postingan dan 10 detik antara komentar</li>
                <li>Konten yang melanggar dapat dihapus atau dikunci oleh admin</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">6. Fitur Anonim</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CTRXL48 menyediakan fitur anonim termasuk:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li><strong>Mode Confession:</strong> Posting tanpa menampilkan identitas (muncul sebagai "Anonim")</li>
                <li><strong>Whisper:</strong> Pesan anonim ke pengguna lain (dibatasi 1x per hari per penerima)</li>
                <li>Meskipun anonim, admin tetap dapat melihat penulis asli jika diperlukan untuk moderasi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                7. Layanan Premium & Pembayaran
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CTRXL48 menawarkan layanan berbayar melalui bayar.gg:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li><strong>Premium (Rp 25.000/30 hari):</strong> Postingan bertahan 7 hari, badge crown</li>
                <li><strong>Verified (Rp 50.000 sekali bayar):</strong> Badge centang biru</li>
                <li><strong>Username Premium:</strong> Username dengan efek glow khusus</li>
                <li><strong>Boost Post (Rp 5.000):</strong> Meningkatkan visibilitas postingan</li>
                <li><strong>Tip:</strong> Memberi tip ke pembuat konten (minimal Rp 1.000)</li>
                <li>Semua pembayaran bersifat final dan tidak dapat dikembalikan</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">8. Toko Karma</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pengguna dapat menukar karma untuk item spesial:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Custom Flair (50 karma)</li>
                <li>Pin Post 1 jam (100 karma)</li>
                <li>Double Vote (75 karma)</li>
                <li>Golden Border (150 karma)</li>
                <li>VIP Emoji (200 karma)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                9. Grup & Komunitas
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pengguna dapat membuat dan bergabung dengan grup komunitas. Owner dan moderator grup bertanggung jawab atas konten di dalam grup mereka. Grup privat hanya bisa diakses oleh anggota yang diundang.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">10. Pelanggaran & Sanksi</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Admin berhak mengambil tindakan terhadap pengguna yang melanggar aturan:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Penghapusan atau penguncian postingan</li>
                <li>Shadow ban (konten tidak terlihat oleh pengguna lain)</li>
                <li>Ban permanen dari platform</li>
                <li>Pengurangan reputasi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">11. Penolakan Tanggung Jawab</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CTRXL48 tidak bertanggung jawab atas konten yang dibuat oleh pengguna. Semua pendapat dan konten yang diposting adalah tanggung jawab masing-masing pengguna. Kami berusaha menjaga kualitas platform tetapi tidak menjamin bahwa semua konten sesuai dengan standar tertentu.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">12. Perubahan Syarat</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu. Dengan terus menggunakan platform setelah perubahan, Anda dianggap menyetujui syarat yang diperbarui.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
