/**
 * Bersihkan teks pencarian sebelum disisipkan ke filter PostgREST `.or()`.
 * Karakter , ( ) memisah/menyusun kondisi — tanpa dibersihkan, input seperti
 * "x,role.eq.admin" bisa menambah kondisi filter sendiri.
 */
export function sanitizeFilterTerm(term: string): string {
  return term.replace(/[,()\\*"':%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}
