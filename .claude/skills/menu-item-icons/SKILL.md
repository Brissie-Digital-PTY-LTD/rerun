---
name: menu-item-icons
description: Décider quels items d'un menu (DropdownMenu, ContextMenu, menu « ⋯ », sous-menu) reçoivent une icône et lesquels n'en ont pas, selon la règle Apple HIG et la recherche sur les icônes. Une icône sert à repérer un item plus vite, jamais à décorer, donc on n'en met pas partout. Utiliser dès qu'on écrit ou refond un menu, qu'on ajoute un DropdownMenuItem / ContextMenuItem, qu'on hésite à poser une icône sur une option, ou qu'on audite un menu où « tout a une icône ».
---

# menu-item-icons : une icône par item seulement si elle aide à le trouver

Une icône dans un menu a **un seul rôle** : faire repérer l'item plus vite pendant le balayage. Elle n'explique rien (c'est le libellé qui donne le sens) et elle ne décore pas. Deux conséquences :

- une icône **ambiguë** coûte plus qu'elle ne rapporte : l'œil s'arrête dessus pour rien ;
- une icône **sur chaque item** n'aide plus personne : quand tout a une icône, plus rien ne ressort. C'est le reproche fait à macOS Tahoe, qui en a mis partout.

Le libellé reste toujours là. Jamais d'item avec une icône seule dans un menu vertical.

## Le test, item par item

Mettre une icône **seulement si au moins un** de ces cas est vrai :

| # | Cas | Exemples Rerun |
|---|---|---|
| 1 | **Icône standard**, reconnue en moins d'une seconde par n'importe qui | Settings (engrenage), Delete (corbeille), Download, Copy, Share, Search, Sign out, Info |
| 2 | **Objet concret** que l'item désigne | un dossier, un fichier, un coworker (AgentBuddy), une app connectée (son logo), un workspace |
| 3 | **Action visuelle**, qui se dessine | trier, pivoter, aligner, agrandir, épingler |
| 4 | **Action clé** de la surface, la plus utilisée du menu, *et* une icône claire existe | New coworker, Invite |

Sinon : **pas d'icône**. Exemples typiques sans icône : « Change wallpaper », « Edit widgets », « Clean up by… », « Move to another Box », « Mark all as read », tout libellé abstrait ou propre à Rerun pour lequel il faudrait inventer une métaphore.

Raccourci de décision : **si on hésite entre deux glyphes, ou si on doit expliquer pourquoi ce glyphe, il n'en faut pas.**

## Les règles qui vont avec

1. **Même action = même icône partout dans l'app.** Avant de choisir, chercher l'icône déjà utilisée pour cette action (voir Vérification). Une même action dessinée de trois façons ne s'apprend jamais.
2. **Une icône = une seule action.** Si le glyphe sert déjà à autre chose dans l'app, en prendre un autre ou ne rien mettre. Exemple : `HistoryIcon` est réservé à « Version history », « Weekly Rewind » a pris `RewindIcon`.
3. **Les libellés restent alignés.** Dans un menu où certains items ont une icône, les items sans icône réservent la colonne vide, pour que le texte forme une seule colonne :
   - `DropdownMenuItem`, `DropdownMenuSubTrigger`, `DropdownMenuLabel` : prop `inset` (`pl-7` = padding 6 + icône 16 + gap 6). Ne passer `inset` que quand il vaut vrai : `inset={false}` pose `data-inset="false"`, et le style se déclenche quand même.
   - Un menu dont les items portent `gap-2` (le menu workspace) décale le texte à 30 px : la ligne sans icône y prend `pl-7.5`, pas `inset`.
   - `ContextMenuItem` n'a ni `inset` ni taille d'icône par défaut : icône en `className="size-4"`, item sans icône en `className="pl-7"`.
   - Si **aucun** item du menu n'a d'icône, pas d'`inset` : le menu reste compact.
   - `DropdownMenuContent` prend la largeur de son trigger : derrière un bouton icône, ajouter `w-auto` (et `whitespace-nowrap` sur les items) pour que les icônes ne fassent pas passer les libellés à la ligne.
4. **Groupe homogène quand c'est possible.** Apple demande « tout le groupe ou rien ». En pratique la règle d'avant gagne : on ne force pas une icône douteuse pour compléter un groupe (le Finder lui-même laisse « Change Wallpaper » sans icône à côté de « Get Info »). Si un groupe n'a qu'un seul item qui mérite une icône, se demander si ce groupe en a besoin d'une.
5. **Destructif** : `variant="destructive"` porte déjà la couleur. La corbeille sur Delete est OK (cas 1), pas d'icône d'alerte en plus.
6. **Sous-menu** : le chevron est posé par `DropdownMenuSubTrigger`, ne pas en ajouter. Le libellé du sous-menu suit le même test que les autres items.
7. **Cases à cocher et radios** (`DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`) : le check est l'indicateur, pas d'icône d'item en plus sauf cas 2 (ex. le logo de chaque app dans un choix d'app).
8. **Taille et style** : glyphes Nucleo du shim `@/lib/icons`, taille par défaut du primitive (`size-4`), couleur héritée. Pas de couleur par item, pas d'icône pleine au milieu d'outline.

## Choisir le glyphe

- Passer par le skill `nucleo-icons` : si le glyphe juste n'est pas dans le shim, on l'ajoute depuis le pack, on ne prend pas le moins pire déjà importé.
- Icônes bannies : `Sparkles`, `BotIcon`, `Plug` (voir la mémoire du projet). Un coworker se dessine avec `AgentBuddy`, jamais avec une icône générique.
- Une icône qu'on n'arrive pas à trouver dans le pack est un signal pour « pas d'icône », pas pour un glyphe approximatif.

## Squelette

```tsx
<DropdownMenuContent align="end">
    <DropdownMenuItem onSelect={onNewFolder}>
        <FolderPlusIcon /> New folder
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={onInfo}>
        <InfoIcon /> Get info
    </DropdownMenuItem>
    <DropdownMenuItem inset onSelect={onRename}>Rename</DropdownMenuItem>
    <DropdownMenuSub>
        <DropdownMenuSubTrigger inset>Move to</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>…</DropdownMenuSubContent>
    </DropdownMenuSub>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onSelect={onDelete}>
        <Trash2Icon /> Delete
    </DropdownMenuItem>
</DropdownMenuContent>
```

Anti-patterns :

```tsx
// ❌ une icône par item « pour faire joli », métaphores inventées
<DropdownMenuItem><WandIcon /> Clean up by</DropdownMenuItem>
<DropdownMenuItem><LayersIcon /> Move to another Box</DropdownMenuItem>

// ❌ libellés décalés : item sans icône sans inset au milieu d'items avec icône
<DropdownMenuItem><SettingsIcon /> Settings</DropdownMenuItem>
<DropdownMenuItem>Rename</DropdownMenuItem>

// ❌ même glyphe pour deux actions différentes du produit
<DropdownMenuItem><HistoryIcon /> Weekly Rewind</DropdownMenuItem>
<DropdownMenuItem><HistoryIcon /> Version history</DropdownMenuItem>

// ❌ icône seule dans un menu vertical
<DropdownMenuItem aria-label="Delete"><Trash2Icon /></DropdownMenuItem>
```

## Vérification

- Relire le menu fini en ne regardant **que** les icônes : chacune doit pointer vers un item sans lire le texte. Celles qui ne le font pas sautent.
- Retrouver l'icône déjà utilisée pour une action avant d'en choisir une (remplacer `Rename`) :
  ```
  rg -n -B2 -A2 "Rename" -g '*.tsx' apps/ui packages | rg "MenuItem|Icon"
  ```
- Repérer les menus mixtes sans `inset` (items avec et sans icône dans un même fichier) :
  ```
  rg -n -P -U -g '*.tsx' "<DropdownMenuItem(?![^>]*inset)[^>]*>\s*[A-Za-z]" apps/ui packages
  ```
  Un match dans un fichier dont d'autres items portent une icône = ajouter `inset`. Le motif est bruité (un `=>` dans `onSelect` coupe la balise), confirmer à l'œil.
- Vérifier le rendu en clair et en sombre, et sur mobile (~375px) : le menu ne déborde pas, les libellés longs passent à la ligne ou sont tronqués volontairement.

## Pourquoi (sources)

- **Apple HIG, Menus** : « Use menu item icons sparingly and with purpose », icônes pour les actions courantes et clés, les emplacements de fichiers, les appareils connectés, les concepts visuels, le contenu créé par l'utilisateur ; « Don't display an icon if you can't find one that clearly represents the menu item » ; tout le groupe ou rien. https://developer.apple.com/design/human-interface-guidelines/menus
- **Microsoft, guide Windows (Menus, section Icons)** : icônes pour les items les plus utilisés, les icônes standard, celles qui illustrent bien la commande ; « don't feel obligated to provide them for all menu items. Cryptic icons aren't helpful, create visual clutter ». https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-menus
- **Byrne (1993)**, *Using icons to find documents: simplicity is critical* (INTERCHI) : les icônes simples accélèrent la recherche visuelle, les complexes non.
- **McDougall, Curry et de Bruijn (1999)** : normes sur 239 symboles (familiarité, concrétude, complexité, distance sémantique) ; à l'usage, la familiarité domine.
- **Wiedenbeck (1999)**, *Behaviour & Information Technology* : icône seule moins bonne que libellé seul ou icône + libellé ; l'icône apporte du repérage, pas du sens.
- **NN/g, Icon Usability (Harley, 2014)** : très peu d'icônes sont universelles, les autres ont besoin d'un libellé.
- **tonsky, It's hard to justify Tahoe icons** : critique de macOS Tahoe, une icône partout efface le bénéfice, et la même action dessinée de dizaines de façons. https://tonsky.me/blog/tahoe-icons/

## Rappels

- Libellés UI en anglais, en sentence case, sans em dash. Ellipse « … » seulement si l'item ouvre une saisie avant d'agir.
- Retour UI sur un item précis = ne toucher que cet item, pas re-iconiser tout le menu « par cohérence ».
