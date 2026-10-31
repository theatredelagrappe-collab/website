# Site du Théâtre de la Grappe (TGV) — guide pour l'assistant

Site statique du Théâtre de la Grappe de Vétroz, généré par **Eleventy 3** à partir de fichiers **JSON validés par JSON Schema**, publié sur **GitHub Pages** par GitHub Actions. La spécification complète est dans `specifications.md` : la lire avant tout changement de structure.

Langue : tout le contenu, les commentaires de code et les messages de commit sont en **français**.

## Structure

```
content/               ← LES DONNÉES (c'est presque toujours ici qu'on travaille)
  site.json            nom, contact, adresse, réseaux sociaux
  apropos.json         texte, comité, équipe
  historique.json      page Historique
  atelier.json         atelier jeunesse : saison, texte, modalités, lien d'inscription
  redirections.json    anciennes URL WordPress → nouvelles
  lieux/<id>.json      un fichier par lieu (id = nom du fichier : union, petit-tgv)
  spectacles/AAAA-slug.json   un fichier par spectacle
media/                 images et PDF référencés par le contenu (chemins relatifs à media/)
  spectacles/<annee>/<slug>/affiche.jpg, flyer.pdf, photo-01.jpg…
  lieux/<id>/…
schemas/               JSON Schema de chaque type de fichier (+ communs.schema.json)
theme/theme.json       couleurs, polices, arrondis → /css/theme.css
theme/fonts/           polices .woff2 auto-hébergées
Resources/             sources graphiques (logo_tgv.pdf original, logo_tgv.svg en currentColor)
src/                   gabarits Nunjucks (pages, _includes/layouts, _includes/partials), css/style.css
lib/                   content.js (chargement + enrichissement), html.js (HTML restreint), icones.js
scripts/               check.js (validation), check-links.js (liens internes)
eleventy.config.js     filtres, shortcodes images, plugins
```

## Commandes

- `npm run dev` — serveur local http://localhost:8080 avec rechargement.
- `npm run check` — valide données, HTML, références, médias. **Toujours lancer après une modification de contenu.**
- `npm run build` — check + génération dans `_site/` + vérification des liens internes.

## Règles impératives

1. **Dépôt public** : jamais de mot de passe, jeton, export de base de données, ni donnée personnelle non destinée à être publiée. Les sources WordPress restent hors du dépôt (kDrive).
2. **HTML restreint** dans les champs `texte`, `parkings`, etc. : uniquement `p br strong b em i u a(href) ul ol li h3 h4 blockquote`. Liens : `http(s)://`, `mailto:`, `tel:`, `/…` ou `#…`. `npm run check` refuse le reste. Ne jamais contourner (pas de `| safe` sur un champ sans le filtre `html`).
3. **Médias** : seulement jpg, jpeg, png, webp, pdf ; noms en minuscules sans espaces ni accents ; ~2000 px max de côté. Tout `alt` doit décrire l'image. Pas de SVG dans `media/` (risque de script).
4. **Atelier jeunesse** : aucune photo où un enfant est reconnaissable.
5. **Ne pas modifier les schémas** pour faire passer une donnée invalide : corriger la donnée. Si un nouveau champ est vraiment nécessaire, mettre à jour schéma + gabarit + `specifications.md` ensemble.
6. Les fichiers générés (`_site/`, `.cache/`) ne sont jamais commités.

## Modèle « spectacle » (résumé — voir schemas/spectacle.schema.json)

`titre`, `annee` (= préfixe du nom de fichier), `categorie` (adulte | enfant | jeunesse | evenement) sont obligatoires. Puis : `provisoire`, `sousTitre`, `lieu` (id d'un lieu ayant sa page) ou `lieuTexte` (ancienne salle, texte libre), `periode` (si pas encore de dates), `dates[] {date AAAA-MM-JJ, heure HH:MM, remarque}`, `billetterie` (un lien Infomaniak), `affiche {fichier, alt}`, `flyer {fichier}`, `resume`, `texte` (HTML restreint, chaîne ou liste de paragraphes), `videos[] {titre, url}`, `photos[]`, `aLAffiche`, `brouillon`.

**À l'affiche** sur l'accueil = au moins une date ≥ aujourd'hui (heure de Zurich), ou `aLAffiche: true`. Un rebuild quotidien (GitHub Actions) met l'accueil à jour.

Les dates ne sont saisies que si elles sont connues avec certitude (affiche, programme) ; sinon utiliser `periode`.

Lieu : `nom`, `adresse`, `carte`, `description`, `parkings`, `transports`, `accessibilite` (HTML restreint), `photo`, `plan` (image d'accès ou des parkings).

Renommer un fichier spectacle change son URL : ajouter alors une entrée dans `content/redirections.json`.

## Points techniques

- Les shortcodes `image` / `imagePartage` sont asynchrones : dans une boucle qui les utilise (directement ou via `partials/carte-spectacle.njk`), employer `{% asyncEach %}…{% endeach %}` et non `{% for %}` (sinon les éléments disparaissent silencieusement).
- Les URL internes s'écrivent toujours en absolu depuis la racine (`/spectacles/…`) : `HtmlBasePlugin` ajoute le préfixe (`PATH_PREFIX`, `/website/` sur github.io).
- Le logo est inséré via `/assets/logo.svg` et `/assets/logo-pied.svg`, générés à chaque build depuis `Resources/logo_tgv.svg` avec les couleurs du thème (`lib/icones.js`).
