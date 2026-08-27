# OutGrow.lol — Brief projet

## Pitch
Une autoroute américaine en 3D low-poly où chaque entreprise plante son billboard. Plus elle paie, plus son panneau est énorme — jusqu'à écraser la vue. Satire du "toujours plus grand" version US, clin d'œil direct à outbid.lol / topfloor.company.

Alternatives de nom : BiggerIsBetter.lol, MoreIsMore.lol

## Expérience

**Point de vue** : vue de côté façon idée 1 — route horizontale, plusieurs billboards visibles simultanément à l'écran. Choisi plutôt que l'idée 2 (embodied voiture) car le nerf de ce type de site, c'est la comparaison sociale instantanée entre plusieurs boîtes en même temps ; une vue séquentielle où on ne croise qu'un billboard à la fois tue cet effet.

**Sens de progression** : on démarre par le rang 1, énorme, puis la taille décroît en avançant/scrollant. Aligné avec l'incitatif business — payer plus = être vu en premier et en grand — contrairement au crescendo initial qui partait des petits rangs.

**Altitude de caméra, du ciel au sol** : le billboard rang 1 étant énorme, il ne peut tenir dans le cadre que vu de loin/en hauteur. La scène démarre donc en vue aérienne (hélicoptère ou avion survolant les billboards géants), puis la caméra redescend progressivement à mesure que les billboards rétrécissent, jusqu'à un point de vue au sol façon voiture pour les rangs les plus modestes en fin de parcours. Un seul scroll pilote à la fois l'avancée horizontale et la descente en hauteur.

**Décor** : adapté à l'altitude — nuages et ombres portées vues du ciel en début de parcours, puis arbres, rochers, poteaux électriques et voitures qui croisent une fois redescendu au niveau du sol. Transition progressive entre les deux registres, pas de coupure brutale.

**Idées écartées** : idée 2 (embodied voiture, un seul billboard visible à la fois) et idée 3 (stack vertical, casse l'effet de comparaison simultanée).

## Mécanique
- Chaque billboard = une entreprise (logo/lien + montant payé)
- Taille du billboard proportionnelle au montant cumulé payé
- Reset périodique (daily/weekly) à trancher, mais prévu dès le départ dans le schéma de données pour ne pas avoir à repatcher après coup

## Cible
Communauté design engineering / indie hackers US — audience qui juge sur le craft visuel, pas juste sur le concept brut.

## Différenciation
Le terrain "billboard/bid" est déjà occupé (bidwall.lol, catégorie "Ads & billboards" avec une trentaine de clones dans le répertoire), mais aucun ne propose une vraie traversée 3D immersive avec effet crescendo. TopFloor et outbuilt.lol font des tours statiques qu'on regarde de l'extérieur, pas un trajet qu'on vit.

## Stack technique
- React Three Fiber + Next.js pour la scène et le squelette de l'app
- Stripe Checkout pour les paiements
- Supabase (DB + realtime) pour stocker les billboards et refléter les changements de rang en direct

## Scope MVP (shippable en un weekend)
- Une seule scène (pas de cycle jour/nuit au lancement, à ajouter après si traction)
- Formulaire simple : lien + logo + montant
- Scroll-driven camera le long d'un rail droit ou légèrement courbé, avec descente d'altitude progressive (aérien → sol) synchronisée à la même valeur de scroll
- Décor minimal réutilisable, deux registres : aérien (nuages, ombres au sol) et sol (arbre, rocher, voiture croisée)
- Pas de compte, pas de login

## Prochaines étapes
1. Whiteboard rapide du camera path + règles de placement des billboards (espacement, taille min/max)
2. Prototype Three.js : rail de caméra + un billboard test
3. Design du billboard 3D (poteau, structure, plaque logo)
4. Brancher Stripe + Supabase une fois le rendu validé
