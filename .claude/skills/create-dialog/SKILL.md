---
name: create-dialog
description: Créer une dialog dans apps/ui avec les primitives existantes, sur une seule colonne : DialogContent pour un formulaire court, PanelDialogContent pour une dialog qui tient une liste (modèle AiProvidersDialog). Le cadre 2 colonnes (SplitDialogContent) n'est plus qu'une exception pour une preview vivante. Utiliser dès qu'on crée ou refond une dialog de l'app.
---

# create-dialog — créer une dialog conforme au pattern maison

Toute nouvelle dialog est **sur une seule colonne**. Les dialogs à deux colonnes avec un explainer à droite ont été jugées lourdes (retour du 14/10/2026).

**Aucune brique inventée.** Une dialog s'assemble avec ce que le kit (`/render/kit`, `app/render/kit/surfaces/`) montre déjà : `PanelRow`, `PanelList`, `PanelSection`, `PanelSteps`, `EmptyState`, `Alert`, `Badge`, `Icon`, `Progress`, `Field`, `Button`. Pas de couleur de marque en dur, pas de halo, d'avatar coloré, de chip ou de tuile maison, pas d'animation ajoutée : un rendu « fait main » est lu comme de l'AI slop.

## Deux cadres, tous deux existants

| Dialog | Cadre | Référence |
|---|---|---|
| Formulaire court (renommer, créer une chose simple) | `DialogContent` nu, `DialogHeader` / `DialogFooter` par défaut | kit, section « Dialog » |
| Liste avec drill-in (comptes, connexions, réglages) | `PanelDialogContent` + `PanelSteps` | `AiProvidersDialog.tsx`, `LinkedinProDialogView.tsx` |

## Squelette d'une dialog à liste

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
    <PanelDialogContent className="sm:max-w-xl">
        <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>LinkedIn Pro</DialogTitle>
            <DialogDescription>One short line.</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">
            <PanelSteps stepKey={page} depth={page === 'list' ? 0 : 1}>
                {page === 'list' ? (
                    <PanelScroller className="space-y-6 p-4">
                        <Group title="Accounts" addMenu={<AddButton onClick={add} />}>
                            <PanelRow leading={<Icon size="sm" … />} title="…" description="…" actions={<Badge size="xs" tone="green">Ready</Badge>} />
                        </Group>
                    </PanelScroller>
                ) : (
                    <>
                        {/* en-tête de page : bouton retour + icône + titre + hint, cf. ProviderHeader */}
                        <PanelScroller className="space-y-4 p-4">{/* formulaire, bouton d'action aligné à droite */}</PanelScroller>
                    </>
                )}
            </PanelSteps>
        </div>
    </PanelDialogContent>
</Dialog>
```

`Group`, `EmptyPitch` et `AddButton` sont exportés par `components/connections/AiProvidersPanel.tsx` : les réutiliser, ne pas les recopier.

## Règles de cohérence

1. **Primitives shadcn** : `Dialog`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` depuis `components/ui/dialog`. Ne pas rajouter de composite maison dans `components/ui/dialog.tsx`, ce fichier reste une copie fidèle de shadcn.
2. **Logo d'un service** : `<Icon {...serviceIconProps(service.icon, service.category)} />` avec la ligne du catalogue (`useCatalogServices`), comme la bibliothèque d'apps. Jamais un SVG de marque redessiné.
3. **Statuts** : `Badge` partagé avec un `tone`. Avertissements : `Alert`. Liste vide : `EmptyPitch` dans un groupe, ou `EmptyState`.
4. **Ouvrir une ligne** : la page glisse un niveau plus bas avec `PanelSteps`, jamais un swap sec.
5. **Boutons interdits** : désactivés avec `TooltipDisabledReason`. Actions risquées : `ConfirmDialog`.

## Variante wizard

- Le stepping vient de `@rerun/ui/steps` : `useStepper`, `StepperBar`, `StepTransition`. Ne jamais réécrire les barres de progression à la main.
- Header : `StepDialogHeader` (`apps/ui/components/dialogs/StepDialogHeader.tsx`).
- `StepTransition` remonte tout son sous-arbre à chaque step : un hook qui doit survivre au passage d'une étape à l'autre se déclare dans le shell.
- Deux entrées qui parcourent le même wizard partagent le corps ET le footer dans un composant unique (cf. `CaptureStepPanel`).

## Exception : le cadre 2 colonnes

`SplitDialogContent` ne sert plus qu'à une **preview vivante qui reflète la saisie** (ex. `CreateAgentPreview` avec `IsoGrid`). Jamais pour un explainer statique. Les dialogs 2 colonnes existantes (`CreateSpaceDialog`, `CreateTemplateDialog`, `CaptureAgentsDialog`…) restent telles quelles jusqu'à ce qu'on les reprenne.

Les confirmations simples (delete, clear, close tab) restent sur `ConfirmDialog`.

## Rappels

- Tous les labels UI en anglais.
- Pas de em dashes dans les textes.
- Composant client (`'use client'`) comme les autres dialogs.
- Responsive dès la première version : vérifier à 375, 768, desktop et sur 700 px de haut.
- Ne jamais utiliser l'icône Lucide `Sparkles` (bannie).
