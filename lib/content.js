// Chargement de toutes les données du site (dossier content/ et theme/).
// Utilisé par Eleventy (src/_data/tgv.js) et par la validation (scripts/check.js).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENU = path.join(RACINE, "content");
export const MEDIAS = path.join(RACINE, "media");

export const FICHIER_SPECTACLE = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
export const FICHIER_LIEU = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

/** Date du jour à Vétroz, format AAAA-MM-JJ. */
export function aujourdhui() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());
}

export function lireJson(fichier) {
  const brut = fs.readFileSync(fichier, "utf8").replace(/^﻿/, "");
  try {
    return JSON.parse(brut);
  } catch (e) {
    const err = new Error(`${path.relative(RACINE, fichier)} : JSON invalide — ${e.message}`);
    err.fichier = fichier;
    throw err;
  }
}

function listerJson(dossier) {
  if (!fs.existsSync(dossier)) return [];
  return fs.readdirSync(dossier).filter((f) => f.endsWith(".json")).sort();
}

/** Liste des fichiers à valider, avec le schéma correspondant. */
export function fichiersAValider() {
  const liste = [
    { fichier: path.join(CONTENU, "site.json"), schema: "site.schema.json" },
    { fichier: path.join(CONTENU, "apropos.json"), schema: "apropos.schema.json" },
    { fichier: path.join(CONTENU, "historique.json"), schema: "page.schema.json" },
    { fichier: path.join(CONTENU, "atelier.json"), schema: "atelier.schema.json" },
    { fichier: path.join(CONTENU, "redirections.json"), schema: "redirections.schema.json" },
    { fichier: path.join(RACINE, "theme", "theme.json"), schema: "theme.schema.json" },
  ];
  for (const f of listerJson(path.join(CONTENU, "lieux")))
    liste.push({ fichier: path.join(CONTENU, "lieux", f), schema: "lieu.schema.json" });
  for (const f of listerJson(path.join(CONTENU, "spectacles")))
    liste.push({ fichier: path.join(CONTENU, "spectacles", f), schema: "spectacle.schema.json" });
  return liste;
}

function trierDates(dates = []) {
  return [...dates].sort((a, b) => (a.date + (a.heure || "")).localeCompare(b.date + (b.heure || "")));
}

/** Charge et enrichit toutes les données. */
export function chargerTout({ jour = aujourdhui() } = {}) {
  const site = lireJson(path.join(CONTENU, "site.json"));
  const apropos = lireJson(path.join(CONTENU, "apropos.json"));
  const historique = lireJson(path.join(CONTENU, "historique.json"));
  const atelier = lireJson(path.join(CONTENU, "atelier.json"));
  const redirections = lireJson(path.join(CONTENU, "redirections.json")).redirections || [];
  const theme = lireJson(path.join(RACINE, "theme", "theme.json"));

  const lieux = {};
  for (const f of listerJson(path.join(CONTENU, "lieux"))) {
    const m = f.match(FICHIER_LIEU);
    if (!m) continue;
    const id = m[1];
    lieux[id] = { ...lireJson(path.join(CONTENU, "lieux", f)), id, url: `/lieux/${id}/` };
  }

  const spectacles = [];
  for (const f of listerJson(path.join(CONTENU, "spectacles"))) {
    const m = f.match(FICHIER_SPECTACLE);
    if (!m) continue;
    const donnees = lireJson(path.join(CONTENU, "spectacles", f));
    if (donnees.brouillon) continue;
    const slug = f.replace(/\.json$/, "");
    const dates = trierDates(donnees.dates).map((d) => ({ ...d, passee: d.date < jour }));
    const aVenir = dates.filter((d) => !d.passee);
    spectacles.push({
      ...donnees,
      slug,
      url: `/spectacles/${slug}/`,
      dates,
      premiereDate: dates[0]?.date || null,
      derniereDate: dates.at(-1)?.date || null,
      prochaineDate: aVenir[0] || null,
      lieu: donnees.lieu ? lieux[donnees.lieu] || null : null,
      aLAffiche: donnees.aLAffiche === true || aVenir.length > 0,
    });
  }
  // Du plus récent au plus ancien.
  spectacles.sort((a, b) => b.annee - a.annee || (b.premiereDate || "").localeCompare(a.premiereDate || "") || a.titre.localeCompare(b.titre, "fr"));

  const aLAffiche = spectacles
    .filter((s) => s.aLAffiche)
    .sort((a, b) => (a.prochaineDate?.date || a.premiereDate || `${a.annee}-99`).localeCompare(b.prochaineDate?.date || b.premiereDate || `${b.annee}-99`));

  const parAnnee = [];
  for (const s of spectacles) {
    let groupe = parAnnee.at(-1);
    if (!groupe || groupe.annee !== s.annee) parAnnee.push((groupe = { annee: s.annee, spectacles: [] }));
    groupe.spectacles.push(s);
  }

  return {
    site, apropos, historique, atelier, redirections, theme,
    lieux, listeLieux: Object.values(lieux).sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    spectacles, aLAffiche, parAnnee, jour,
  };
}
