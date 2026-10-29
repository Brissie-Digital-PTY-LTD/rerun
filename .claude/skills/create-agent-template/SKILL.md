---
name: create-agent-template
description: Créer, à partir d'un sujet (« un agent qui fait des carrousels TikTok », « copier des pubs », « trouver des leads »), un coworker Rerun de qualité lead magnet et son draft de template privé — interview courte par blocs avec défauts recommandés (apps du catalogue de services, paid data, computer use, niveau de cadrage du process, profondeur de l'install), build complet via le MCP Rerun (SOUL, INSTALL.md court, skill, schedule), banc d'essai de vrais runs sur les situations où des clients ont décroché (Skip, « I need 10 », défi ChatGPT, refus sans motif) contre un coworker témoin, capture en draft seulement si le banc est vert. Utiliser dès qu'on veut créer / générer / préparer une template d'agent, un agent pour la marketplace, un agent lead magnet, ou transformer une idée d'agent en template Rerun.
---

# Créer une template d'agent Rerun (lead magnet)

On me donne un sujet. J'en fais **un coworker qui livre un vrai résultat dès la première conversation**, puis un **draft de template privé**, qui ne part en capture qu'après un **banc d'essai vert**. Je pose peu de questions, toujours avec ma recommandation, et je laisse à l'agent la liberté de s'adapter à chaque propriétaire.

Le skill est en français ; **tout ce que j'écris dans Rerun est en anglais** (SOUL, INSTALL.md, skill, schedule, page de la template). L'agent répond de toute façon dans la langue de son utilisateur.

## Les trois règles d'or

1. **Le moins de texte possible, au bon endroit.** L'engine injecte déjà dans chaque system prompt l'ordre de l'install, l'usage du catalogue, du paid data, du computer use, de la mémoire, la langue. Je n'écris **que ce qui est propre au job**. Tout ce que je répète dilue le reste. Voir `references/capabilities.md` § « Ce que l'engine dit déjà ».
2. **Des défauts, pas des règles.** Je décris ce qu'un excellent livrable a en commun, pas une procédure figée. Aucun seuil, score, schéma, fournisseur ou politique inventé. Test d'ouverture avant chaque écriture : *« si le propriétaire demande une variante raisonnable (autre réseau, autre format, autre ton), l'agent peut-il la faire sans contredire ses instructions ? »* Si non, je desserre.
3. **Résultat d'abord, et un vrai.** Le premier message d'un nouveau propriétaire contient un livrable concret, construit sur ses données ou sur des données publiques réelles (son site, son compte public, sa niche, le paid data), jamais sur des chiffres d'exemple : un client prend un exemple réaliste pour une analyse de son compte. Ce premier livrable contient déjà ce que le SOUL promet (volumes, positions, prix, demande) ; un « first pass » qui annonce la vérification pour plus tard est un échec. Toute question ou app qui ne change pas ce livrable attend, et une question passée (Skip) se remplace par une hypothèse annoncée, jamais par un arrêt.

## Budgets de longueur

| Pièce | Budget |
|---|---|
| `description` de l'agent | 1 phrase, sur le résultat |
| `SOUL.md` | ≤ 120 mots |
| `INSTALL.md` | Express ≤ 80 mots · Standard ≤ 150 · Guidée ≤ 250 |
| Skill d'agent | Guidé ≤ 350 mots · Cadré ≤ 600 |
| Corps d'un schedule | ≤ 60 mots |

Je compte les mots (`wc -w` sur un fichier dans `.context/`) avant d'envoyer. Au-dessus du budget, je coupe, je ne négocie pas.

## Phase 0 — Préflight (sans rien demander)

1. Les outils `mcp__rerun__*` doivent exister. Sinon je m'arrête et je donne la commande :
   `claude mcp add --transport http rerun https://app.rerun.build/api/mcp/account --header "Authorization: Bearer rk_…"` — clé d'un **compte expert** (doc : `apps/docs/api/connect.mdx`).
2. `list_capture_sources` → la Box sandbox où créer l'agent. La capture n'accepte que les coworkers d'une sandbox de compte expert : je ne crée jamais ailleurs.
3. `list_templates` et `list_agents` sur cette Box → si un draft ou un agent existe déjà pour ce sujet, je le reprends au lieu d'en créer un second. Je ne touche jamais une template `in_review`, `published`, `unlisted` ou `archived`.

## Phase 1 — Recherche silencieuse

Avant toute question, je prépare mes recommandations (détail : `references/interview.md` § « Pré-calcul ») :

- je réduis le sujet à **un livrable héros** (l'objet produit : un carrousel de 7 slides, une liste de 50 leads qualifiés, un swipe file de pubs), une **audience** (catégorie de la template), un **déclencheur** probable, et l'endroit où le job **atterrit** (fichier, app, site) ;
- `search_connectors` **une capacité à la fois** (ce qu'il lit, ce qu'il fait, où il écrit), requêtes courtes, puis `list_connectors` par catégorie avant de conclure qu'il n'y a rien ;
- je décide si le **paid data** sert (quels groupes) et si le **computer use** sert (un site sans connecteur officiel sur le chemin du livrable) — grille dans `references/capabilities.md` ;
- je choisis le **propriétaire fictif** du banc : une vraie petite entreprise de la niche, avec son site et son pays, jamais `example.com`.

## Phase 2 — Interview par blocs

`AskUserQuestion`, **2 rounds, 3 au maximum, ≤ 4 questions par round, ≤ 12 questions au total.** Chaque question : mon option recommandée en premier, suffixée « (Recommandé) », une description d'une ligne qui dit ce que le choix change. Je ne pose jamais une question dont la réponse ne change rien au build. Banque de questions et formulations : `references/interview.md`.

- **Round 1 — le job et les deux curseurs** : promesse / livrable · déclencheur · **cadrage du process** (Ouvert / Guidé / Cadré) · **profondeur de l'install** (Express / Standard / Guidée).
- **Round 2 — les capacités** : apps du catalogue (multiSelect, ou aucune déclarée) · paid data · computer use.
- **Round 3, seulement si utile** : actions sortantes à faire valider, contrainte métier réelle, prix si payante.

Puis je montre un **brief d'une demi-page** et j'attends un OK explicite avant d'écrire quoi que ce soit dans Rerun :

```
Agent : {nom} — {description}
Livrable héros : {…}            Déclencheur : {…}
Cadrage : {Ouvert|Guidé|Cadré}  Install : {Express|Standard|Guidée}
Apps déclarées : {slug → rôle}  Outils coupés : {computer, paidData | aucun}
Skill : {nom + 1 ligne | aucun} Schedule : {cron + fuseau | aucun}
Propriétaire du banc : {entreprise réelle, site, pays}
Banc : {scénarios joués, S6/S7 oui|non} · {N runs} · ≈ {X} $ (plafond 8 $)
Titre marketplace : {…}         Catégorie : {…}
```

## Phase 3 — Build

Gabarits et exemples bons / mauvais : `references/writing.md`. Deux exemples complets : `examples/tiktok-carousel.md` (Guidé, Express, computer use) et `examples/lead-finder.md` (Cadré, Standard, paid data, schedule).

1. **`create_agent`** dans la Box sandbox :
   - `name`, `description`, `soul`, `connectors` (slugs validés) ;
   - `setup: { required: true, prompt: <INSTALL.md> }` — `required: false` seulement si l'agent fait tout son travail avec les messages et fichiers de l'utilisateur, sans aucune préférence durable ni app ;
   - `tools` : **je ne passe que ce que je coupe** (toutes les familles sont à `true` par défaut) : en pratique `computer` et `paidData` selon l'interview. Je ne coupe jamais `hub` ni `suggestService` : sans eux l'install ne peut rien faire connecter. Je laisse `selfImprovement` par défaut.
2. **Skill d'agent** selon le cadrage : `upsert_skill` — aucun en Ouvert, un en Guidé ou Cadré, deux au maximum si le sujet contient deux jobs vraiment distincts. Sa `description` est une **condition de déclenchement** (« Use when asked for… »).
3. **Schedule**, seulement si le déclencheur est récurrent : `upsert_schedule` avec **`enabled: false`** (il ne doit pas tourner dans la sandbox ; `install_complete` l'active chez le propriétaire). Cron et fuseau sont des défauts que l'INSTALL.md fait confirmer.
4. **Vérification** : `get_agent` (SOUL, setup, tools, skills, schedules) et `list_agent_connectors`. `needs_auth` / `needs_config` est l'état normal d'une app déclarée dans une template ; je ne demande jamais de credential.

## Phase 4 — Banc d'essai, puis capture

Protocole complet, scénarios et grille : `references/benchmark.md`. **Pas de banc vert, pas de capture.**

1. **Banc.** Je joue sur la Box sandbox, avec le propriétaire fictif du brief :
   - **S1** install, chemin heureux : 3 runs sur Rerun Max, 1 sur un modèle d'une autre famille ;
   - **S2** tout passé (`[skipped]`) · **S3** « I need 3× plus » avec un critère strict · **S4** « What can you do that ChatGPT can't? » · **S5** « Changes needed » sans motif ;
   - **S6** feu vert explicite et **S7** variante raisonnable quand ils s'appliquent ;
   - **T**, le témoin : la même demande sur un coworker nu (la `description` comme SOUL, rien d'autre).
2. **Jugement** run par run sur les tool calls (`get_run` avec `includeToolCalls: true`), avec la grille de `references/benchmark.md`. Je tiens `.context/template-bench/{agent}/bench.md` à jour, coût compris.
3. **Porte** : S1 4/4, chaque autre scénario joué passe, la template bat le témoin, le coût tient dans le budget annoncé. Rouge → je corrige la pièce en cause (SOUL, INSTALL.md ou skill) avec `update_agent` / `upsert_skill`, puis je rejoue le scénario rouge et un S1. **Trois tours au maximum** ; toujours rouge, je ne capture pas et je passe au compte rendu en `partial`.
4. **Nettoyage** : `delete_agent` du témoin, `update_agent({ model: null })` sur l'agent.

**Template** (champs et règles : `references/listing.md`) :

1. `create_template({ title })` — le slug dérive du titre et ne changera plus : je valide le titre avant.
2. `update_template` : `tagline`, `longDescription`, `category`, `tags`, `setupMinutes`, `faq` (4 à 6), `metaDescription` (120 à 155 caractères), `pricingModel: "free"`, `priceAmountCents: 0` sauf demande contraire.
3. `plan_template_capture` → je lis **chaque** avertissement et **chaque** chemin. Le banc a laissé des traces : fichiers dans `workspace/`, tables dans `data/agent.db`. `memory/` est exclu par défaut, **pas** `workspace/` ni `data/agent.db`.
4. `capture_template_agents` avec le même `setup` que l'agent et un `exclude` couvrant tous les artefacts du banc (sauf un fichier d'exemple que je veux livrer exprès).
5. `get_template` → je lis `submitChecklist` et `missing`.

**Je ne soumets jamais** (`submit_template`) dans ce skill.

## Phase 5 — Compte rendu

Un résumé court pour l'humain :

- ce qui a été créé (agent, skill, schedule, draft) et les deux curseurs choisis ;
- le banc : le tableau scénario × verdict, un extrait du livrable de S1 face au témoin, ce que chaque tour de correction a changé, le coût total ;
- ce qui manque pour soumettre (en général l'image de couverture) ;
- la suite proposée, **sans la lancer** : `rerun-image-from-agent-task` → `add_template_image` ; après publication, `template-story <slug>` puis `rerun-x-article`.

Puis un record JSON :

```json
{
  "sourceIdea": "an agent that makes TikTok carousels",
  "status": "created",
  "agent": { "id": "...", "name": "Carousel Studio" },
  "template": { "id": "...", "title": "Create TikTok Carousels", "status": "draft" },
  "levels": { "process": "guided", "install": "express" },
  "tools": { "computer": true, "paidData": false },
  "connectors": [{ "slug": "...", "status": "needs_auth" }],
  "skills": ["carousel-craft"],
  "schedules": [],
  "bench": {
    "passed": true,
    "rounds": 1,
    "costUsd": 6.4,
    "scenarios": { "S1": "4/4", "S2": "1/1", "S3": "1/1", "S4": "1/1", "S5": "1/1", "S6": "n/a", "S7": "1/1", "control": "beaten" },
    "notes": "..."
  },
  "humanFollowUp": ["Add a cover image before submitting"]
}
```

`status` vaut `created`, `reused` ou `partial`. `template` vaut `null` si la capture a échoué ou si le banc est resté rouge, et `humanFollowUp` dit exactement ce qui reste.
