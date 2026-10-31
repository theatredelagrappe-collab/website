#!/usr/bin/env node
// Validation complète des données avant génération : `npm run check`.
// - chaque fichier JSON respecte son schéma (schemas/)
// - les champs HTML ne contiennent que les balises autorisées
// - les références (lieux, médias) existent
// - les médias sont de vrais fichiers image/PDF, sans contenu suspect
import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import sharp from "sharp";
import { RACINE, CONTENU, MEDIAS, FICHIER_SPECTACLE, FICHIER_LIEU, fichiersAValider, lireJson } from "../lib/content.js";
import { validerHtml } from "../lib/html.js";

const erreurs = [];
const avertissements = [];
const rel = (f) => path.relative(RACINE, f).split(path.sep).join("/");
const erreur = (f, msg) => erreurs.push(`${rel(f)} : ${msg}`);
const avertir = (f, msg) => avertissements.push(`${rel(f)} : ${msg}`);

// --- Schémas -------------------------------------------------------------
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, verbose: true });
addFormats(ajv);
ajv.addKeyword({
  keyword: "x-html",
  type: "string",
  schemaType: "boolean",
  errors: true,
  validate: function verifierHtml(actif, valeur) {
    if (!actif) return true;
    const pbs = validerHtml(valeur);
    verifierHtml.errors = pbs.map((message) => ({ keyword: "x-html", message: `HTML : ${message}`, params: {} }));
    return pbs.length === 0;
  },
});
const DOSSIER_SCHEMAS = path.join(RACINE, "schemas");
for (const f of fs.readdirSync(DOSSIER_SCHEMAS).filter((f) => f.endsWith(".schema.json"))) {
  ajv.addSchema(lireJson(path.join(DOSSIER_SCHEMAS, f)), f);
}

function formaterErreurs(errs) {
  // oneOf produit des erreurs sur chaque branche : on retire le bruit
  // (erreurs oneOf, et erreurs de type sur un chemin dont un sous-élément a déjà une erreur précise).
  const sansOneOf = errs.filter((e) => !["oneOf", "anyOf", "if"].includes(e.keyword));
  const utiles = sansOneOf.filter(
    (e) => !(e.keyword === "type" && sansOneOf.some((a) => a !== e && a.keyword !== "type" && (a.instancePath === e.instancePath || a.instancePath.startsWith(e.instancePath + "/"))))
  );
  const liste = (utiles.length ? utiles : errs).map((e) => {
    const ou = e.instancePath || "(racine)";
    let msg = e.message;
    if (e.keyword === "additionalProperties") msg = `propriété inconnue « ${e.params.additionalProperty} »`;
    if (e.keyword === "required") msg = `propriété obligatoire manquante « ${e.params.missingProperty} »`;
    if (e.keyword === "format") msg = `format invalide (attendu : ${{ date: "date AAAA-MM-JJ existante", uri: "adresse web", email: "adresse e-mail" }[e.params.format] || e.params.format})`;
    if (e.keyword === "pattern") msg = `format invalide (attendu : ${e.parentSchema?.description || e.params.pattern})`;
    if (e.keyword === "type") msg = `type invalide (attendu : ${e.params.type})`;
    if (e.keyword === "minLength") msg = "texte trop court ou vide";
    if (e.keyword === "enum") msg = `valeur non admise (choix : ${e.params.allowedValues.join(", ")})`;
    return `${ou} — ${msg}`;
  });
  return [...new Set(liste)];
}

const donnees = new Map();
for (const { fichier, schema } of fichiersAValider()) {
  if (!fs.existsSync(fichier)) {
    erreur(fichier, "fichier manquant");
    continue;
  }
  let json;
  try {
    json = lireJson(fichier);
  } catch (e) {
    erreurs.push(e.message);
    continue;
  }
  donnees.set(fichier, json);
  const valider = ajv.getSchema(schema);
  if (!valider(json)) for (const m of formaterErreurs(valider.errors)) erreur(fichier, m);
}

// --- Cohérence -----------------------------------------------------------
const dossierLieux = path.join(CONTENU, "lieux");
const idsLieux = new Set();
for (const f of fs.readdirSync(dossierLieux).filter((f) => f.endsWith(".json"))) {
  const m = f.match(FICHIER_LIEU);
  if (!m) erreur(path.join(dossierLieux, f), "nom de fichier invalide (minuscules, chiffres et tirets : union.json)");
  else idsLieux.add(m[1]);
}

const dossierSpectacles = path.join(CONTENU, "spectacles");
for (const f of fs.readdirSync(dossierSpectacles)) {
  const chemin = path.join(dossierSpectacles, f);
  if (!f.endsWith(".json")) {
    erreur(chemin, "seuls les fichiers .json sont attendus ici");
    continue;
  }
  const m = f.match(FICHIER_SPECTACLE);
  if (!m) {
    erreur(chemin, "nom de fichier invalide (format AAAA-titre-en-minuscules.json)");
    continue;
  }
  const s = donnees.get(chemin);
  if (!s) continue;
  if (s.annee !== Number(m[1])) erreur(chemin, `« annee » (${s.annee}) ne correspond pas au nom du fichier (${m[1]})`);
  if (s.lieu && !idsLieux.has(s.lieu)) erreur(chemin, `lieu « ${s.lieu} » inconnu (lieux existants : ${[...idsLieux].join(", ")})`);
  for (const d of s.dates || []) {
    if (Number(d.date.slice(0, 4)) < s.annee - 1 || Number(d.date.slice(0, 4)) > s.annee + 1)
      avertir(chemin, `la date ${d.date} semble éloignée de l'année ${s.annee}`);
  }
  if (!s.dates?.length && !s.periode && s.aLAffiche) avertir(chemin, "à l'affiche sans dates ni « periode »");
  if (s.dates?.some((d) => d.date >= new Date().toISOString().slice(0, 10)) && !s.billetterie && !s.brouillon)
    avertir(chemin, "dates à venir mais pas de lien de billetterie");
}

const redirections = donnees.get(path.join(CONTENU, "redirections.json"))?.redirections || [];
const vus = new Set();
for (const r of redirections) {
  if (vus.has(r.de)) erreur(path.join(CONTENU, "redirections.json"), `redirection en double : ${r.de}`);
  vus.add(r.de);
}

// --- Médias --------------------------------------------------------------
const references = new Map(); // chemin média -> fichier JSON qui le cite
function collecter(valeur, source) {
  if (Array.isArray(valeur)) valeur.forEach((v) => collecter(v, source));
  else if (valeur && typeof valeur === "object") {
    for (const [cle, v] of Object.entries(valeur)) {
      if (cle === "fichier" && typeof v === "string" && source.startsWith(CONTENU)) references.set(v, source);
      else collecter(v, source);
    }
  }
}
for (const [fichier, json] of donnees) collecter(json, fichier);

const SIGNATURES = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  pdf: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
};
SIGNATURES.jpeg = SIGNATURES.jpg;
const EXTENSIONS_MEDIA = new Set(Object.keys(SIGNATURES));
const LARGEUR_MAX = 2500;

async function verifierMedia(chemin) {
  const ext = path.extname(chemin).slice(1).toLowerCase();
  const tampon = fs.readFileSync(chemin);
  if (!SIGNATURES[ext]?.(tampon)) {
    erreur(chemin, `le contenu ne correspond pas à un fichier .${ext}`);
    return;
  }
  const brut = tampon.toString("latin1");
  if (/<\?php|<script/i.test(brut)) erreur(chemin, "contenu suspect (code PHP ou script) — fichier refusé");
  if (ext === "pdf") {
    if (/\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(brut)) erreur(chemin, "PDF contenant du JavaScript ou des fichiers embarqués — refusé");
    return;
  }
  try {
    const meta = await sharp(tampon).metadata();
    if (Math.max(meta.width, meta.height) > LARGEUR_MAX)
      avertir(chemin, `image très grande (${meta.width}×${meta.height}) — réduire à ~2000 px de côté`);
  } catch (e) {
    erreur(chemin, `image illisible (${e.message})`);
  }
}

function parcourir(dossier) {
  const out = [];
  if (!fs.existsSync(dossier)) return out;
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) out.push(...parcourir(p));
    else out.push(p);
  }
  return out;
}

const fichiersMedia = parcourir(MEDIAS);
const presents = new Set();
for (const f of fichiersMedia) {
  const nom = path.basename(f);
  if (nom === ".gitkeep") continue;
  const ext = path.extname(f).slice(1).toLowerCase();
  const relMedia = path.relative(MEDIAS, f).split(path.sep).join("/");
  if (!EXTENSIONS_MEDIA.has(ext)) {
    erreur(f, "type de fichier non autorisé dans media/ (jpg, jpeg, png, webp, pdf uniquement)");
    continue;
  }
  if (!/^[a-z0-9][a-z0-9/._-]*$/.test(relMedia)) erreur(f, "nom invalide (minuscules, chiffres, tirets, sans espaces ni accents)");
  presents.add(relMedia);
  await verifierMedia(f);
  if (!references.has(relMedia)) avertir(f, "fichier non utilisé");
}
for (const [media, source] of references) {
  if (!presents.has(media)) erreur(source, `média introuvable : media/${media}`);
}

// --- Bilan ---------------------------------------------------------------
for (const a of avertissements) console.warn(`⚠  ${a}`);
for (const e of erreurs) console.error(`✗  ${e}`);
const nb = fichiersAValider().length;
if (erreurs.length) {
  console.error(`\n${erreurs.length} erreur(s) — corriger avant de publier.`);
  process.exit(1);
}
console.log(`✓  ${nb} fichiers de données valides, ${presents.size} média(s) vérifié(s)${avertissements.length ? `, ${avertissements.length} avertissement(s)` : ""}.`);
