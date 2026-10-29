---
name: shared-badge
description: Toute pastille de statut ou de label (In review, Published, Beta, Pro, Running…) passe par le composant partagé Badge de @rerun/ui/primitives, avec un ton BadgeTone, jamais un span stylé à la main en bg-x/15 text-x. Utiliser dès qu'on affiche un statut, qu'on ajoute une pastille dans une liste/table/dialog, ou qu'on tombe sur un `<span className="rounded ... text-[10px]">` qui sert de badge.
---

# shared-badge — une pastille = le composant Badge

Toutes les pastilles de Rerun sortent d'**un seul composant** : `Badge` (`packages/ui/src/primitives/badge.tsx`). C'est lui qui porte l'anneau `BorderBeam`, le glow, le fond soft et les tokens de couleur par ton. Une pastille recopiée à la main (`bg-amber-500/15 text-amber-500`) sort du design system : pas d'anneau, pas de glow, et une teinte qui dérive d'une surface à l'autre (cas relevé : le badge « In review » de la dialog My templates ne ressemblait pas à celui de la table admin).

## Référence canonique

- `packages/ui/src/primitives/badge.tsx` : le composant. Props `size` (`xs | sm | md | lg`, défaut `md`), `fill` (`soft | outline`), `tone`, `pattern`, `animated`, `glow`, `shimmer`.
- `packages/ui/src/styles.css` (~l.151) : les tokens `--badge-fg` / `--badge-soft` par ton. **La couleur d'une pastille se change là, jamais dans le composant appelant.**
- Wrappers déjà officiels, à réutiliser plutôt que de refaire un mapping :
  - `apps/ui/app/admin/_badges.tsx` → `StatusBadge` / `StatusBadgeButton` (toutes les tables admin).
  - `packages/ui/src/monitoring/AgentRunLogs.tsx` → `RunStatusBadge` + `RUN_STATUS_META`.
  - `apps/ui/lib/board/attention.ts` → `STATUS_META` : le statut d'une conversation en attente.
  - `apps/ui/lib/templates/status.ts` → `templateStatusTone` / `templateStatusLabel` : le statut d'un template (`draft`, `in_review`, `published`, `unlisted`, `archived`) partout dans l'app. Ne jamais remapper un statut de template à la main, et surtout ne jamais l'afficher via `titleCase` seul (`in_review` sortirait « In_review »).
- `packages/ui/src/primitives/icon-badge.tsx` → `IconBadge` : pastille **ronde à icône seule** (checkmarks pricing, statuts de tools du chat). Pas pour du texte.

## Règle

> Une pastille (statut, état, label court type Beta / Pro / New, compteur qualifié) s'écrit **uniquement** avec `Badge` de `@rerun/ui/primitives`, ou l'un des wrappers ci-dessus. La couleur vient du prop `tone` typé `BadgeTone`, jamais de classes `bg-*/10 text-*-500` posées sur un `<span>`.

Tons disponibles (`BadgeTone`, hérités de `BorderBeam`) : `brand` (défaut), `white`, `neutral`, `green`, `red`, `orange`, `cyan`, `yellow`. Pas d'autre couleur : si le besoin n'entre pas dedans, ajouter un ton dans `styles.css` + `BorderBeam.tsx`, pas une classe locale.

## Squelette

```tsx
import { Badge, type BadgeTone } from '@rerun/ui/primitives'

// Pastille de statut dans une liste / table / dialog : la forme maison
const STATUS_TONES: Record<string, BadgeTone> = {
    in_review: 'orange',
    published: 'green',
    unlisted: 'cyan',
}

<Badge size="xs" tone={STATUS_TONES[status] ?? 'neutral'} glow={false} className="font-medium">
    {statusLabel(status)}
</Badge>

// Pastille mise en avant (hero, carte pricing, feature flag) : les défauts suffisent
<Badge tone="brand">Beta</Badge>
<Badge tone="brand" animated shimmer>New</Badge>
```

Anti-patterns (ce que le skill supprime) :

```tsx
// ❌ pastille recopiée à la main
<span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-500">In review</span>

// ❌ mapping de statut vers des classes au lieu d'un ton
const STATUS_CLASS: Record<string, string> = { published: 'bg-emerald-500/15 text-emerald-500' }

// ❌ ton écrasé par une couleur locale
<Badge tone="green" className="text-emerald-300">Live</Badge>

// ❌ un vrai bouton fait avec un Badge : Badge rend un <span>
<Badge onClick={…}>Publier</Badge>   // → StatusBadgeButton, ou <button> qui enveloppe le Badge
```

## Règles de détail

1. **Convention statut** : `size="xs"`, `glow={false}`, `className="font-medium"`. Le glow est réservé aux pastilles mises en avant (hero, pricing) ; dans une liste dense il bave sur les lignes voisines. Uppercase (`uppercase tracking-wide`) seulement si la surface le fait déjà partout.
2. **Même statut = même ton partout.** Avant d'inventer un mapping, chercher si le statut existe déjà (`STATUS_TONES` de `TemplatesAdmin.tsx`, `RUN_STATUS_META`, `STATUS_META`) et reprendre le même ton. Un statut qui se lit orange dans l'admin ne se lit pas ambré dans la dialog.
3. **Un statut inconnu tombe sur `'neutral'`**, jamais sur du gris écrit en dur : `STATUS_TONES[status] ?? 'neutral'`.
4. **`Badge` est un `<span>`** : pas d'`onClick` dessus. Une pastille cliquable = un `<button>` autour (voir `StatusBadgeButton`).
5. **`className` sert au layout, pas à la couleur** : `shrink-0`, `absolute`, `font-medium`, `uppercase` oui ; `text-*`, `bg-*`, `border-*` non.
6. **Import** : `@rerun/ui/primitives` (sous-chemin) de préférence au barrel `@rerun/ui`, qui tire tout le package.
7. **Pastille de statut posée sur une image** : le fond soft du Badge ne suffit pas au-dessus d'une photo. Envelopper dans un `<span className="absolute … rounded-full bg-background/70 backdrop-blur">` et laisser le Badge porter la couleur (`TemplateCard`, `TemplateDetailMedia`). Pas de couleur sur le wrapper.

## Ce qui n'est PAS une pastille

Ne pas convertir : les **chips à icône posés sur une image** qui ne portent pas d'état (le « Featured » de `TemplateCard` / `TemplateDetailMedia`, overlay `bg-background/80 backdrop-blur`), les **`<kbd>`** de raccourcis, les **blocs de code / d'erreur** (`rounded bg-* px-2 py-1.5` sur un `<pre>`), les **bulles de compteur** rondes de la sidebar, et les **tags de données libres** (kind de mémoire, nom de fichier) qui ne portent pas d'état.

## Vérification

- `cd apps/ui && npx tsc --noEmit` → exit 0.
- Anti-régression, repérer les pastilles refaites main :
  ```
  rg -n "className=\"[^\"]*(bg-(amber|emerald|sky|red|orange|cyan|yellow)-[0-9]{3}/[0-9]{1,2})[^\"]*text-" apps/ui packages
  ```
  Un match qui enveloppe un libellé de statut = à passer en `Badge` + `tone`.
- Vérifier aussi qu'aucun `Record<string, string>` nommé `*_CLASS` ne mappe un statut vers des classes de couleur :
  ```
  rg -n "STATUS_CLASS|_CLASS: Record<string, string>" apps/ui packages
  ```

## Rappels

- Labels UI en anglais, pas d'em dashes (le back-office `/admin` reste en français pour ses textes).
- Composant client (`'use client'`) seulement si la surface l'est déjà : `Badge` n'a pas de hooks, il passe en server component.
