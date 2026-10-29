# La page de la template (draft privé)

Tout en anglais. La page vend **un résultat**, et ne promet que ce que l'agent capturé porte vraiment (apps déclarées, skill, schedule). Limites : `packages/contracts/src/template.ts` et `template-display.ts`.

## `title` (≤ 50 caractères, fixe le slug pour toujours)

Verbe + objet, 3 à 6 mots, en Title Case. Test littéral : « This agent will {title} » doit être grammatical et nommer un job concret.

- Bon : `Create TikTok Carousels`, `Find Qualified B2B Leads`, `Copy Winning Competitor Ads`, `Triage Incoming Email`.
- Mauvais : `Carousel Studio` (le nom de l'agent), `TikTok Assistant`, `Lead Gen Copilot`, `Ad Monitor` (étiquettes sans verbe).

Le titre est **indépendant du nom d'affichage** de l'agent. Je le fais valider dans le brief, avant `create_template`, car le slug ne se change plus.

## `tagline` (~160 caractères, sous-titre de la carte)

Une phrase : ce que le propriétaire obtient, pour qui. « Turn any idea, link or product into ready-to-post TikTok carousels, designed in your brand and posted when you say go. »

## `longDescription` (markdown, c'est le corps de la page)

Court, scannable, honnête :

```markdown
{1–2 sentences: the outcome, in the reader's words.}

## What it does
- {3–5 bullets, concrete deliverables}

## What you need
- {apps declared and what each unlocks; "nothing to start" when true}
- {paid data: "Optional live data billed on your Rerun credit" — only if on}

## How setup works
{1–2 sentences: first result in the first minutes, then what it learns and connects.}

## What stays in your hands
- {what it never does without approval: posting, sending, spending}
```

Je n'annonce ni intégration, ni automatisation, ni chiffre de résultat que l'agent ne porte pas.

## `category`

L'audience qui installe, pas l'équipe qui ferait le travail : `agencies`, `ecommerce`, `saas`, `sales`, `recruiting`, `real-estate`, `legal`, `creators`, `productivity`, `other`.

## `tags`

4 à 8 termes simples qu'on taperait dans une recherche : `tiktok`, `carousel`, `content`, `social media`.

## `setupMinutes` (honnête, jamais 5 par défaut)

1 min d'install
+ 2 par app connectée par popup OAuth
+ 3 + 1 par champ pour une app dont la clé doit être récupérée dans un autre dashboard
+ 2 si `setup.required`
+ 1 par schedule à confirmer
→ arrondi au palier supérieur parmi 2, 3, 5, 8, 10, 12, 15, 20.

Exemple : install (1) + setup (2) + aucune app au départ = 3 → **3**.

## `faq` (4 à 6)

Les questions telles qu'on les tape dans Google, réponses de 1 à 3 phrases, vraies pour ce que porte l'agent :
- « Can it post to TikTok automatically? »
- « Do I need a Canva account? »
- « How much does it cost to run? » — réponse : les runs consomment du crédit Rerun ; le paid data, s'il est on, est validé avant chaque dépense. Je ne cite pas de montant.
- « Can I use it for Instagram or LinkedIn too? » — montre l'ouverture de l'agent.

## `metaDescription` (120 à 155 caractères, exigée à la soumission)

Une phrase SEO avec le mot-clé principal au début. Je compte les caractères avant d'envoyer.

## Prix

`pricingModel: "free"`, `priceAmountCents: 0` sauf demande explicite de l'auteur (payant : 500 à 200 000 centimes, `one_time` ou `recurring`, Stripe à configurer par l'auteur).

## Ce que le MCP ne peut pas écrire

`story`, `slug`, `status`, `featured`, `leadMagnet`, la visibilité, `ogImageUrl`. Le flag lead magnet est posé par un admin après publication ; la story se fait avec `template-story <slug>` une fois les agents capturés.

## Image

Je n'en génère pas ici. La soumission demandera une image de couverture : je la liste dans `humanFollowUp` et je propose `rerun-image-from-agent-task` (prompt) puis `add_template_image` (URL https, `cover: true`).
