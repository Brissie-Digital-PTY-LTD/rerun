---
name: loading-skeletons
description: Dans apps/ui, toute zone de contenu qui charge affiche un skeleton calqué sur son propre layout (jamais un spinner centré, jamais un skeleton passe-partout). Utiliser dès qu'on ajoute un état de chargement, qu'on branche un fetch client, ou qu'on tombe sur un Loader2Icon / Spinner au milieu d'une zone de contenu.
---

# loading-skeletons — un skeleton par surface, calqué sur son layout

Un chargement de **contenu** dans `apps/ui` se rend avec un **skeleton qui a la forme de ce qui va s'afficher**. Pas un spinner centré, pas un `Loader2Icon` nu, pas un « Loading… », et surtout pas le même skeleton générique recollé partout : le but est qu'entre le placeholder et le contenu réel, **rien ne bouge**.

## La règle

> Chaque surface qui charge a **son** skeleton, dont la géométrie est recopiée du composant réel : mêmes classes de conteneur, mêmes hauteurs, mêmes gaps, mêmes bordures. Seule la primitive `Skeleton` est partagée.

Le contre-exemple à ne pas reproduire : `SkeletonRows` (des barres `h-4 w-full` empilées) posé sur une liste dont les rows ont une vignette, un titre et un badge. Ça « fait skeleton » sans rien annoncer, et le layout saute à l'arrivée des données. Si tu écris `SkeletonRows`, c'est presque toujours le signe que le skeleton n'a pas été dessiné.

## Comment on l'écrit

1. Ouvrir le composant réel et lire son JSX de haut en bas.
2. Recopier la hiérarchie de conteneurs **telle quelle** (le `border-b border-border px-4 py-3` d'une row, le `grid grid-cols-1 gap-3 sm:grid-cols-2` d'une grille, le `h-28` d'une cover).
3. Remplacer chaque bout de contenu par un `<Skeleton />` à la bonne hauteur/largeur : `h-3` pour un `text-xs`, `h-3.5` pour un `text-sm`, `h-9` pour un `Input`, `h-8` pour un `Button size="sm"`.
4. Quand le composant est bâti sur des primitives de layout (`Card` / `CardHeader` / `CardContent`, `ScrollFade`), **réutiliser ces mêmes primitives** dans le skeleton : la géométrie devient exacte gratuitement et reste juste si la primitive évolue.
5. Varier légèrement les largeurs d'une ligne à l'autre (tableau de widths indexé par `i`) plutôt que des barres identiques.

## Où il vit

- **Fonction locale en bas du fichier du composant**, c'est le cas par défaut :
  - `components/agent/AgentPanelMonitoring.tsx` → `MonitoringSkeleton` (la grille 2×`h-32` + 2×`h-56` des `MonitorCard`)
  - `components/templates/expert/ExpertTemplateList.tsx` → `ExpertTemplateListSkeleton` (vignette `h-9 w-14` + titre + badge, calqué sur `ExpertTemplateRow`)
  - `components/templates/TemplateLibraryDialog.tsx` → `TemplateCardSkeleton` (cover `h-28`, titre, tagline sur 2 lignes, barre de méta), rendu dans la **même** grille responsive que les vraies cartes
- **Fichier voisin** quand il est gros : `components/templates/expert/MyTemplateEditorSkeleton.tsx` (les 4 `Card` de l'éditeur + le bloc agents + le footer).
- **`components/ui/skeleton.tsx`** seulement si **plusieurs** surfaces partagent vraiment la même forme.

## Le catalogue partagé (à réutiliser si et seulement si la forme colle)

| Variante | Forme | Exemple d'appelant |
|---|---|---|
| `Skeleton` | la primitive (`animate-pulse rounded-md bg-accent`) | partout |
| `SkeletonList` | avatar rond + label + méta à droite | `WorkspaceMembersDialog`, `CaptureSelectStep` |
| `SkeletonButtonRows` | rows bordées, options `withBadge` / `extraLine` | `AgentPanelScheduled` |
| `SkeletonServiceRows` | icône `size-8` + label + action, encadré | `AgentPanelServices` |
| `SkeletonMemoryRows` | badge + 2 lignes de texte | `AgentPanelMemories` |
| `SkeletonFileTree` | icône `size-4` + nom de largeur variable | `AgentPanelFiles`, `SpacePanelFiles` |
| `SkeletonTable` | header + rows, `rows`/`cols` | `AgentPanelData` |
| `SkeletonCardGrid` | cartes bordées en grille | `AgentPanelTools` |
| `SkeletonChat` | bulles user/assistant | `AgentChat` |
| `SkeletonForm` | label+champ, séparateurs, switches, textarea | `AgentPanelSettings` |
| `SkeletonRows` | barres plates — **quasi jamais le bon choix** | — |

## La frontière : ce qui n'est pas un chargement de contenu

- **Un bouton en cours d'action** → `<Button loading>` de `@rerun/ui/primitives` (rend un `DotLoader`). `components/ui/button.tsx` n'est qu'un ré-export, donc le prop est dispo partout. Ne pas fabriquer un `Loader2Icon` à la main dans un bouton.
  - Piège : `useTransition` donne **un** `pending` partagé. Si plusieurs boutons vivent dans le même composant, garder l'action en cours dans un state (`running === 'submit'`) pour ne faire tourner que le bon. Cf. `components/templates/expert/TemplateSubmitFooter.tsx`.
- **Un statut inline dans le chat** (`ToolCallBlock`, `CompactionBlock`) → `Spinner`.
- **Le loading plein écran de l'app** → `AnimatedLogo` + `Shimmer`.
- Un texte « en cours » dans une dropzone (`Uploading…`) reste du texte.

## Le test

Devtools → réseau **Slow 3G**, ouvrir la surface. Le skeleton doit occuper la même place que le contenu qui le remplace : aucun saut vertical, aucune colonne qui change de largeur, aucun scroll qui bouge.
