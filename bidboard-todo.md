# BidBoard — TODO

## À modifier

- **Prix des billboards** : garder visible mais réduire son poids visuel face au nom/logo. Équilibre entre "trop mis en avant" (outbid.lol / topfloor.company) et "trop discret" (billboard réel).
- **OG dynamique** : le #1 doit prendre plus de place visuellement (taille/mise en scène, pas juste couleur/contraste). Réutiliser la logique déjà en place in-app (rank haut = billboard plus grand).

## À ajouter

- **Page/modale dédiée par company classée** (cf refs outbid.lol + topfloor.company) :
  - Rank catégorie
  - Rank global
  - Montant payé
  - Date de claim
  - Catégorie
  - Boutons : Visiter / Claim le rank / Copier le lien

## Validé — à garder tel quel

- Système de catégories : bonne idée confirmée par les 2 refs, pas à remettre en question sur le principe.
- Favicon : refaite (route + 3 billboards en mid-poly), plus l'image custom envoyée ensuite — validée, `app/icon.png`.
- Timestamp de fraîcheur + nombre de clicks : ajoutés en bas des billboards (discret, bas-gauche), catégorie déplacée en bas-centré. "Claimed" = date du dernier paiement reçu pour ce billboard ; clicks = total cumulé par company (toutes positions confondues), incrémenté à l'ouverture du lien.
- Indicateur de mouvement récent ("qui dépasse qui") : abandonné au profit du nombre de clicks ci-dessus, qui sert de signal d'activité à la place.
