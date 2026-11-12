# Suivi de fonds

Outil web pour analyser une extraction de fonds de bibliothèque (export SIGB en Excel, ODS ou CSV, un ou plusieurs onglets) et en tirer :

- **une vue d'ensemble** : circulation par fonds, part du fonds / part des prêts, rotation selon l'âge des documents, constats rédigés ;
- **des pistes à examiner**, chacune motivée et réglable : *retirer ?* (sans prêt depuis N mois, doublons peu demandés), *remplacer ?* (exemplaires très empruntés), *renforcer ?* (forte demande, séries incomplètes), *régulariser* (perdus, contestés, en réparation) ;
- **une recherche d'exemplaire** (code-barres, cote ou titre), avec lecture du code-barres par la caméra sur téléphone : la fiche montre les listes où l'exemplaire apparaît et permet de noter un constat en rayon ;
- **trois exports** : un classeur Excel prêt à annoter en rayon (une feuille par piste, triée par cote, colonne *Décision* à liste déroulante), une synthèse de 6 pages au plus pour la direction (PowerPoint ou PDF), un résumé texte à coller dans un assistant IA si on le souhaite.

## Décisions de l'équipe

Chaque ligne des listes propose des choix adaptés à la piste (garder, mettre en avant, transférer, retirer ; réparer, remplacer ; commander…).

- Les choix sont gardés dans le navigateur (`localStorage`), sur cet appareil seulement : c'est un filet de sécurité, pas une sauvegarde.
- L'export Excel reprend les décisions (colonnes *Décision*, *Décidé le*, *Commentaire*). C'est ce classeur qui fait foi : il se partage, se complète dans Excel (saisie libre acceptée).
- Redéposer ce classeur, seul ou avec une nouvelle extraction, restitue les décisions. À la prochaine extraction, les titres déjà examinés apparaissent comme tels. La décision la plus récente l'emporte.
- Les lignes sont reconnues par le code-barres (à défaut cote + titre), et les séries par fonds + nom de série.
- Les constats notés depuis la fiche d'un exemplaire vont dans l'onglet *Notes de rayon* du classeur.

## Lecture du code-barres

Sur téléphone ou tablette, le bouton à droite de la recherche ouvre la caméra arrière. Le navigateur utilise son lecteur natif quand il existe (Chrome sur Android), sinon la bibliothèque ZXing, chargée à la demande (iPhone). L'image n'est ni enregistrée ni envoyée. La caméra n'est accessible qu'en HTTPS : c'est le cas sur GitHub Pages.

## Confidentialité

Tout se passe dans le navigateur. Le fichier n'est ni envoyé ni conservé : pas de serveur, pas de cookie, pas de mesure d'audience. Seules les décisions saisies sont gardées localement, sur l'appareil, et peuvent être effacées depuis l'onglet « Exporter ». Seules les bibliothèques JavaScript (SheetJS, ExcelJS, PptxGenJS, jsPDF, ZXing) sont chargées depuis un CDN public.

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
