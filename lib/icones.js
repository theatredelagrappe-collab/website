// Génère, à partir du logo vectoriel (Resources/logo_tgv.svg, en currentColor)
// et des couleurs du thème, les déclinaisons utilisées par le site.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { RACINE, lireJson } from "./content.js";

export async function genererIcones(dossierSortie) {
  const theme = lireJson(path.join(RACINE, "theme", "theme.json"));
  const c = theme.couleurs;
  const logo = fs.readFileSync(path.join(RACINE, "Resources", "logo_tgv.svg"), "utf8");
  const colorer = (couleur) => logo.replace(/currentColor/g, couleur);

  fs.mkdirSync(dossierSortie, { recursive: true });
  const ecrire = (nom, contenu) => fs.writeFileSync(path.join(dossierSortie, nom), contenu);

  ecrire("logo.svg", colorer(c.logo));
  ecrire("logo-pied.svg", colorer(c.piedDePageTexte || c.fond));
  ecrire("favicon.svg", colorer(c.accent));

  // Icône carrée pour les téléphones (180×180, fond du thème).
  const logoPng = (largeur, couleur) => sharp(Buffer.from(colorer(couleur)), { density: 600 }).resize({ width: largeur }).png().toBuffer();
  await sharp({ create: { width: 180, height: 180, channels: 4, background: c.fond } })
    .composite([{ input: await logoPng(140, c.logo), gravity: "center" }])
    .png()
    .toFile(path.join(dossierSortie, "apple-touch-icon.png"));

  // Image de partage par défaut (1200×630) pour Facebook et autres.
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: c.fond } })
    .composite([{ input: await logoPng(560, c.logo), gravity: "center" }])
    .jpeg({ quality: 85 })
    .toFile(path.join(dossierSortie, "partage.jpg"));
}
