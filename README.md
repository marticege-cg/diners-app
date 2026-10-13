# Diners

PWA de finances personals (React + Tailwind + components estil shadcn/ui + Recharts) amb dades a Supabase.

- `app/` — codi font (Vite). `cd app && npm i && npm run build` compila directament a l'arrel del repo.
- Arrel del repo — build publicat a GitHub Pages (`index.html`, `assets/`, `sw.js`, `manifest.webmanifest`, icones).
- Seguretat: només el propietari pot llegir/escriure (RLS `is_owner()`). La clau *publishable* és pública per disseny.
