## Ringkasan

<!-- Apa yang berubah dan kenapa -->

## Checklist rilis (merge ke `main` = deploy production)

- [ ] Entry baru di `RELEASES.web` (`lib/releaseNotes.ts`) dan `FEATURES.web` diperbarui bila perlu
- [ ] Versi di `package.json` dinaikkan dan sama dengan entry teratas (`npm test` hijau)
- [ ] Bila memengaruhi app mobile: dicatat di `RELEASES.mobile` (mis. "butuh backend web ≥ x.y.z")
- [ ] Bila ada migrasi SQL manual: disebut di release notes
