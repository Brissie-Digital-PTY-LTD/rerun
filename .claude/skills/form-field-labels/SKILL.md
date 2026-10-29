---
name: form-field-labels
description: Dans apps/ui, tout champ de formulaire (Input, Textarea, Select, Combobox, Switch, Checkbox) reçoit son titre via le composant partagé Field au style text-xs font-medium text-muted-foreground, jamais un titre écrit à la main ni un style ad hoc. Utiliser dès qu'on ajoute ou refond un champ de formulaire dans l'app.
---

# form-field-labels — titrer un champ via le composant Field

Tous les titres de champ de formulaire de `apps/ui` passent par **un seul composant** : `Field` (`apps/ui/components/ui/field.tsx`). Avant unification, ~9 styles de label coexistaient (`text-sm font-semibold`, `text-[12px] font-medium text-foreground`, `text-xs font-medium text-muted-foreground`, uppercase, couleurs `neutral-*` en dur…) et les `Select`/`Combobox`/`Switch` avaient chacun un titre réécrit à la main. Ce skill maintient la règle : **jamais de titre de champ improvisé**.

Le design retenu (unique) : **`text-xs font-medium text-muted-foreground`**, porté par `Field`.

## Référence canonique

- `apps/ui/components/ui/field.tsx` : le composant. Deux orientations (`column` par défaut, `row` pour Switch/Checkbox), + slots `optional` / `helperText` / `error` / `htmlFor`.
- `apps/ui/components/ui/input.tsx` et `textarea.tsx` : `Input` et `Textarea` **délèguent** leur prop `label` à `Field`. Donc `<Input label="…" />` produit déjà le bon titre, ne jamais l'envelopper en plus.
- Exemples de bons usages : `apps/ui/app/admin/blog/BlogPostDialog.tsx` (Select + Combobox), `apps/ui/components/dialogs/CreateAgentDialog.tsx`.

## Règle

> Un champ de saisie (Input, Textarea, Select, Combobox) ou un réglage booléen nommé (Switch, Checkbox) obtient son titre **uniquement** via `Field` — directement, ou via le prop `label` de `Input`/`Textarea` (qui délègue à `Field`). Jamais de `<p>`/`<span>`/`<label>` écrit à la main au-dessus d'un champ, jamais de classe de titre en dur.

## Squelette

```tsx
import { Field } from '@/components/ui/field'

// Input / Textarea : PROP label (ne pas envelopper dans Field)
<Input label="Full name" placeholder="Ada Lovelace" />
<Textarea label="Bio" optional helperText="Shown on your public profile" />

// Select / Combobox : wrapper Field (ils n'ont pas de prop label)
<Field label="Role" htmlFor="role">
    <Select value={role} onValueChange={setRole}>
        <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
        <SelectContent>{/* items */}</SelectContent>
    </Select>
</Field>

<Field label="Favorite fruit">
    <Combobox groups={groups} value={fruit} onChange={setFruit} />
</Field>

// Switch / Checkbox : Field orientation="row" (label à gauche, contrôle à droite)
<Field orientation="row" label="Email notifications" helperText="Send me product updates.">
    <Switch checked={on} onCheckedChange={setOn} />
</Field>
```

Anti-patterns (ce que le skill supprime) :

```tsx
// ❌ titre écrit à la main au-dessus du champ
<div className="space-y-1.5">
    <p className="text-xs font-medium text-muted-foreground">Model</p>
    <Select …>…</Select>
</div>

// ❌ double titre : prop label ET Field autour
<Field label="Name"><Input label="Name" …/></Field>

// ❌ classe de titre ad hoc (font-semibold, text-[12px], neutral-* en dur, uppercase…)
<label className="text-sm font-semibold">Name</label>
```

## Règles de détail

1. **htmlFor** : ne le pose que si un `id` réel existe sur le contrôle. `Select` → `id` sur `<SelectTrigger>` + `htmlFor` sur `Field`. `Combobox` et boutons custom n'ont pas de prop `id` → pas de `htmlFor` (le label reste non associé, c'est acceptable).
2. **helperText / error** : un hint passe en `helperText` (gris, sous le champ) ; une erreur hors react-hook-form passe en `error` (rouge). Ne pas cumuler `error` avec un `<FormMessage/>`.
3. **Lignes de liste ≠ champs** : une ligne où le libellé est une **donnée** (nom d'agent, d'outil, de provider) avec un Switch d'activation n'est PAS un champ de formulaire — ne pas la passer en `Field`. `Field` est réservé aux champs de saisie et aux réglages booléens **nommés en dur**.
4. **Cases de sélection de tableau** (select-all / par-ligne, `aria-label` seul) : restent sans titre visible.

## Intégration react-hook-form

`FormControl` (`components/ui/form.tsx`) est un `Slot` qui injecte `id` / `aria-invalid` / `aria-describedby` sur son **enfant unique**. Donc :

- Ne JAMAIS mettre `Field` comme enfant direct de `FormControl` (il avalerait ces props).
- Pour un `Input`/`Textarea` : garder le prop `label` sur le contrôle **dans** le `FormControl` (le plus simple), l'erreur reste rendue par `<FormMessage/>`.
- Pour un `Select`/`Combobox` : envelopper `FormControl` dans `Field`, jamais l'inverse :
  ```tsx
  <FormItem>
      <Field label="Role">
          <FormControl>
              <Select …><SelectTrigger>…</SelectTrigger>…</Select>
          </FormControl>
      </Field>
      <FormMessage />
  </FormItem>
  ```
- `FormLabel`/`Label` n'existent plus : ne pas les réintroduire.

## Vérification

- `cd apps/ui && npx tsc --noEmit` → exit 0.
- Anti-régression : aucun titre de champ écrit à la main ne doit réapparaître. Repérer les suspects :
  ```
  rg -n "className=\"[^\"]*text-(xs|sm|\[1[0-3]px\]) font-(medium|semibold)" apps/ui/components apps/ui/app
  ```
  Un match juste au-dessus d'un `Select`/`Combobox`/`Switch`/`Input` = à convertir en `Field`.

## Rappels

- Labels UI en anglais, pas d'em dashes.
- Imports en alias absolu : `@/components/ui/field`.
- Composant client (`'use client'`) si le champ est interactif.
