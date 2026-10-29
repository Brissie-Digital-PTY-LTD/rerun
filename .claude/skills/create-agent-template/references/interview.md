# L'interview : peu de questions, toutes avec une recommandation

Le but n'est pas de tout demander, c'est de faire trancher à l'auteur **les choix qui changent le build**. Tout le reste, je le décide et je l'annonce dans le brief.

Contraintes : `AskUserQuestion`, ≤ 4 questions par round, 2 rounds, 3 au maximum, ≤ 12 questions au total. Option recommandée en premier, suffixée « (Recommandé) ». Chaque option a une description d'une ligne qui dit **ce que le choix change**. Les questions sont en français, les formulations proposées pour l'agent en anglais.

## Pré-calcul (phase 1, sans rien demander)

Pour chaque sujet, je remplis cette fiche en interne avant le round 1 :

| Champ | Comment je le trouve |
|---|---|
| Livrable héros | L'objet fini qu'un pro rendrait. « Créer un carrousel TikTok » → 6 à 8 slides prêtes à poster + légende + hashtags. « Trouver des leads » → une table de prospects qualifiés avec la raison du fit. |
| Audience | La personne qui installe, pas l'équipe qui ferait le travail. → une catégorie de `TEMPLATE_CATEGORIES`. |
| Premier résultat sans connexion | Ce que l'agent peut montrer avec une URL publique ou un exemple : le site du propriétaire, son handle public, une niche. |
| Déclencheur | À la demande si le besoin est ponctuel ; récurrent si le livrable a une fraîcheur (veille, reporting, contenu régulier) ; webhook si un outil externe produit l'événement. |
| Atterrissage | Fichier livré (`publish_file`), app (connecteur), ou site sans API (→ computer use). |
| Apps candidates | `search_connectors` par capacité. Une par rôle. |
| Paid data | Groupes utiles selon `capabilities.md`. |
| Computer use | Grille de `capabilities.md`. |
| Ce qui varie d'un propriétaire à l'autre | Les 2 à 5 préférences qui changent vraiment le livrable (marque, ton, cible, cadence, destination). C'est la matière de l'INSTALL.md. |

## Round 1 — le job et les deux curseurs

**Q1. Promesse.** « Quelle promesse porte l'agent ? » — 2 à 3 formulations du livrable héros, de la plus étroite à la plus large. Je recommande celle qui produit un résultat visible en moins de 5 minutes.

**Q2. Déclencheur.**
- À la demande — l'utilisateur demande, l'agent livre.
- Récurrent — « {cadence proposée}, ex. tous les lundis 9 h » ; un schedule est créé, l'install fait confirmer cadence et fuseau.
- Les deux — à la demande + une cadence proposée pendant l'install, sans schedule précréé.
- Webhook — seulement si le sujet le dit (un formulaire, un outil qui pousse un événement).

**Q3. Cadrage du process** (ce que je mets dans le skill d'agent) :
- **Ouvert** — SOUL seul, pas de skill. Pour un job créatif ou qui change à chaque demande. L'agent s'appuie sur son jugement.
- **Guidé** — un skill de méthode : ce qui fait un bon livrable, les pièges, les sources à consulter. Aucune étape imposée. *Recommandé par défaut.*
- **Cadré** — un skill avec étapes et format de sortie, plus une clause « si l'utilisateur veut autrement, suis l'utilisateur ». Pour un livrable dont la forme fait la valeur (un rapport, une table de leads scorée par le propriétaire, un audit).

Je recommande Cadré seulement quand la **forme** du livrable est la promesse ; Ouvert quand la variété est la promesse.

**Q4. Profondeur de l'install** (combien l'agent interroge son futur propriétaire) :
- **Express** — 0 ou 1 question, un résultat dès le premier message, les apps proposées au moment où elles servent. Pour un lead magnet qui doit faire « waouh » en 2 minutes. INSTALL.md ≤ 80 mots.
- **Standard** — 2 ou 3 préférences qui changent vraiment le résultat, une app clé connectée, un test réel. *Recommandé par défaut.* ≤ 150 mots.
- **Guidée** — jusqu'à 5 points (marque, cible, cadence, destination, validation), test réel complet. Pour un agent récurrent branché sur plusieurs apps. ≤ 250 mots.

Je recommande Express pour un job créatif ponctuel, Standard pour la plupart, Guidée seulement si l'agent tourne seul ensuite (schedule) avec des actions sortantes.

## Round 2 — les capacités

**Q5. Apps du catalogue** (multiSelect). Les candidates de ma recherche, format « {Nom} — {rôle : lit / fait / publie} », au plus 3 pré-recommandées, une par rôle. Plus l'option « Aucune déclarée : l'agent trouvera dans le catalogue celles que le propriétaire utilise déjà ».
- Déclarer une app : son logo apparaît sur la page de la template, l'install la propose au moment où elle débloque le résultat. À recommander quand l'app *est* le produit (TikTok, HubSpot, Meta Ads).
- Aucune déclarée : install plus courte, l'agent s'adapte aux outils du propriétaire. À recommander quand la capacité a beaucoup de fournisseurs équivalents (email, CRM, stockage).

Dans tous les cas le catalogue reste ouvert en runtime (`hub` + `suggestService`) : c'est ce qui permet à l'agent de proposer Outlook à qui n'utilise pas Gmail, et de faire connecter les apps pendant l'install. Je ne le coupe pas.

**Q6. Paid data.**
- On — « pour {usage concret : trouver les emails des décideurs / lire les 30 derniers posts d'un compte} », chaque dépense validée par l'utilisateur en crédits.
- Off — le web gratuit suffit.
La recommandation suit la grille de `capabilities.md`. Je nomme toujours l'usage, jamais « au cas où ».

**Q7. Computer use.**
- On — « pour {publier sur TikTok / remplir le formulaire / opérer Canva} sous les yeux de l'utilisateur ».
- Off — tout passe par connecteurs, web et fichiers.

## Round 3 — seulement si une réponse manque vraiment

À poser seulement si le sujet comporte une action sortante ou une contrainte que je ne peux pas déduire :

- **Validation avant d'agir** : « L'agent publie / envoie / dépense seul, ou montre d'abord ? » — je recommande toujours « montre d'abord » pour une première version de template ; l'engine impose déjà l'accord avant un envoi final sur un site.
- **Contrainte métier réelle** citée par l'auteur (un pays, une langue de livrable, un volume).
- **Prix** : seulement si l'auteur a parlé de template payante. Sinon `free` sans question.

## Ce que je ne demande jamais

- Le nom de l'agent, la description, le titre marketplace, la catégorie, les tags : je les propose dans le brief, l'auteur corrige s'il veut.
- Des préférences du futur propriétaire (son ton, sa cible) : c'est le rôle de l'INSTALL.md.
- Des seuils, scores ou formats que le sujet ne donne pas.
- Une confirmation de chaque étape du build : un seul OK, sur le brief.

## Si l'auteur répond « Other »

Je reformule sa réponse en une ligne dans le brief et je l'applique. Si elle contredit une règle d'or (ex. « mets un process en 15 étapes »), je l'applique dans l'esprit (un skill Cadré, la clause d'adaptation incluse) et je le signale dans le brief.
