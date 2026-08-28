# billboard.lol — Brief projet

## Pitch
Une autoroute américaine en 3D low/mid-poly où chaque entreprise plante son billboard. Les entreprises **bid** pour apparaître en première position : plus elles paient, plus leur panneau est haut dans le ranking — et plus il est énorme à l'écran, jusqu'à écraser la vue. Satire du "toujours plus grand" version US.

Références directes :
- **outbid.lol** → le système : un ranking d'entreprises payantes, où payer plus fait grimper.
- **topfloor.company** → l'inspi 3D : low/mid poly, modèles simples et satisfaisants, cohérence totale modelling/textures.

Alternatives de nom : BiggerIsBetter.lol, MoreIsMore.lol

## Le système de bids (inspi outbid.lol)

- **Ranking par montant cumulé.** Chaque entreprise a un total payé ; le classement est le tri décroissant de ces totaux. Rang 1 = premier billboard rencontré, le plus gros.
- **Pas d'enchère perdante.** Ce n'est pas une enchère classique : chaque paiement s'**ajoute** au total de l'entreprise (pas de remboursement, pas d'expiration d'offre). Se faire dépasser = raison de repayer. C'est le moteur viral du modèle outbid.
- **Ticket d'entrée bas** (ex. 1 $) pour maximiser le nombre de panneaux sur la route ; pas de montant max.
- **Taille calculée à l'envers, depuis le bas du classement.** Le dernier rang a une taille plancher lisible et chaque rang au-dessus grandit à partir de là (courbe puissance 2.4 : le spectaculaire reste en haut sans écraser la queue). La taille suit donc la **position au classement**, pas le montant brut — c'est ce qui permet d'aller jusqu'à 200 billboards sans finir sur un timbre-poste.
- **Effet immédiat.** Un paiement re-trie le ranking en temps réel : le billboard grossit et remonte la route sous les yeux des visiteurs (transition animée, pas de reload).
- **Le rang 1 est un trophée.** Il ouvre la scène, occupe tout le cadre au chargement, et alimente l'OG image / le title du site ("Currently #1: {company}").
- **Reset périodique** (daily/weekly, à trancher) prévu dès le départ dans le schéma de données : chaque cycle archive son podium dans un hall of fame, et tout le monde repart de zéro — récurrence des revenus.
- **Contenu d'un billboard** : logo + nom + lien sortant + montant affiché. Modération légère : auto-publish avec blocklist + possibilité de retrait manuel (les paiements restent acquis).

## Expérience

**Point de vue** : vue de côté — route horizontale, plusieurs billboards visibles simultanément à l'écran. Choisi plutôt que l'option embodied (caméra voiture) car le nerf de ce type de site, c'est la comparaison sociale instantanée entre plusieurs boîtes en même temps ; une vue séquentielle où on ne croise qu'un billboard à la fois tue cet effet.

**Sens de progression** : on démarre par le rang 1, énorme, puis la taille décroît en avançant/scrollant. Aligné avec l'incitatif business — payer plus = être vu en premier et en grand.

**Altitude de caméra, du ciel au sol** : le billboard rang 1 étant énorme, il ne peut tenir dans le cadre que vu de loin/en hauteur. La scène démarre donc en vue aérienne (survol des billboards géants), puis la caméra redescend progressivement à mesure que les billboards rétrécissent, jusqu'à un point de vue au sol façon voiture pour les rangs modestes en fin de parcours. **Un seul scroll pilote à la fois l'avancée horizontale et la descente en altitude** (une seule valeur de progression 0→1 échantillonne un rail de caméra).

**Décor** : adapté à l'altitude — nuages et ombres portées vues du ciel en début de parcours, puis arbres, rochers, poteaux électriques et voitures qui croisent une fois redescendu au sol. Transition progressive, pas de coupure.

**Idées écartées** : embodied voiture (un seul billboard à la fois) et stack vertical (casse la comparaison simultanée, et trop proche de topfloor/outbuilt).

## Direction artistique (inspi topfloor.company)

Objectif : le rendu EST le produit. L'audience visée juge sur le craft, pas sur le concept brut.

- **Low/mid poly assumé** : silhouettes lisibles, arêtes franches, chamfers légers sur les bords vus de près (un low poly "premium", pas un placeholder). Normales dures sur les objets géométriques, smooth uniquement où c'est voulu.
- **Un seul langage de forme** pour tout le décor : même densité polygonale relative, mêmes proportions cartoon (arbres trapus, voitures compactes), même échelle de détail. Rien ne doit sembler venir d'un pack d'assets différent.
- **Palette fermée** : 8–12 couleurs définies une fois (plein jour façon topfloor : ciel bleu pâle avec brume blanche à l'horizon, herbe verte fraîche, structures blanches/acier clair, panneaux aux couleurs brand), appliquées par **vertex colors** plutôt que par textures photo. Zéro texture réaliste — c'est ce qui garantit la cohérence ET le poids plume.
- **Lumière douce et aérée** : une directionnelle + hémisphérique généreuse pour des ombres claires et colorées, jamais noires. Les nuages projettent les grandes ombres au sol de la section aérienne.
- **Le billboard comme objet héros** : structure poteau + plateforme + cadre, déclinée en 3–4 tailles. Le logo client vit dans un cadre 3D qui l'intègre à la DA (bords, matière, légère émission la nuit si on ajoute un cycle jour/nuit plus tard).

## Expert WebGL — rendu & performance

Les réglages qui font la différence entre "démo three.js" et "site qui donne envie de payer" :

**Qualité d'image**
- **Color management propre** : `ColorManagement` activé, `outputColorSpace: SRGB`, textures couleur en sRGB. C'est le prérequis de tout le reste.
- **Tone mapping ACES Filmic** (ou AgX pour un rendu plus doux), exposition ajustée à la main sur la scène finale — c'est lui qui donne le "coloring joli", pas les matériaux.
- **Antialiasing MSAA natif** (WebGL2) : `antialias: true` sans post-processing, ou render targets MSAA (4–8 samples) dans l'EffectComposer si post. Éviter FXAA (flou) ; SMAA en fallback si le MSAA coûte trop sur mobile.
- **Post-processing sobre** : bloom à seuil haut (uniquement les émissifs), vignette légère, **dithering/noise subtil** pour tuer le banding des dégradés de ciel. Pas de SSAO temps réel : l'AO est bakée dans les vertex colors.
- **Profondeur atmosphérique** : fog accordé à la couleur du ciel + dégradé d'horizon — c'est ce qui vend l'altitude de la caméra en début de parcours.
- **Ombres** : PCFSoft, une seule cascade, frustum de la shadow camera serré sur la zone visible et qui suit la caméra.

**Performance**
- **Budget strict** : < 100 draw calls, 150–300k triangles visibles, 60 fps sur laptop moyen, assets initiaux < 4 Mo.
- **Instancing systématique** (`InstancedMesh`) pour arbres, rochers, poteaux, nuages, voitures ; géométries statiques mergées par matériau.
- **Pipeline d'assets** : glTF compressé **meshopt** (ou Draco), textures **KTX2/Basis**, un atlas unique pour le décor — via `gltf-transform` en étape de build.
- **DPR cappé à ~1.75** avec résolution dynamique si le frame time dérape ; `powerPreference: "high-performance"`.
- **Scroll amorti** : scroll virtuel (Lenis) → progression cible → caméra interpolée par damping exponentiel frame-rate-independent (`maath/damp`). Jamais de position caméra brute sur l'event scroll.
- **Logos clients** : redimensionnés/compressés côté serveur à l'upload (taille fixe, WebP), chargés en lazy selon la progression sur la route.
- Rendu en pause quand l'onglet est caché ; frustum culling naturel grâce à la vue de côté.

**Stack rendu** : React Three Fiber + drei (instances, scroll helpers) + postprocessing. Rail de caméra sur courbe CatmullRom échantillonnée par la progression du scroll.

## Cible
Communauté design engineering / indie hackers US — audience qui juge sur le craft visuel et partage ce genre de site sur X. Le partage social est le canal d'acquisition : OG image dynamique avec le podium du moment.

## Différenciation
Le terrain "billboard/bid" est déjà occupé (outbid.lol, bidwall.lol, une trentaine de clones), mais aucun ne propose une vraie traversée 3D immersive avec effet décroissant piloté au scroll. TopFloor et outbuilt.lol font des tours statiques qu'on regarde de l'extérieur, pas un trajet qu'on vit. Notre pari : même mécanique éprouvée, exécution visuelle d'un cran au-dessus.

## Stack technique
- **React Three Fiber + Next.js** pour la scène et le squelette de l'app
- **Stripe Checkout** pour les paiements (webhook → mise à jour du total → re-tri)
- **Supabase** (DB + realtime) pour stocker les billboards et pousser les changements de rang en direct dans la scène

## Schéma de données (v1)
- `companies` : id, name, logo_url, link, created_at
- `payments` : id, company_id, amount, stripe_session_id, cycle_id, created_at
- `cycles` : id, starts_at, ends_at — le ranking d'un cycle = somme des payments du cycle par company. Le reset est donc gratuit : on ouvre un nouveau cycle, l'ancien devient une page hall of fame.

## Scope MVP (shippable en un weekend)
- Une seule scène, un seul moment de journée (cycle jour/nuit = post-traction)
- Formulaire simple : lien + logo + montant → Stripe Checkout, pas de compte, pas de login
- Scroll-driven camera le long d'un rail droit ou légèrement courbé, descente d'altitude synchronisée sur la même valeur de scroll
- Décor minimal réutilisable, deux registres : aérien (nuages, ombres au sol) et sol (arbre, rocher, voiture croisée)
- Re-tri en temps réel via Supabase realtime (au minimum : animation de grossissement du billboard qui vient de payer)

## Prochaines étapes
1. Whiteboard du camera path + règles de placement des billboards (espacement, courbe taille = f(montant), taille min/max, gestion de N panneaux variables)
2. Prototype Three.js : rail de caméra scrollé + un billboard test + réglage tone mapping/fog/palette (valider le look avant tout)
3. Design du billboard 3D (poteau, structure, cadre logo) en 3–4 tailles
4. Brancher Stripe + Supabase une fois le rendu validé
