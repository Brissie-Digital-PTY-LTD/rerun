---
name: confirm-destructive-actions
description: Une opération risquée (suppression, purge, révocation, redémarrage, paiement, écrasement d'une saisie) se confirme par une dialog — ConfirmDialog, ou un AlertDialog dédié quand la copie dépend de l'état — jamais par un clic nu. Utiliser dès qu'on ajoute un bouton destructif ou qu'on écrit une dialog de confirmation.
---

# confirm-destructive-actions — confirmer par une dialog

## La règle

> Une opération risquée se confirme par **une dialog, et une seule**.

Risqué = irréversible ou à large rayon : supprimer, purger, révoquer, retirer un membre, redémarrer/scaler un engine, payer, écraser un texte que l'utilisateur a saisi.

## Quoi utiliser

**`ConfirmDialog`** (`apps/ui/components/dialogs/ConfirmDialog.tsx`) est le défaut. Titre + description + Cancel/Confirm, rien à câbler.

```tsx
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'

<ConfirmDialog
    title="Delete this row?"
    description="The row is removed from the table for good. This cannot be undone."
    onConfirm={() => onDelete(id)}
>
    <Button variant="destructive" size="sm">Delete</Button>
</ConfirmDialog>
```

Props utiles : `confirmLabel` (défaut `Delete`), `cancelLabel`, `confirmVariant` (défaut `destructive` — passer `default` pour une action non destructive comme un reset), `pending`.

**Mode contrôlé obligatoire** quand le trigger vit dans un calque qui se ferme sur interact-outside (`Popover`, `DropdownMenu`) : monter la dialog **en dehors** du calque.

```tsx
const [confirming, setConfirming] = useState(false)

<DropdownMenuItem onSelect={() => setConfirming(true)}>Delete</DropdownMenuItem>
{/* hors du DropdownMenu */}
<ConfirmDialog open={confirming} onOpenChange={setConfirming} title="…" onConfirm={remove} />
```

**Un `AlertDialog` écrit à la main** seulement quand la copie ou le contenu dépendent de l'état : une description qui liste ce qui va bouger, un champ « tape le nom pour confirmer » (`DeleteSpaceDialog`, `DeleteAgentDialog`), plusieurs dialogs partageant un même state d'admin (`PoolAdmin`).

**Bouton icône seul** (poubelle sans libellé) : toujours une dialog. Voir `PanelDeleteButton` (`apps/ui/components/ui/panel-editor.tsx`), qui l'encapsule déjà.

**Pas de dialog** quand l'écran *est* la confirmation : une page dédiée qui explique l'action et propose une sortie à côté du bouton (`apps/landing/app/community/experts/unsubscribe/ExpertOptOut.tsx`). Ne pas empiler une dialog par-dessus.

## Anti-patterns

```tsx
// ❌ suppression au premier clic, sans confirmation
<Button variant="destructive" onClick={destroy}>Delete</Button>

// ❌ window.confirm()
if (confirm('Sure?')) destroy()
```

## Détails qui comptent

1. **Garder la dialog ouverte pendant l'action** : `event.preventDefault()` dans le `onClick` de l'`AlertDialogAction`, puis fermer soi-même une fois l'action revenue. Sans ça la dialog se ferme immédiatement et le `pointer-events` du body peut rester coincé au démontage (cf. `RevokeApiKeyDialog`, `WorkspaceDetailDialog`).
2. **La description dit ce qui se passe**, pas « Êtes-vous sûr ? ». Nommer la cible, ce qui est détruit, ce qui est déplacé, et si c'est irréversible (`DeleteConnectionButton` annonce ce qui retombe sur le modèle par défaut de la Box).
3. **Copie** : anglais partout, **sauf le back-office `/admin`** qui est en français. Pas d'em dash.
4. **Le libellé de confirm reprend le verbe** : Delete / Purge / Revoke / Remove / Supprimer / Forcer. Jamais « OK ».
5. Les footers `AlertDialogContent size="sm"` sont en grille 2 colonnes sur `max-w-xs` : un libellé long y est tronqué.

## Vérification

```bash
# boutons destructifs qui déclenchent directement, à inspecter un par un
rg -n 'variant="destructive"' apps/ui --glob '!**/admin/buttons/**' -A3 | rg -n "onClick"
```

`cd apps/ui && pnpm ts-check` doit rester à 0. Prettier n'est pas uniforme sur `apps/ui` : formater à la main les lignes touchées, jamais `--write` sur un fichier entier.
