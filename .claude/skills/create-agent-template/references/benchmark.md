# Banc d'essai d'une template

Les 12 cartes « Harness Use Case » (21 au 26/10/2026) viennent toutes de templates testées une fois, sur le chemin heureux, avec un seul modèle. Les clients ont décroché ailleurs : un Skip, un « I need 10 », un « what's different from ChatGPT », un « Changes needed » sans motif. Le banc rejoue ces moments **avant** la capture. Pas de banc vert, pas de template.

## Principes

- **Vrais runs**, dans la Box sandbox, avec `send_message`. Jamais de rejeu simulé ni de modèle juge : c'est l'approche de #1505, abandonnée.
- **Je juge sur les tool calls** (`get_run` avec `includeToolCalls: true`), pas sur le texte. Un chiffre du livrable sans l'appel qui l'a produit compte comme inventé.
- **Une session par run**, sauf quand un scénario enchaîne sur un livrable (S4, S5) : il reprend alors la session d'un run S1 réussi.
- **Les données du propriétaire fictif sont réelles** : une vraie petite entreprise de la niche, avec son site, son compte public, son pays. Jamais `example.com` ni « Acme ». Je la choisis en Phase 1 et je la garde pour tout le banc.

## Budget, annoncé avant

Ordre de grandeur mesuré le 27/10 : 0,5 à 1 $ par run sur Rerun Max avec paid data. Le banc complet tourne autour de 10 runs. **Plafond par défaut : 8 $ par template.** Le récap de la Phase 2 annonce « Banc : N runs, ≈ X $ ». Au-delà du plafond, je m'arrête et je demande. Le coût réel de chaque run se lit dans `get_run`, je le reporte au fur et à mesure.

Le paid data dépense le vrai crédit du workspace, sans carte d'accord : dans chaque message de test, je demande un lot minuscule (2 ou 3 lignes) sauf en S3, où le volume est le sujet.

## Modèles

| Modèle | Scénarios | Facturé sur |
|---|---|---|
| Rerun Max (`rerun` / `rerun-max`) | tous | crédit Rerun de la sandbox |
| Un modèle d'une autre famille | S1 seulement | un abonnement de la sandbox (Claude `sonnet-5`, ChatGPT/Codex) trouvé dans `list_ai_connections`, sinon Rerun Smart |

Rerun Max est le modèle d'un essai, le plus prompt à livrer sans vérifier. Le second modèle compte parce que 7 des 12 clients tournaient sur Codex ou Claude, et qu'ils échouaient autrement (trop rigides, trop de questions).

Je fixe le modèle avec `update_agent({ connectionId, model })` et je lis `runsOn` dans la réponse. **Avant la capture, je remets `model: null`** : la template ne doit pas imposer de modèle.

## Les scénarios

Je joue S1, S2, S3, S4, S5, le témoin, et S6 / S7 quand ils s'appliquent.

| # | Scénario | Ce que j'envoie | Échec si | Vient de |
|---|---|---|---|---|
| S1 | **Install, chemin heureux** | l'INSTALL.md dans `<agent_install agent="{nom}">…</agent_install>`, puis les réponses du propriétaire fictif | pas de livrable au premier tour qui suit les réponses ; une donnée promise par le SOUL absente des tool calls ; une phrase signal (plus bas) | #1, #2, #9 |
| S2 | **Tout est passé** | l'install, puis chaque question de la carte répondue `[skipped]` | arrêt (« I can't without », « would be guesses »), nouvelle salve de questions, ou livrable sans hypothèse annoncée | #11 |
| S3 | **Plus qu'il n'en existe** | après un livrable de liste : « I need {3 × ce qu'il a livré} of them » plus un critère strict et plausible (prix, pays, intention d'achat) | rejets affichés (lignes ❌, « rejected »), éléments hors critères pour faire le compte, ou « zero » sec | #6, #7 |
| S4 | **Le défi** | dans la session d'un S1 réussi : « What can you do that ChatGPT can't? » | il concède, ou répond par une liste de capacités sans rien faire dans le tour | #5 |
| S5 | **Refus sans motif** | dans la session d'un S1 réussi : « Changes needed » (ou le clic du bouton de refus de sa carte) | il redemande quoi changer sans livrer de v2 | #8 |
| S6 | **Feu vert explicite** | seulement si le job agit dehors (envoyer, poster, rejoindre, publier) et que l'action est jouable dans la sandbox : « Go ahead, don't ask me before each one » | une carte d'approbation par petits lots après la levée | #3 |
| S7 | **Variante raisonnable** | une variante qu'un vrai client demanderait : autre réseau, autre format, autre pays, autre ton | refus, ou résultat qui contredit ses propres instructions | règle d'or 2 |
| T | **Témoin** | le message de S1, sur un coworker nu : même nom, SOUL = la `description` seule, ni install, ni skill, ni app, Rerun Max | voir « La porte » | #5 |

Attendus qui ne se devinent pas :

- **S2** : il annonce son hypothèse en une ligne (« I'm assuming you sell X in Y, from your email domain »), puis livre. Un Skip est une réponse.
- **S3** : ce qui passe d'abord, puis « N of M passed », puis les plus proches dans un bloc séparé, nommés comme tels avec le critère qu'ils manquent, puis ce qui en trouverait plus. Jamais un compte rempli avec des éléments qui ratent, jamais zéro quand des proches existent.
- **S4** : il **fait** dans le même tour : il tire une donnée réelle (son site, ses positions, sa niche) et sort une trouvaille chiffrée que le propriétaire n'a pas sous les yeux.
- **S5** : une v2 sur l'hypothèse la plus probable, annoncée en une ligne (« Less salesy and shorter, tell me if it was something else »).

### Répondre à une carte de questions

Les questions sont dans le dernier appel `ask_user` du run (`get_run` avec `includeToolCalls: true`). Je réponds avec `send_message` sur la même session, au format qu'envoie la carte :

```
Here are my answers:

**{question 1}**
{réponse, ou [skipped]}

**{question 2}**
{réponse, ou [skipped]}
```

Limite connue : chez l'auteur, le setup est déjà marqué terminé (`update_agent` avec `setup` le fait). La note de setup de l'engine et `install_complete` sont donc absents du banc. Je juge le comportement, pas la clôture de l'install.

## Grille d'un run

Un run passe quand tout est vrai :

1. Le livrable héros est là, concret, au niveau d'un pro du domaine.
2. Chaque donnée que le SOUL promet (volume, position, prix, demande, contact) sort d'un appel du run : je retrouve l'appel et sa valeur.
3. Aucune phrase signal, ni dans le texte, ni dans une quick reply :
   `haven't (checked|pulled|verified)` · `not (yet )?(checked|verified)` · `first[- ]pass` · `unverified` · `sample numbers` · `made[- ]up` · `provisional` · `general benchmark` · `can't (yet )?confirm` · `would be guesses`.
4. Aucune app réclamée avant le résultat, aucune question dont la réponse ne change pas le livrable.
5. Le coût reste raisonnable pour une démo : pas d'appels payants redondants (le même appel rejoué, un pays par appel sur douze pays sans y être invité). Le crédit dépensé par run est noté.

## La porte

Le banc est **vert** quand :

- S1 passe 3/3 sur Rerun Max et 1/1 sur le second modèle ;
- S2 à S7 passent, chacun sur le run joué ;
- la template **bat le témoin** : son livrable porte des données vérifiées que le témoin n'a pas, ou il est nettement plus spécifique au propriétaire. Si le témoin fait aussi bien, la template n'apporte rien : je reprends le livrable héros ou ce qu'elle sait faire de plus, au lieu d'ajouter du texte ;
- le coût total tient dans le budget.

**Rouge** : je corrige la pièce en cause (SOUL, INSTALL.md, skill, jamais le prompt commun), puis je rejoue le scénario rouge **et** un S1 (une correction peut casser le chemin heureux). **Trois tours de correction au maximum.** Toujours rouge après : pas de capture, `status: "partial"`, et le compte rendu dit quel scénario échoue, avec la phrase ou l'appel qui le prouve.

Une correction respecte les budgets de longueur. Si un scénario ne passe qu'en ajoutant une règle par cas, je cherche le défaut qui le couvre (règle d'or 2).

## Rapport

Un fichier `.context/template-bench/{nom-de-l-agent}/bench.md`, tenu à jour pendant le banc :

```
| Scénario | Modèle | Run | Verdict | Preuve | Coût |
|---|---|---|---|---|---|
| S1 | rerun-max | 1 | ✅ | paid_data seo.serp ×2, positions citées | 0,62 $ |
| S3 | rerun-max | 1 | ❌ | « 7 more that don't quite fit » ajoutés au compte | 0,48 $ |
```

Puis, après chaque tour de correction, la pièce changée et le diff en une ligne.

## Nettoyage

- `delete_agent` sur le témoin.
- `update_agent({ model: null })` sur l'agent.
- Les sessions du banc restent, mais leurs traces (fichiers dans `workspace/`, tables dans `data/agent.db`) vont dans l'`exclude` de la capture.
