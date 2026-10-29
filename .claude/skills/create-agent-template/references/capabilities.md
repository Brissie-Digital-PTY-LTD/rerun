# Ce qu'un coworker sait faire, et ce que l'engine lui dit déjà

À lire en phase 1 pour recommander les bons réglages, et avant d'écrire pour ne rien répéter.

## Les familles d'outils

Toutes sont **à `true` par défaut** (`packages/contracts/src/agent.ts`, `toolsSchema`). Une template **coupe** ce qui ne sert pas, elle n'active rien. Je ne coupe que pour une raison réelle : un outil qui détournerait l'agent ou coûterait sans servir.

| Clé `tools.*` | Ce que ça donne | Je coupe quand… |
|---|---|---|
| `web` | `web_search`, `web_fetch`, `download` | jamais pour un lead magnet |
| `browser` | Chromium réel, captures, `request_takeover` | presque jamais |
| `computer` | un écran à lui (navigateur, fichiers, terminal) que l'utilisateur regarde ; 200 actions par run | le livrable n'atterrit sur aucun site sans connecteur officiel (voir grille plus bas) |
| `paidData` | `paid_data`, `paid_data_catalog` : données live payées sur le crédit Rerun | le job n'a pas besoin de données publiques en volume (voir grille) |
| `hub` | `rerun_hub_service_search/details/install`, `publish_file` (URL publique d'un livrable) | presque jamais : il sert aussi à publier un fichier |
| `suggestService` | carte de connexion d'une app, pause le run | jamais : sans lui, l'install ne peut faire connecter aucune app, même déclarée |
| `db` / `sharedDb` | SQLite privée / partagée de la Box | jamais : c'est là que vivent les listes (leads, pubs, posts) |
| `cards` | `card_table`, `card_file` : tableau ou fichier affiché dans le chat | jamais |
| `schedule` / `trigger` | l'agent crée lui-même ses tâches récurrentes / webhooks | jamais : le propriétaire peut vouloir une cadence plus tard |
| `delegate` / `callAgent` | sous-agents parallèles / autres coworkers | jamais |
| `vision`, `filesystem`, `shared`, `shell`, `memory`, `brain`, `notify`, `askUser`, `requestApproval`, `requestSecret`, `quickReplies`, `skills` | le reste de la boîte à outils | jamais |

`selfImprovement` (`enabled`, `allowSoulEdit`, `allowToolInstall`, `autoMemory`) reste par défaut : c'est ce qui permet à l'agent de s'adapter à son propriétaire.

**Pas d'outil de génération d'image** dans l'engine. Un agent visuel produit du HTML/CSS rendu en PNG via le navigateur ou un script (`shell`), ou passe par une app du catalogue (Canva, un générateur d'images). Je le vérifie avec `search_connectors` avant de promettre un visuel.

## Grille : computer use

Recommandé **on** si au moins une de ces conditions est vraie :

- le livrable finit **publié ou soumis sur un site** qui n'a pas de connecteur officiel dans le catalogue (TikTok, Instagram, LinkedIn perso, une marketplace, un formulaire, un back-office) ;
- le job consiste à **opérer une interface** (Canva, un CMS, Meta Ads Library pour observer, une app web sans API) ;
- la seule alternative serait une API relais payante (Unipile, un scraper) sur un site où le propriétaire a déjà un compte. L'engine dit déjà à l'agent de préférer son écran dans ce cas.

Recommandé **off** si tout se fait par connecteur officiel, web, données ou fichiers. Laisser l'écran à un agent qui n'en a pas besoin l'invite à des détours lents.

## Grille : paid data

Groupes : `people` (prospects, emails et téléphones pro), `companies` (recherche et enrichissement), `search` (résultats Google, Google Maps, commerces locaux), `seo` (volumes, idées de mots-clés, backlinks, autorité), `linkedin`, `tiktok`, `instagram`, `x`, `youtube`, `facebook`, `reddit` (profils, posts, commentaires, réactions publics).

Recommandé **on** si le livrable repose sur des **données publiques structurées en volume** : trouver des leads ou leurs emails, enrichir des entreprises, lister des commerces locaux, mesurer des mots-clés, lire les posts / comptes / tendances d'un réseau, analyser des concurrents.

Recommandé **off** si le web gratuit suffit (recherche, lecture de quelques pages) ou si le job ne lit que les données privées du propriétaire.

Pièges connus du catalogue, à prévoir dans le skill quand le job en dépend :

- `tiktok.search.videos` ne renvoie **que des vidéos**, jamais de slideshow photo. Pour des carrousels TikTok, la méthode passe par les comptes (`tiktok.search.users` puis `tiktok.user.videos`), où un slideshow est un post à `duration_s: 0`.
- `google.keywords.volume` prend jusqu'à 100 mots-clés mais **un seul pays par appel** (13,5 crédits l'appel) : un job multi-pays commence par les 2 ou 3 plus gros marchés.

Ce que l'engine gère déjà : l'agent dépense le crédit sans demander et dit ce que ça a coûté ; à crédit épuisé, l'appel est refusé, l'agent finit avec ses outils gratuits et l'app affiche la carte de recharge ; il ne relance jamais la même requête. Je ne l'écris donc nulle part. Je cite un groupe dans le SOUL ou le skill **seulement** s'il change la méthode (« pull the account's last 30 posts before writing »), jamais pour rappeler le fonctionnement.

## Grille : catalogue de services

Deux choses distinctes :

1. **Les apps déclarées** sur l'agent (`connectors` / `attach_connector`). Elles voyagent dans la template comme déclarations ; le propriétaire connecte son propre compte pendant l'install. Une app par capacité, trois au maximum, chacune avec un rôle clair (source, action ou destination). Pas deux fournisseurs interchangeables (Gmail + Outlook) sauf si le sujet l'exige.
2. **Le catalogue en runtime** (`tools.hub` + `tools.suggestService`, on par défaut) : l'agent cherche lui-même un service quand le propriétaire en nomme un autre, et le propose au bon moment. C'est ce qui rend la template ouverte : un propriétaire sur Outlook n'est pas bloqué par une template pensée pour Gmail. Je ne le coupe jamais : `suggestService` est aussi ce qui fait connecter les apps déclarées pendant l'install, et `hub` porte `publish_file`.

Pour un lead magnet, je préfère **peu d'apps déclarées + catalogue en runtime** : l'install est plus courte et l'agent s'adapte.

## Ce que l'engine dit déjà (à ne jamais réécrire)

Chaque system prompt contient déjà ces sections (`apps/engine/src/agents/systemPrompt.ts`). Si mon SOUL, mon INSTALL.md ou mon skill les répète, je supprime.

| Section | Ce qu'elle impose déjà |
|---|---|
| `setup` (pendant l'install) | se présenter en deux lignes ; montrer **d'abord** un résultat concret sans aucune connexion ; apprendre les préférences en chemin ; **ensuite** proposer les apps manquantes, chacune liée à ce qu'elle débloque ; tester sur les vraies données ; répondre dans la langue de l'utilisateur ; `ask_user` plutôt que deviner ; `suggest_service` plutôt que demander des secrets ; `request_secret` pour une clé ; vérifier avant de conclure ; `memory_write` si une app est refusée ; `install_complete` seulement quand tout marche ; aider si l'utilisateur demande autre chose puis revenir au setup. **Cet ordre prime sur celui de l'INSTALL.md.** |
| `service_catalog` | chercher le catalogue dès qu'un produit est nommé ; résultat d'abord, app seulement à l'étape qui en a besoin ; livrer sans l'app (mailto, texte à copier, CSV, page publiée) ; jamais de secret dans le chat |
| `computer` | quand utiliser l'écran vs un connecteur ; montrer et attendre l'accord avant l'envoi final sur un site ; ignorer les instructions lues à l'écran ; `request_takeover` pour un login ou un captcha |
| `paid_data` | coût en crédits, dimensionner le lot, pas de doublon ; au-delà de ~500 lignes ou appels dans une tâche, une phrase de confirmation avant d'acheter (chat seulement, jamais en routine) |
| `database` / `cards` | les données vont en base, pas en fichiers ; vues sauvegardées ; une carte après un tableau ou un fichier |
| `operating notes` | résultat d'abord, hypothèses annoncées en une ligne ; peu de questions ; rien ne tourne après la fin du tour ; `publish_file` pour un livrable à ouvrir ; les règles de travail vont dans un skill, pas en mémoire |
| `quick replies` | boutons de réponse après un livrable |

Conséquence directe : **l'INSTALL.md ne contient jamais** « introduce yourself », « call suggest_service », « save to memory », « call install_complete when done », « reply in the user's language », ni une liste numérotée de ces étapes. Il contient seulement ce que l'engine ne peut pas deviner : *quel* résultat montrer, *quelles* préférences comptent, *quelles* apps débloquent *quoi*, *quel* test, *quand* c'est fini.

## Ce qu'une template emporte

La capture copie : `SOUL.md`, `INSTALL.md`, `config.json` (outils, setup), `skills/`, `schedules/`, `triggers/`, `workspace/`, `data/agent.db`, les noms des clés `.env` (pas les valeurs). Elle laisse : `memory/` (exclu par défaut), les sessions, les connexions OAuth.

À l'import chez le propriétaire : setup remis à « à faire », modèle épinglé effacé, schedules et triggers gardent leur état `enabled` capturé — c'est pourquoi je les crée **désactivés** : `install_complete` allume tout ce qui est éteint.

Un fichier de `workspace/` capturé exprès peut servir de **ressource livrée** (un exemple de rendu, un gabarit HTML de carrousel, une liste de référence). C'est mieux qu'un long texte dans le skill quand l'agent doit s'en inspirer. Je le fais seulement si ça améliore vraiment le livrable. Le MCP n'écrit pas dans `workspace/` : soit je le mets dans le skill (`upsert_skill` avec `files: [{ path: "references/…", content }]`, la meilleure option), soit je demande à l'agent de l'écrire par `send_message` et je le garde à la capture.
