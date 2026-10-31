# Site web du Théâtre de la Grappe de Vétroz (TGV)

> Spécification v2 — 31 octobre 2026. Les décisions prises sont intégrées ; les points encore ouverts sont listés à la fin.

# 1. Généralités

Ce document décrit les éléments constituants du site web du Théâtre de la Grappe de Vétroz (TGV) ainsi que les directives pour son élaboration et sa maintenance.

Le TGV est une société de théâtre amateur à Vétroz en Valais, Suisse. Elle existe depuis 1985.

Le site WordPress du TGV (www.theatredelagrappe.ch) a été piraté et endommagé ; il est hors ligne. Plutôt que de le réparer pour retrouver le même vieux site, il est repensé selon la vision suivante :

- Le site évolue très peu :
  - une ou deux pages supplémentaires par saison, une par spectacle ;
  - changements dans la composition du comité ;
  - indications annuelles pour l'atelier théâtre des jeunes.
- La mécanique WordPress n'est pas nécessaire pour si peu de mutations, et elle est par nature exposée au piratage.
- Les outils d'analyse (visites, etc.) ne sont pas utilisés.
- La partie la plus dynamique (actualités, agenda, photos) se joue sur Facebook et Instagram.

**Principe : un site statique, généré à partir de fichiers de données, sans base de données, sans code serveur, sans traceur.**

## 1.1 Maintenance

- Maintenu par Dom ; une seconde personne est capable de le faire de la même manière (édition des fichiers, éventuellement avec assistance IA).
- Pas d'interface d'administration pour l'instant.
- Toute modification passe par le dépôt Git ; la publication est automatique.

## 1.2 Hors périmètre (abandonné)

- Annonceurs / sponsors.
- Agenda et actualités → renvoi vers Facebook et Instagram.
- Newsletter (sera peut-être gérée autrement plus tard).
- Formulaire de contact intégré → Google Forms.
- Statistiques de visite, bannière de cookies, comptes utilisateurs.

# 2. Sections du site

Le site est en français uniquement.

## 2.1 Accueil

- Logo et identité du TGV.
- **Spectacles à l'affiche** : les spectacles de la saison en cours, avec affiche, lieu, dates et bouton « Réserver » (lien billetterie Infomaniak).
  - Saison 2027 : un spectacle à la salle de l'Union, un spectacle au Petit TGV, deux spectacles pour enfants.
- Liens vers Facebook et Instagram.
- Accès rapides : atelier jeunesse, lieux, contact.

Un spectacle apparaît à l'affiche tant qu'il lui reste au moins une date à venir (ou s'il est explicitement marqué `aLAffiche`). Ensuite, il ne figure plus que dans les archives. Un rebuild automatique hebdomadaire garantit que l'accueil se met à jour même sans modification.

## 2.2 À propos

- Description de la société et de ses activités.
- Composition du comité (fonction, nom ; photo facultative).
- Contacts utiles : adresse postale, e-mail, lien vers le formulaire de contact Google Forms.

## 2.3 Historique

Texte libre : fondation, grands spectacles, évolution. Peut renvoyer vers les fiches spectacles.

## 2.4 Atelier jeunesse

- Description, modalités, horaires, prix, saison concernée.
- Lien vers le formulaire d'inscription Google Forms.
- Photos : uniquement si les enfants n'y sont pas reconnaissables (floutage). Pas de photo d'enfant identifiable sur le site.

## 2.5 Spectacles

- Liste de tous les spectacles depuis 1985, groupés par année, du plus récent au plus ancien, avec vignette de l'affiche.
- Une page par spectacle.
- Les années anciennes peuvent n'avoir qu'un titre et une affiche (scans d'archives intégrés ultérieurement).

## 2.6 Lieux

Une page par lieu (actuellement 2 : la salle de l'Union et le Petit TGV) : adresse, plan d'accès (lien vers une carte), parkings, transports publics, accessibilité, photo. Chaque spectacle renvoie vers la page de son lieu.

## 2.7 Pages techniques

- **Mentions légales** : responsable du site (association), adresse.
- **Confidentialité** (nLPD) : le site ne dépose pas de cookies et n'utilise pas de traceur ; il renvoie vers des services tiers (Google Forms, Infomaniak, YouTube, Facebook, Instagram) qui ont leurs propres règles.
- Page 404.

# 3. Modèle de données

Toutes les données sont dans des fichiers JSON structurés, validés par des JSON Schema (draft 2020-12). Chaque fichier déclare son schéma (`"$schema": "../schemas/xxx.schema.json"`), ce qui donne l'autocomplétion et la validation dans VS Code. Le build échoue si un fichier est invalide.

## 3.1 Arborescence

```
content/
  site.json                 nom, adresse, e-mail, réseaux sociaux, liens Google Forms
  apropos.json              texte, comité
  historique.json           texte
  atelier.json              saison, texte, prix, horaires, lien d'inscription, photos
  lieux/
    union.json
    petit-tgv.json
  spectacles/
    1985-soiree-du-rire.json
    …
    2027-<slug>.json        un fichier par spectacle : AAAA-slug.json
media/
  logo/
  lieux/
  spectacles/<annee>/<slug>/   affiche, flyer, photos (versions web, voir 5.2)
schemas/
  site.schema.json, spectacle.schema.json, lieu.schema.json, …
theme/
  theme.json                couleurs, polices, fond → variables CSS
```

## 3.2 Spectacle

| Champ | Type | Obligatoire | Remarque |
|---|---|---|---|
| `titre` | texte | oui | |
| `annee` | entier | oui | année de la première, sert au classement |
| `categorie` | `adulte` \| `enfant` \| `jeunesse` \| `evenement` | oui | `jeunesse` = spectacle de l'atelier |
| `lieu` | référence (ex. `union`) | non | identifiant d'un fichier de `content/lieux/` |
| `dates` | liste de `{ date, heure?, remarque? }` | non | `remarque` ex. « supplémentaire », « complet » |
| `billetterie` | URL | non | un seul lien Infomaniak par spectacle |
| `affiche` | `{ fichier, alt }` | non | `alt` obligatoire si l'affiche est présente |
| `flyer` | `{ fichier, alt? }` | non | image ou PDF |
| `videos` | liste de `{ titre, url }` | non | liens YouTube/Vimeo |
| `photos` | liste de `{ fichier, alt }` | non | |
| `texte` | HTML restreint | non | texte libre (auteur, mise en scène, distribution, résumé…) |
| `aLAffiche` | booléen | non | force l'affichage sur l'accueil |
| `brouillon` | booléen | non | non publié si `true` |

Le slug (URL) est dérivé du nom de fichier : `2027-xxx.json` → `/spectacles/2027-xxx/`.

## 3.3 HTML restreint

Les champs `texte` acceptent du HTML limité aux balises suivantes :
`p`, `br`, `strong`, `b`, `em`, `i`, `u`, `a` (attribut `href`), `ul`, `ol`, `li`, `h3`, `h4`, `blockquote`.

Le build refuse toute autre balise ou attribut (`script`, `style`, `iframe`, `on*`…). Les liens externes reçoivent automatiquement `target="_blank" rel="noopener"`. Dans le JSON, le texte peut être une chaîne ou une liste de chaînes (une par paragraphe), pour rester lisible.

## 3.4 Lieu

`nom`, `adresse`, `npa`, `localite`, `carte` (URL), `parkings` (HTML restreint), `transports` (HTML restreint), `accessibilite` (HTML restreint), `photo` (`{ fichier, alt }`).

# 4. Interface

- Mobile d'abord : conçu pour le téléphone, confortable sur PC.
- Le logo (la grappe de raisin) est conservé ; le reste de l'identité visuelle (couleurs, polices, mise en page) est entièrement repensé.
- Les éléments de style (couleurs, polices, fond) sont définis dans `theme/theme.json`, transformés en variables CSS au build : changer de thème ne demande aucune modification des gabarits.
- Polices auto-hébergées (pas d'appel à Google Fonts).
- Pas de JavaScript nécessaire au fonctionnement ; au plus un peu de JS d'agrément (menu mobile, agrandissement d'affiche).
- Accessibilité : contrastes suffisants, textes alternatifs obligatoires, navigation au clavier.
- Partage : balises Open Graph sur chaque page (titre, description, affiche) pour un bel aperçu sur Facebook et Instagram.
- Vidéos : lien avec vignette plutôt qu'intégration (pas de cookie YouTube) ; si intégration, via `youtube-nocookie.com`.

# 5. Technique

## 5.1 Outillage

- Générateur : **Eleventy (11ty) 3.x** sur Node.js (LTS), gabarits Nunjucks.
- Validation : **ajv** (JSON Schema) + contrôle du HTML restreint.
- Images : **sharp** (redimensionnement, WebP + JPEG de repli, suppression des métadonnées).
- Commandes npm :
  - `npm run dev` : serveur local avec rechargement automatique ;
  - `npm run check` : validation des données, du HTML et des liens internes ;
  - `npm run build` : génération du site dans `_site/`.

## 5.2 Médias

- Le dépôt contient des versions « maîtres » raisonnables (max. ~2000 px de côté) ; les scans haute résolution restent dans les archives (kDrive).
- Le build produit les tailles utiles (vignette, moyenne, grande) en WebP et JPEG.
- Nommage : minuscules, sans espaces ni accents (`affiche.jpg`, `flyer.pdf`, `photo-01.jpg`).

## 5.3 Hébergement et publication

- Hébergement : **GitHub Pages**, dépôt `theatredelagrappe-collab/website`.
- Le dépôt est **public** (exigé par GitHub Pages en offre gratuite) : il ne doit contenir aucun secret ni aucune donnée personnelle hormis ce qui est publié sur le site.
- Publication : une **GitHub Action** construit et déploie le site à chaque push sur `main`, plus un rebuild planifié chaque semaine (mise à jour de l'accueil). La CI échoue si `check` échoue : rien d'invalide n'est publié.
- Domaine : `theatredelagrappe.ch` et `www.theatredelagrappe.ch` pointés vers GitHub Pages (enregistrements DNS chez le registraire), HTTPS automatique. Les enregistrements MX (e-mail) ne sont pas modifiés.
- Plus aucun accès FTP n'est nécessaire.

## 5.4 Anciennes adresses

GitHub Pages ne gère pas les redirections serveur (`.htaccess` inopérant). Les anciennes URL WordPress connues (ex. `/2017-paul-m-a-laisse-sa-cle/`) sont reprises dans `content/redirections.json` ; le build génère pour chacune une page de redirection (meta refresh + lien canonique).

## 5.5 Référencement

`sitemap.xml`, `robots.txt`, titres et descriptions par page, données structurées `TheaterEvent` (schema.org) pour les spectacles à l'affiche.

# 6. Maintenance assistée par IA

## 6.1 CLAUDE.md

Un fichier `CLAUDE.md` à la racine du dépôt décrit la structure, les conventions et les commandes. Il est lu par l'assistant à chaque session.

## 6.2 Skills

| Skill | Rôle |
|---|---|
| `tgv-contenu` | Ajouter ou modifier un spectacle (à partir d'une affiche, d'un flyer ou d'un texte), mise à jour annuelle (comité, atelier, spectacles à l'affiche), ajout d'affiches d'archives scannées. Se termine toujours par `npm run check` et une prévisualisation. |
| `tgv-publication` | Vérifier, commiter, pousser, suivre la GitHub Action et contrôler le site en ligne. |

Pour la conception graphique initiale, la skill existante `frontend-design` est utilisée.

## 6.3 Procédures courantes

- **Nouveau spectacle** : créer `content/spectacles/AAAA-slug.json`, déposer l'affiche dans `media/spectacles/AAAA/slug/`, `npm run check`, prévisualiser, publier.
- **Fin de saison** : rien à faire, le spectacle quitte l'accueil automatiquement après sa dernière date.
- **Nouvelle saison de l'atelier** : mettre à jour `content/atelier.json` (dates, prix, lien du formulaire).
- **Changement au comité** : mettre à jour `content/apropos.json`.

# 7. Création initiale

## 7.1 Sources

- Archive Internet : https://web.archive.org/web/20250323040655/https://www.theatredelagrappe.ch/
- Export de la base WordPress : `DB-TGV-WordPress.sql` (kDrive, `TGV Site/Wordpress/`).
- Fichiers téléchargés : `TGV Site/Wordpress/<année>/<mois>/` (kDrive).
- Affiches d'archives : à scanner ultérieurement.

**Ces sources restent hors du dépôt Git** (dépôt public, données personnelles, fichiers compromis).

## 7.2 Règles de reprise (site compromis)

Constats de l'analyse du 31.10.2026 :

- fichiers PHP malveillants dans les uploads (`2016/06/2index.php`, `2025/04/2index.php`, `2020/01/content.php`) ;
- 146 fichiers `.htaccess` modifiés pour autoriser l'exécution de PHP dans les uploads ;
- contenu de spam injecté dans la base (casino, viagra, code `base64_decode`).

En conséquence :

1. Seuls les fichiers image (JPG, PNG) et PDF sont repris ; jamais de `.php`, `.htaccess` ni autre fichier exécutable.
2. Chaque image est vérifiée (type réel) et **réencodée** par sharp ; les PDF sont contrôlés avant reprise.
3. Le contenu de la base est extrait en **texte brut** (titres, textes des pages et articles publiés), puis nettoyé et relu avant d'être transformé en JSON. Aucun HTML n'est repris tel quel.
4. Les données personnelles de la base (abonnés newsletter, contacts et messages du formulaire, comptes utilisateurs) ne sont ni reprises ni versionnées.

## 7.3 Inventaire du contenu existant

- Pages à reprendre : Théâtre, Historique, Comité, Staff, Atelier des jeunes, Parkings Union (→ page lieu).
- Pages spectacles existantes : 1985, 2012 à 2019, 2023.
- Spectacles présents uniquement comme articles : 2019 *Le suicidé*, 2022 *La cour des grandes*, 2024 *Cuisine et dépendances*, 2025 *Le TGV fête 40 ans et double la mise*.
- Pages abandonnées : Annonceurs, Pub, Agenda, Contact, Projet 2019, Politique de cookies (remplacée par la page Confidentialité).

## 7.4 Étapes

1. Spécification v2 et décisions *(ce document)*.
2. Squelette du dépôt : Eleventy, schémas, validation, GitHub Action, `CLAUDE.md`.
3. Extraction et nettoyage du contenu WordPress → JSON, relecture.
4. Maquettes : 2 à 3 directions visuelles sur mobile, autour du logo, puis choix.
5. Gabarits et thème.
6. Saisie de la saison 2027 et des lieux.
7. Mise en ligne : DNS, HTTPS, redirections, contrôle.
8. Skills `tgv-contenu` et `tgv-publication`.

# 8. Points ouverts

- [ ] Nom exact et adresse des deux lieux (salle de l'Union, Petit TGV), infos parkings et accès.
- [ ] Où est géré le domaine `theatredelagrappe.ch` (registraire, DNS) ? Y a-t-il des adresses e-mail sur ce domaine ?
- [ ] Adresse e-mail de contact publique, liens Facebook et Instagram, liens des Google Forms (contact, inscription atelier).
- [ ] Logo en haute résolution, idéalement en vectoriel (SVG, AI, EPS ou PDF).
- [ ] Saison 2027 : titres, dates, lieux, affiches et liens billetterie des quatre spectacles (au fur et à mesure).
- [ ] Le contenu de l'ancienne page « Staff » est-il fusionné dans À propos ou abandonné ?
