// Configuration Eleventy — voir CLAUDE.md pour la structure du projet.
import path from "node:path";
import Image from "@11ty/eleventy-img";
import { HtmlBasePlugin } from "@11ty/eleventy";
import { MEDIAS } from "./lib/content.js";
import { genererIcones } from "./lib/icones.js";
import { rendreHtml, texteBrut } from "./lib/html.js";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function decouperDate(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return { a, m, j, jour: JOURS[new Date(Date.UTC(a, m - 1, j)).getUTCDay()] };
}

const OPTIONS_IMAGES = { formats: ["webp", "jpeg"], outputDir: "_site/img/", urlPath: "/img/", sharpJpegOptions: { quality: 80, mozjpeg: true }, sharpWebpOptions: { quality: 78 } };

export default function (config) {
  // Applique le préfixe d'URL (PATH_PREFIX) à tous les liens du HTML généré.
  config.addPlugin(HtmlBasePlugin);

  config.addWatchTarget("content/");
  config.addWatchTarget("theme/");
  config.addWatchTarget("media/");
  config.addWatchTarget("lib/");

  config.addPassthroughCopy({ "src/css": "css" });
  config.addPassthroughCopy({ "theme/fonts/*.woff2": "fonts" });
  config.addPassthroughCopy("media/**/*.pdf"); // → _site/media/…

  // Logo coloré selon le thème, favicon, icône téléphone, image de partage par défaut.
  config.on("eleventy.before", async () => {
    await genererIcones("_site/assets");
  });

  // --- Filtres -------------------------------------------------------------
  config.addFilter("html", (texte) => rendreHtml(texte));
  config.addFilter("texteBrut", (texte, max) => texteBrut(texte, max));
  config.addFilter("dateLongue", (iso, heure) => {
    const { a, m, j, jour } = decouperDate(iso);
    return `${jour} ${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}${heure ? ` à ${heure.replace(":", "h")}` : ""}`;
  });
  config.addFilter("dateCourte", (iso) => {
    const { m, j, jour } = decouperDate(iso);
    return `${jour.slice(0, 3)}. ${j} ${MOIS[m - 1]}`;
  });
  config.addFilter("telLien", (tel) => "tel:" + tel.replace(/\s+/g, ""));
  config.addFilter("jsonLd", (obj) => JSON.stringify(obj).replace(/</g, "\\u003c"));
  config.addFilter("categorieLibelle", (c) => ({ adulte: "Théâtre", enfant: "Jeune public", jeunesse: "Atelier jeunesse", evenement: "Événement" })[c] || c);
  config.addFilter("absolue", (url, base) => new URL(url, base).href);

  // Résumé des dates d'un spectacle : « 12 – 27 février 2027 » ou la période.
  config.addFilter("resumeDates", (s) => {
    if (!s.dates?.length) return s.periode || "";
    const d1 = decouperDate(s.dates[0].date);
    const d2 = decouperDate(s.dates.at(-1).date);
    if (s.dates.length === 1) return `${d1.j} ${MOIS[d1.m - 1]} ${d1.a}`;
    if (d1.a === d2.a && d1.m === d2.m) return `${d1.j} – ${d2.j} ${MOIS[d1.m - 1]} ${d1.a}`;
    if (d1.a === d2.a) return `${d1.j} ${MOIS[d1.m - 1]} – ${d2.j} ${MOIS[d2.m - 1]} ${d1.a}`;
    return `${d1.j} ${MOIS[d1.m - 1]} ${d1.a} – ${d2.j} ${MOIS[d2.m - 1]} ${d2.a}`;
  });

  // --- Images (redimensionnées et converties au build) ----------------------
  // {% image fichier, alt, sizes, [largeurs], "eager" %}
  config.addAsyncShortcode("image", async (fichier, alt, sizes = "100vw", largeurs = [400, 800, 1200], chargement = "lazy") => {
    // eleventy-img n'agrandit jamais une image plus petite que la largeur demandée.
    const meta = await Image(path.join(MEDIAS, fichier), { ...OPTIONS_IMAGES, widths: largeurs });
    return Image.generateHTML(meta, { alt, sizes, loading: chargement, decoding: "async" });
  });
  // URL d'une version 1200 px en JPEG (partage Facebook / Open Graph).
  config.addAsyncShortcode("imagePartage", async (fichier, base) => {
    const meta = await Image(path.join(MEDIAS, fichier), { ...OPTIONS_IMAGES, formats: ["jpeg"], widths: [1200] });
    return new URL(meta.jpeg[0].url, base).href;
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    // Préfixe d'URL (ex. /website/ sur theatredelagrappe-collab.github.io avant le passage au domaine).
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
