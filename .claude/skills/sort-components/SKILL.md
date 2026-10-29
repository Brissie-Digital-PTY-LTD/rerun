---
name: sort-components
description: Garder apps/ui/components rangé par feature (agent/, space/, chat/, dialogs/, layout/, ui/). Utiliser pour placer un nouveau composant au bon endroit, ou quand la racine de components/ se remet à déborder de fichiers à plat et qu'il faut re-trier.
---

# sort-components — ranger les composants UI par feature

Les composants de `apps/ui/components/` doivent **toujours** être rangés dans un sous-dossier par **domaine fonctionnel**, jamais laissés à plat à la racine. Cette racine s'était retrouvée avec 56 fichiers à plat ; on l'a réorganisée. Ce skill sert à **maintenir** cette organisation : placer correctement un nouveau composant, ou re-trier quand ça redéborde.

## Structure canonique

```
apps/ui/components/
  agent/        Panneau agent + tous ses onglets (chat, files, skills, tools, mcp,
                scheduled, settings, memories, data) + formulaires/modèles liés à l'agent
  space/        Panneau space + fichiers de space
  chat/         Sessions (tabs, history) + blocs de message (ToolCall, Reasoning,
                Approval, attachments, mentions)
  dialogs/      Modales de création / suppression / onboarding
  layout/       Shell de page : HomeContent, IsoBoard, Toolbar, Logo
  ui/           Primitives bas-niveau (button, input, dialog, card…) + placeholders génériques
  ai-elements/  Composants de conversation (prompt-input, message, conversation, reasoning…)
  services/     Install / config / liste de services
  auth/         Décor de la page auth
```

## Règle de placement (nouveau composant)

1. **Est-ce une primitive générique** (réutilisable, sans logique métier : bouton, input, placeholder) ? → `ui/`.
2. **Est-ce de la conversation pure** (rendu de message, input de prompt) ? → `ai-elements/`.
3. Sinon, range par **feature** : ça concerne un agent → `agent/` ; un space → `space/` ; les sessions/blocs de chat → `chat/` ; une modale → `dialogs/` ; le shell global → `layout/`.
4. Dans le doute entre feature et type, **la feature gagne** (on regroupe par domaine, pas par nature technique).

> Ne JAMAIS créer un fichier `.tsx` directement à la racine de `components/`.

## Conventions d'import

- Imports inter-fichiers en **alias absolu** : `@/components/<dossier>/<Fichier>` (le repo a `@/*` → `./*` dans [tsconfig.json](apps/ui/tsconfig.json)). Pas de `./Foo` / `../Foo` relatifs fragiles.
- Les primitives `ui/` et `ai-elements/` s'importent aussi en absolu (`@/components/ui/button`).

## Re-trier quand la racine déborde

Quand des fichiers réapparaissent à plat dans `components/` :

1. **Cartographier** : `ls apps/ui/components/*.tsx` → lister les fichiers à plat.
2. **Affecter** chaque fichier à son dossier feature selon la règle ci-dessus.
3. **Déplacer avec `git mv`** (préserve l'historique) vers le bon sous-dossier.
4. **Réécrire les imports** vers chaque fichier déplacé en alias absolu `@/components/<dossier>/<Fichier>`. Penser à :
   - les **imports relatifs** `./Foo` / `../Foo` entre voisins,
   - les **imports relatifs vers les sous-dossiers existants** (`./ui/...`, `./services/...`) qui cassent dès que le fichier change de niveau,
   - les **références externes** depuis `apps/ui/app/`.
   - Repérer le tout : `grep -rnE "@/components/|from ['\"]\.{1,2}/" apps/ui --include="*.tsx" --include="*.ts"`.
5. Supprimer les sous-dossiers vides.

Pour un re-tri massif, un petit script Python (mapping basename→dossier, `git mv`, puis regex de réécriture des imports en triant les bases **du plus long au plus court** pour ne pas remplacer `AgentPanel` dans `AgentPanelChat`) est plus sûr qu'à la main.

## Vérification

- `cd apps/ui && npx tsc --noEmit` → **exit 0** prouve que tous les imports résolvent (c'est le contrôle décisif).
- `npm run lint` → aucune nouvelle erreur de résolution de module (`import/no-unresolved`). Ignorer les erreurs de code-quality préexistantes (`no-explicit-any`, hooks).
- `git status --short` → les fichiers apparaissent en **renames** (`R`), pas en delete+add : l'historique est préservé.
