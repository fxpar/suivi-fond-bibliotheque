# Suivi de fonds

Outil web pour analyser une extraction de fonds de bibliothèque (export SIGB en Excel, ODS ou CSV, un ou plusieurs onglets) et en tirer :

- **une vue d'ensemble** : circulation par fonds, part du fonds / part des prêts, rotation selon l'âge des documents, constats rédigés ;
- **des priorités** : les rayons peu empruntés à décider en bloc (à conserver ou à repenser), puis une liste ciblée d'exemplaires qui cumulent plusieurs signaux, comparés à leur propre rayon ;
- **des pistes à examiner**, chacune motivée et réglable : *retirer ?* (sans prêt depuis N mois, doublons peu demandés), *remplacer ?* (exemplaires très empruntés), *renforcer ?* (forte demande, séries incomplètes), *régulariser* (perdus, contestés, en réparation) ;
- **une recherche d'exemplaire** (code-barres, cote ou titre), avec lecture du code-barres par la caméra sur téléphone : la fiche montre les listes où l'exemplaire apparaît et permet de noter un constat en rayon ;
- **trois exports** : un classeur Excel prêt à annoter en rayon (une feuille par piste, triée par cote, colonne *Décision* à liste déroulante), une synthèse de 6 pages au plus pour la direction (PowerPoint ou PDF), un résumé texte à coller dans un assistant IA si on le souhaite.

## Priorités : rayons et liste ciblée

Quatre onglets : *Vue d'ensemble*, **Rayons**, *À examiner* (liste ciblée puis listes par critère) et *Exporter*. Deux questions distinctes :

1. **Les rayons** (onglet *Rayons*, une carte par rayon). Un rayon est déduit de la cote, sans le code auteur (« B.D. ARL DOC » donne « B.D. … DOC »). Pour chacun : documents, nombre en sommeil (en effectifs, pas seulement en pourcentage ; « petit effectif » sous 30 documents), prêts par document. Un rayon **nettement plus calme** que son fonds (au moins 15 % en sommeil et deux fois la part du fonds) est signalé. L'équipe choisit pour chaque rayon : examiné exemplaire par exemplaire (par défaut), **à conserver** (mission, patrimoine, BD muettes…) ou **à repenser en bloc**, chaque choix étant expliqué sur la carte. Chaque carte donne aussi la liste des documents qui **sortent moins que leur rayon** : moins de la moitié, du tiers (par défaut) ou du quart des prêts annuels médians du rayon depuis leur entrée, au moins 2 ans de recul, et moins de 2 prêts cette année. C'est le calcul le plus difficile à refaire dans Excel à partir de la liste globale ; il est exporté dans l'onglet « 2 - Sortent moins (rayon) », avec les mêmes décisions que la liste ciblée.
2. **La liste ciblée.** Les exemplaires qui cumulent plusieurs signaux, chacun **comparé à la norme de son propre rayon** : en sommeil (3 points), moins de la moitié des prêts annuels médians de son rayon depuis son entrée (2), usé et délaissé (2), doublon peu demandé (2), présent dans un autre fonds (1), série entièrement endormie (1). Retenu à partir de 5 points. Un document qui dort dans un rayon qui dort n'y figure que s'il est nettement plus faible que ses voisins.

Garde-fous : sont écartés d'office les exemplaires en prêt ou réservés, entrés depuis moins de 2 ans, empruntés au moins 2 fois dans l'année, ou tomes d'une série encore active ; et, selon les choix de l'équipe, ceux des rayons « à conserver » ou « à repenser en bloc », ceux qui répondent à une **règle de protection** (cote ou titre contenant un texte, ex. « MUET ») et ceux déjà « gardés ». Les rayons protégés et les règles retirent aussi ces exemplaires des listes « Retirer ? ».

Statuts des rayons et règles sont exportés dans l'onglet Excel « Rayons et protections » (modifiable, réimportable). La synthèse a une diapositive « Où agir en priorité ».

**Classeur Excel.** Les onglets se lisent dans l'ordre : « 1 - Liste ciblée », « 2 - Sortent moins (rayon) », puis les listes complètes sur un seul critère (« Critère - sans prêt », « Critère - doublons »…). Chaque feuille commence par un bandeau qui dit à quoi elle sert. Elle est prête à imprimer : paysage, caractères de 12 points, en-têtes répétés, et seules les colonnes utiles en rayon sont imprimées (les autres restent à droite). Les classeurs annotés avec les anciens noms d'onglets restent réimportables.

## Visite guidée

Le dossier `visite/` contient une visite guidée de l'outil (bouton « ? » du bandeau, lien sur la page d'accueil), jouée par le moteur MicroLearn. Le texte est dans `visite/visite.md`, facile à modifier à la main ou par une IA : voir [visite/README.md](visite/README.md).

## Décisions de l'équipe

Chaque ligne des listes propose des choix adaptés à la piste (garder, mettre en avant, transférer, retirer ; réparer, remplacer ; commander…).

- Les choix sont gardés dans le navigateur (`localStorage`), sur cet appareil seulement : c'est un filet de sécurité, pas une sauvegarde.
- L'export Excel reprend les décisions (colonnes *Décision*, *Décidé le*, *Commentaire*). C'est ce classeur qui fait foi : il se partage, se complète dans Excel (saisie libre acceptée).
- Redéposer ce classeur, seul ou avec une nouvelle extraction, restitue les décisions. À la prochaine extraction, les titres déjà examinés apparaissent comme tels. La décision la plus récente l'emporte.
- Les lignes sont reconnues par le code-barres (à défaut cote + titre), et les séries par fonds + nom de série.
- Les constats notés depuis la fiche d'un exemplaire vont dans l'onglet *Notes de rayon* du classeur.
- Avant « Nouveau fichier », l'outil propose de télécharger la sauvegarde s'il y a des décisions ou des photos.

## Photos

Depuis la fiche d'un exemplaire, « Ajouter une photo » ouvre l'appareil photo (ou le sélecteur de fichiers sur ordinateur). Les photos sont réduites à 1600 px (JPEG, environ 200 à 400 Ko) et gardées dans le navigateur (IndexedDB).

La **sauvegarde complète** est un ZIP qui contient :

- le classeur Excel, dont l'onglet *Notes de rayon* a des liens « Voir 1, Voir 2… » vers chaque photo (ils fonctionnent une fois le ZIP décompressé) ;
- un dossier `photos/` avec des noms lisibles : `cote - titre - code-barres - date - n°.jpg` ;
- `photos.json`, qui permet de redéposer le ZIP tel quel dans l'outil pour tout retrouver, sans doublon.

## Lecture du code-barres

Sur téléphone ou tablette, le bouton à droite de la recherche ouvre la caméra arrière. Deux lecteurs travaillent en parallèle : le lecteur natif du navigateur quand il existe (Chrome sur Android) et ZXing, réglé pour les étiquettes de bibliothèque (Codabar 14 chiffres, ITF, Code 39/128) sur une bande centrale de l'image en pleine résolution. Un code présent dans l'extraction est accepté tout de suite ; un code inconnu doit être lu deux fois à l'identique. La lampe est proposée quand le téléphone le permet. Un ISBN (13 chiffres commençant par 978/979) est signalé comme tel : c'est le code de l'éditeur, absent des extractions. L'image n'est ni enregistrée ni envoyée. La caméra n'est accessible qu'en HTTPS : c'est le cas sur GitHub Pages.

## Confidentialité

Tout se passe dans le navigateur. Le fichier n'est ni envoyé ni conservé : pas de serveur, pas de cookie, pas de mesure d'audience. Seules les décisions, notes et photos saisies sont gardées localement, sur l'appareil, et peuvent être effacées depuis l'onglet « Exporter ». Seules les bibliothèques JavaScript (SheetJS, ExcelJS, PptxGenJS, jsPDF, JSZip, ZXing) sont chargées depuis un CDN public.

## Colonnes reconnues

Les en-têtes sont détectés automatiquement (accents et casse ignorés), où qu'ils soient dans les 25 premières lignes :

| Donnée | Exemples d'en-têtes acceptés |
|---|---|
| Fonds | Fonds, Localisation, Section (à défaut : nom de l'onglet) |
| Cote | Cote |
| Titre | Titre |
| Série | Titre ensemble, Série |
| Statut | Disponibilité, Statut |
| Dernier prêt | Dernier emprunt, Date dernier prêt |
| Prêts de l'année | Nb prêts année |
| Prêts totaux | Nb prêts vie, Nb prêts total |
| Publication | Date de publication, Année |
| Entrée | Création exemplaire, Date d'acquisition |

Il faut au minimum un titre ou une cote, et une donnée de prêt. Les analyses qui dépendent d'une colonne absente sont masquées.

## Principes

- Ce sont des **pistes**, jamais des décisions : l'outil ne voit ni l'état physique, ni l'intérêt patrimonial, ni la politique documentaire.
- Un tome sans prêt dans une série encore empruntée est signalé comme tel, plutôt que proposé au retrait.
- Pour un doublon, l'outil propose de garder l'exemplaire le moins emprunté (a priori le moins abîmé).
- La date de référence est la date de prêt la plus récente du fichier (≈ date d'extraction). Si l'historique des prêts paraît tronqué (changement de SIGB), c'est signalé.

## Mise en ligne (GitHub Pages)

Site statique sans étape de compilation : pousser le dépôt puis, dans *Settings → Pages*, choisir la branche `main` et le dossier racine.

Pour tester en local : ouvrir `index.html` dans un navigateur, ou lancer `python -m http.server` dans le dossier.

Le `.gitignore` exclut les fichiers `.xlsx`, `.xls`, `.ods` et `.csv` pour qu'aucune extraction réelle ne soit publiée par erreur.
