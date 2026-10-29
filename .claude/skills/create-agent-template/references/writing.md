# Écrire l'agent : SOUL, INSTALL.md, skill, schedule

Tout est en anglais. Chaque pièce a un rôle unique ; une phrase qui pourrait aller dans deux pièces va dans **une seule**.

| Pièce | Toujours chargée ? | Son rôle | N'y met jamais |
|---|---|---|---|
| `SOUL.md` | oui, à chaque run | qui il est, ce qu'il possède, la barre de qualité | une procédure, des outils, l'install |
| `INSTALL.md` | une fois, à l'install | ce que *ce* job doit montrer, apprendre, connecter, tester | les étapes génériques de l'engine |
| Skill d'agent | à la demande | la méthode d'un pro du domaine | l'identité, l'install |
| Schedule | à chaque déclenchement | quoi faire cette fois-ci | la méthode (elle est dans le skill) |

## SOUL.md (≤ 120 mots)

```markdown
# {Agent name}

You are {Agent name}, a coworker that {outcome owned, broad enough to cover reasonable variants}.

{Quality bar: 1–2 sentences on what separates a great {deliverable} from a mediocre one, the way an expert in the field would say it.}

{Only if real: 1 guardrail, e.g. "Show the final version and wait for the user's go-ahead before anything is posted under their name."}

Adapt to each user's brand, audience and tools; when they want it done differently, do it their way.
```

**Bon** (Guidé, carrousel) :
> You are Carousel Studio, a coworker that turns an idea, a link or a product into scroll-stopping TikTok and Instagram carousels.
> A great carousel earns the second swipe: a hook slide that names a pain or a promise, one idea per slide, and a last slide that tells the viewer what to do next. Every slide is readable on a phone in under three seconds.
> Show the finished slides and caption and wait for the user's go-ahead before anything is posted under their name.
> Adapt to each user's brand, audience and tools; when they want it done differently, do it their way.

**Mauvais — trop vague** : « You are a helpful AI that creates content. » → aucune barre de qualité, l'agent livre du générique.

**Mauvais — trop fermé** : « Always produce exactly 7 slides in 1080×1350, Montserrat Bold 64 px, 3 hashtags, post at 6 pm. » → seuils inventés ; le propriétaire qui veut 10 slides ou LinkedIn est contredit.

**Mauvais — redondant** : « First introduce yourself, then use suggest_service to connect TikTok, save preferences with memory_write… » → déjà dans le system prompt, et à la mauvaise place.

## INSTALL.md

Un seul gabarit, rempli selon la profondeur. Pas de titre, pas de liste numérotée, pas d'étapes génériques (l'engine impose déjà : se présenter, résultat d'abord, apps ensuite, test, `install_complete`).

```markdown
First result: {the concrete deliverable to show before anything is connected, and the real data it is built from: their website, a public handle, a niche they name, public paid data}.
Learn along the way: {0–5 preferences that genuinely change the work, each with what it is for}.
Apps: {App} unlocks {what, on that result}. {If they use another tool for this, offer that one instead.}
Real test: {one small, safe run on their real data: read, draft, preview — never send, post or delete}.
Done when: {what must work before install_complete}.
```

Selon la profondeur :

- **Express (≤ 80 mots)** — `Learn` contient au plus une question, souvent posée *dans* le premier résultat (« Ask for their handle or website if they have not given it »). `Apps` peut dire : « Offer {App} only when they want to {post / send}. » `Real test` peut se confondre avec le premier résultat.
- **Standard (≤ 150 mots)** — 2 ou 3 préférences, une app clé, un test réel distinct.
- **Guidée (≤ 250 mots)** — jusqu'à 5 points, confirmation de la cadence et du fuseau du schedule, ce qui doit être validé avant toute action sortante, test réel sur un vrai cas.

**Bon (Express, carrousel)** :
> First result: ask for their TikTok handle, website or niche, then make a full carousel — slides rendered as images, caption and hashtags — on a topic their audience cares about.
> Learn along the way: their brand colours and tone, from what they share or their site.
> Apps: none needed to start. When they want it posted, offer to do it on TikTok from your computer, signed in to their account.
> Done when: they have one carousel they would post.

**Mauvais — chiffres d'exemple** (Paid Acquisition, 24/10/2026) :
> First result: show a wasted spend review on sample numbers, labelled as such.
> → le client a lu 280 € « gaspillés » et a demandé 18 minutes plus tard « are they real? ». Sans accès à son compte, le premier résultat est ce que les données publiques permettent de vrai (ses pubs dans la bibliothèque Meta, les volumes et CPC de ses requêtes), plus ce que l'accès débloquera.

**Mauvais — l'INSTALL.md contredit le SOUL** (Product Radar, 22/10/2026) : SOUL « for each product you check five things », INSTALL « Find 3 candidate products and show the full sheet of the best one » → l'agent a livré deux candidats « I haven't checked yet ». Le premier résultat applique la barre du SOUL à tout ce qu'il montre : « Find 3 products that pass, each with its checked demand, and show the full sheet of the best one. »

**Mauvais** :
> 1. Introduce yourself. 2. Ask for their name, company, industry, audience, tone, colours, fonts, posting frequency, goals and competitors. 3. Connect TikTok, Instagram, Canva and Google Drive. 4. …
> → dix questions avant le moindre résultat, quatre apps dont trois inutiles au premier livrable, étapes que l'engine impose déjà.

## Skill d'agent

Créé avec `upsert_skill` : `name`, `description`, `body`, éventuellement `files` (`references/…`). Format engine : un `SKILL.md` avec frontmatter `name` + `description`, puis le corps.

**`description` = condition de déclenchement** : « Use when asked to make a carousel, or when turning a post, a link or a product into slides. » Jamais « About carousels ».

### Guidé (≤ 350 mots) — une méthode, pas une séquence

```markdown
# {Skill name}

## What good looks like
{3–6 bullets: the properties of an excellent deliverable, as an expert would list them.}

## How a pro approaches it
{3–6 bullets: sources to check, choices to make, in no forced order. "Start from…" / "Prefer…" / "When X, Y."}

## Pitfalls
{2–4 bullets: the mistakes that make the deliverable look amateur.}

Quand le job peut tomber sur « rien ne passe » (leads avec intention, produits qui tiennent la marge), le skill dit quoi livrer alors : ce qui passe, puis les plus proches avec ce qui leur manque, et la route qui élargirait la recherche. Sans cette ligne l'agent rend « zero ».
Quand le skill termine par une validation (« approve or change? »), il dit aussi quoi faire d'un refus sans motif : livrer une v2 sur l'hypothèse la plus probable, pas redemander quoi changer.

## Delivering
{1–3 bullets: how the result reaches the user — a table view, a published file, images, a draft in their app.}
```

### Cadré (≤ 600 mots) — des étapes et un format, avec une porte de sortie

```markdown
# {Skill name}

Follow these steps unless the user asks for something different; then do it their way and keep what still applies.

## Steps
1. {…}
…(4–7 steps max, each a sentence or two, each stating *why* when it is not obvious)

## Output
{The format of the deliverable: columns of the table, sections of the report, files produced. Name the columns or sections, not the styling.}

## Quality check before delivering
{3–5 checks the agent runs on its own output.}
```

**Règles pour les deux** :
- Pas de seuil, de score, de pondération ou de schéma inventé. Si un score est utile, l'agent le définit **avec le propriétaire** (« Agree on what makes a lead a fit with the user, then score against that »).
- Pas de fournisseur imposé quand seule la capacité compte : « their email tool », pas « Gmail ».
- Les données vont en base (l'engine le dit déjà) : je nomme la table et ses colonnes utiles seulement en Cadré.
- Une ressource longue (un gabarit HTML, une liste de hooks, une grille d'audit) va dans `files: [{ path: "references/…", content }]`, pas dans le corps. Le corps dit quand la lire.

## Schedule (≤ 60 mots de corps)

Créé avec `upsert_schedule` : `name`, `description`, `body`, `cron`, `timezone`, **`enabled: false`**.

Le corps parle à l'agent comme un message : ce qu'il fait cette fois-ci, et où va le résultat. La méthode est dans le skill.

> Find this week's new leads matching the profile in memory, add them to the leads table without duplicates, and send the user a short summary with the top 5 and why they fit.

Je ne mets pas de schedule si le déclencheur est « à la demande » ; l'agent sait en créer un lui-même si le propriétaire le demande plus tard.

## Description de l'agent (1 phrase)

Le résultat, pas l'implémentation : « Turns any idea, link or product into ready-to-post TikTok carousels. » Pas : « An AI agent using HTML rendering and the TikTok API. »

## Nom de l'agent

Court, 1 à 3 mots, un nom de métier ou d'atelier qui sonne humain (« Carousel Studio », « Lead Scout », « Ad Spy »). Différent du titre marketplace (voir `listing.md`).

## Relecture finale (avant `create_agent`)

- [ ] Chaque pièce sous son budget de mots.
- [ ] L'INSTALL.md n'a pas d'« example », « sample », « illustrative » : le premier résultat est construit sur du réel.
- [ ] L'INSTALL.md applique au premier résultat la barre de qualité du SOUL (rien de montré « à vérifier plus tard »).
- [ ] Une liste livrée ne contient que ce qui passe ; le SOUL ne demande pas d'afficher les rejets.
- [ ] Rien de ce que dit déjà l'engine (`capabilities.md` § « Ce que l'engine dit déjà »).
- [ ] Aucun seuil, score, format, fournisseur ou politique inventé.
- [ ] Test d'ouverture : trois variantes raisonnables (autre réseau, autre format, autre ton) restent possibles sans contradiction.
- [ ] L'INSTALL.md dit quel résultat montrer **avant** toute connexion.
- [ ] Chaque app déclarée apparaît dans l'INSTALL.md avec ce qu'elle débloque.
- [ ] Chaque outil coupé a une raison.
