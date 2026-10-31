# Site web du Théâtre de la Grappe

Site statique du [Théâtre de la Grappe de Vétroz](https://www.theatredelagrappe.ch), généré avec [Eleventy](https://www.11ty.dev/) à partir de fichiers JSON.

- Spécification : [`specifications.md`](specifications.md)
- Guide technique (aussi utilisé par l'assistant IA) : [`CLAUDE.md`](CLAUDE.md)

## Installation

1. Installer [Node.js](https://nodejs.org/) (version LTS, 22 ou plus récente).
2. Dans ce dossier : `npm install`

## Utilisation

| Commande | Effet |
|---|---|
| `npm run dev` | Aperçu local sur http://localhost:8080, mis à jour à chaque modification |
| `npm run check` | Vérifie toutes les données (à lancer après chaque modification) |
| `npm run build` | Vérifie, génère le site dans `_site/` et contrôle les liens |

Un `git push` sur `main` publie automatiquement le site (onglet **Actions** sur GitHub pour suivre la publication).

## Ajouter un spectacle

1. Créer `content/spectacles/AAAA-titre-du-spectacle.json` (copier un spectacle existant).
2. Déposer l'affiche dans `media/spectacles/AAAA/titre-du-spectacle/affiche.jpg`.
3. `npm run check`, puis `npm run dev` pour vérifier.
4. Commit et push.

Dans VS Code, l'autocomplétion et les erreurs s'affichent directement dans les fichiers JSON grâce aux schémas.
