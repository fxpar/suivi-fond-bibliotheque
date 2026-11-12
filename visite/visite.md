---
title: "Visite guidée de Suivi de fonds"
subtitle: "Visite guidée · entre collègues"
description: "Ce que fait l'outil, pas à pas : de l'extraction du SIGB aux décisions en rayon et à la synthèse pour la direction."
duration: 5 min
lang: fr
color: "#487D96"
accent: "#D9B600"
characters:
  guide: "Collègue qui fait la visite"
  collegue: "Collègue qui pose les questions"
next:
  title: "Suivi de fonds"
  url: "../"
---

<!-- slide: format-prenom -->
<!-- character-role: guide -->
<!-- character-expression: happy -->
### Avant de commencer
> Salut ! Je vais te faire faire le tour de l'outil, en cinq minutes. On se tutoie ? Dis-moi comment tu t'appelles.

---

<!-- slide: format-sms -->
### Encore un outil de désherbage ?
> @guide(happy): Bienvenue{, prenom} ! Je te présente aussi une collègue… ou un collègue : c'est toi qui as choisi.

> @collegue(concerned): Encore un outil de désherbage automatique ? On m'a déjà fait le coup.

> @guide(encouraging): Justement, non. Il ne décide rien. Il repère des pistes, explique pourquoi, et c'est l'équipe qui tranche.

> @collegue(thinking): Et nos données, elles partent où ?

> @guide(happy): Nulle part. Tout se passe dans ton navigateur : pas de serveur, pas de compte, rien n'est envoyé.

---

<!-- slide: format-timeline -->
### Le parcours en six étapes
- **1. Déposer** :: L'extraction du SIGB, en Excel, ODS ou CSV, avec un ou plusieurs onglets.
- **2. Regarder** :: La vue d'ensemble : circulation, poids de chaque fonds, âge des documents.
- **3. Examiner** :: Des listes de pistes, chacune avec son motif et des seuils réglables.
- **4. Décider** :: En rayon, ligne par ligne ou depuis la fiche d'un exemplaire.
- **5. Sauvegarder** :: Un classeur Excel, ou un ZIP avec les photos.
- **6. Présenter** :: Une synthèse courte pour la direction, en PowerPoint ou en PDF.

---

<!-- slide: format-content -->
### Que faut-il déposer ?
Une extraction de ton SIGB, telle quelle. L'outil reconnaît tout seul les colonnes habituelles :

- **cote**, **titre**, **titre d'ensemble** (pour les séries)
- **statut** (disponible, prêté, réservé…)
- **dernier emprunt**, **prêts de l'année**, **prêts totaux**
- **date de publication**, **date de création de l'exemplaire**

Une colonne manque ? Les analyses qui en dépendent sont simplement masquées. Plusieurs onglets ? Chacun devient un fonds, sauf si une colonne « Fonds » existe.

---

<!-- slide: format-sms -->
### La vue d'ensemble
> @guide: Premier écran : quatre chiffres. Les documents, les prêts sur l'année, la part sortie en douze mois, la part en prêt aujourd'hui.

> @collegue(thinking): Et le bloc « Ce qu'il faut retenir » ?

> @guide: Des constats rédigés à partir de tes chiffres. Seulement ce qui est notable, en quelques lignes.

> @collegue(surprised): Il m'a dit que nos vieilles BD sortaient presque autant que les récentes !

> @guide(happy): C'est fréquent. Et c'est un bon argument : l'âge seul n'est pas un critère de retrait.

---

<!-- slide: format-flashcards -->
### Trois graphiques, et un avertissement
Retourne chaque carte pour savoir comment la lire.

- **Dernier prêt** :: Chaque barre répartit les documents selon la date de leur dernier prêt. Plus le bleu foncé domine, plus le fonds vit.
- **Fonds et prêts** :: Un fonds qui pèse plus dans les prêts que dans les rayons est plus demandé que sa taille.
- **Âge des documents** :: Les prêts moyens selon la date de publication : de quoi discuter de l'âge comme critère.
- **Historique tronqué** :: Si les dates de prêt commencent récemment, après un changement de SIGB par exemple, l'outil le signale : « sans prêt connu » ne veut pas dire « jamais sorti ».

---

<!-- slide: format-tabs -->
### Les pistes à examiner
#### Retirer ?
Les documents en rayon **sans prêt depuis un certain temps**, hors acquisitions récentes. Et les **exemplaires en double peu demandés** : l'outil propose de garder le moins usé.

#### Remplacer ?
Les exemplaires **très empruntés**, au-delà de 100 prêts par défaut. Un coup d'œil en rayon dit s'il faut réparer, remplacer ou laisser vivre.

#### Renforcer ?
Les titres **très demandés**, les réservés en tête. Et les **séries incomplètes qui circulent**, en commençant par celles où il manque le tome 1.

#### Régulariser
Les documents perdus, les prêts contestés, ceux en réparation ou en traitement.

---

<!-- slide: format-sms -->
### Et si je ne suis pas d'accord avec les seuils ?
> @collegue(concerned): Vingt-quatre mois sans prêt, chez nous, c'est trop court.

> @guide: Change-le ! Les seuils se règlent en haut de l'onglet « À examiner » : 12, 18, 24 ou 36 mois.

> @guide(thinking): Pareil pour l'usure et la forte demande. Les listes se recalculent tout de suite.

> @collegue(thinking): Et un tome qui ne sort plus, au milieu d'une série qui marche ?

> @guide(happy): Il apparaît en fin de liste, surligné : « série active, retirer ce tome casserait la série ».

---

<!-- slide: format-quiz -->
<!-- character-role: guide -->
<!-- character-expression: thinking -->
### Un tome qui dort, dans une série qui marche : que fait l'outil ?
- [ ] Il le propose au retrait, en tête de liste :: Non : il le signale, mais en fin de liste, surligné.
- [x] Il le signale comme tome d'une série active :: Exact. La cohérence de la série passe avant le chiffre.
- [ ] Il l'ignore complètement :: Non, il apparaît, avec un avertissement.

> L'outil propose, l'équipe dispose : chaque ligne porte son motif.

---

<!-- slide: format-conseil -->
<!-- character-role: guide -->
<!-- character-expression: encouraging -->
<!-- badge: Pratique -->
### Noter ses décisions, ligne par ligne
Chaque ligne a ses boutons, adaptés à la liste : **garder**, **mettre en avant**, **transférer**, **retirer**, **réparer**, **commander**… Un second clic annule.

Les lignes décidées passent en grisé et chaque carte montre l'avancement. Une case permet de masquer ce qui est déjà fait.

> Sur un téléphone, les listes deviennent des fiches : on décide directement en rayon.

---

<!-- slide: format-sms -->
### En rayon, téléphone en main
> @collegue(thinking): Je tombe sur une BD abîmée. Je dois la chercher dans chaque liste ?

> @guide(happy): Non. Tape son code-barres, sa cote ou son titre dans la recherche. Ou scanne l'étiquette avec le bouton à droite.

> @guide: Sa fiche s'ouvre : les listes où elle apparaît, un constat en rayon, une note libre… et des photos.

> @collegue(surprised): Des photos ?

> @guide(encouraging): Pour garder une trace de l'état du document. Elles restent sur ton téléphone jusqu'à ce que tu télécharges la sauvegarde.

---

<!-- slide: format-conseil -->
<!-- character-role: collegue -->
<!-- character-expression: happy -->
<!-- badge: Astuce -->
### Bien scanner une étiquette
- Scanne l'**étiquette de l'exemplaire**, souvent 14 chiffres. Pas le code de l'éditeur : l'ISBN, 13 chiffres qui commencent par 978 ou 979.
- Le code à l'horizontale dans le cadre doré, à 10 ou 15 centimètres. Les étiquettes longues passent mieux en tenant le téléphone en paysage.
- Rayon sombre ? Allume la lampe.

---

<!-- slide: format-process -->
### Ne rien perdre
- **Navigateur** :: Tes choix sont gardés au fur et à mesure, sur cet appareil. C'est un filet de sécurité, pas une sauvegarde.
- **Classeur** :: Le classeur Excel reprend décisions et commentaires. Il se partage et se complète dans Excel.
- **ZIP** :: Le classeur et les photos, nommées cote, titre, code-barres et date, avec des liens « Voir » dans Excel.
- **Retour** :: Redépose le classeur ou le ZIP, avec la prochaine extraction : tout revient, et les titres déjà examinés sont signalés.

> Avant « Nouveau fichier », l'outil propose toujours de télécharger la sauvegarde.

---

<!-- slide: format-sms -->
### Pour la direction
> @collegue(thinking): Ma direction va me demander un bilan.

> @guide: Onglet « Exporter » : une synthèse de six pages au plus, en PowerPoint avec des graphiques modifiables, ou en PDF.

> @guide: Chiffres clés, circulation, poids des fonds, âge des collections, et le volume de chaque piste avec sa méthode.

> @collegue(happy): Avec « aucun retrait automatique » écrit noir sur blanc ?

> @guide(happy): Écrit noir sur blanc.

---

<!-- slide: format-sms -->
### Et l'intelligence artificielle ?
> @collegue(concerned): Et l'IA, dans tout ça ?

> @guide: L'outil n'envoie rien. Le bouton « Copier le résumé » prépare un texte à coller dans l'assistant de ton choix, si tu le souhaites.

> @guide(thinking): Pratique pour repérer des classiques à garder malgré peu de prêts, ou trouver des idées de mise en valeur avant tout retrait.

---

<!-- slide: format-dialogue -->
<!-- character-role: guide -->
<!-- character-expression: happy -->
### À toi de jouer{, prenom} !
> Dépose ton extraction, regarde, règle les seuils, puis va en rayon. Et pense à la sauvegarde avant de changer de fichier !
