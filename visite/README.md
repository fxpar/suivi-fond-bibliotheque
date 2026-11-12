# Visite guidée

Diaporama qui présente l'outil pas à pas, joué par le moteur **MicroLearn** (https://github.com/edu-fpar/micro-learning-app), copié dans ce dossier (version 1.0.0, commit `3db88cc`). Cette copie est désormais un module à part entière : on peut la modifier librement.

## Modifier la visite

Tout le texte est dans **`visite.md`**, au format MicroLearn : slides séparées par `---`, une ligne `<!-- slide: format-… -->` en tête de chaque slide. La référence complète des formats : https://edu-fpar.github.io/micro-learning-app/docs/skill.md

Pour la faire modifier par une IA :

> Lis https://edu-fpar.github.io/micro-learning-app/docs/skill.md, puis modifie ce fichier `visite.md` : … (en gardant les formats `format-prenom` et `format-sms` décrits ci-dessous).

## Organisation : un menu, des parties

La visite commence par le prénom et la conversation d'accueil, puis arrive sur un **menu** (`format-menu`, `<!-- id: menu -->`). Chaque bouton mène à une **partie** :

- une partie commence par une slide `<!-- branch: identifiant -->` (et `<!-- parent: … -->` si elle dépend d'un sous-menu ; par défaut `menu`) ;
- elle s'arrête à la slide qui ouvre une autre partie, à un menu ou à une slide `<!-- id: … -->` ;
- « Suivant » à la fin d'une partie ramène au menu parent, « Précédent » au début d'une partie aussi ;
- sur un menu, « Suivant » mène à la première partie pas encore vue ; les parties vues sont cochées ;
- `<!-- id: fin -->` est la conclusion, atteinte par « J'ai fini la visite ».

Pour ajouter une partie : une ligne dans le menu (`- [📌 Libellé](#identifiant) :: description`) et des slides commençant par `<!-- branch: identifiant -->`.

## Ce qui est propre à la visite (`visite.js`)

**Textes de l'interface** : le lecteur passe au tutoiement et parle de « visite » et d'« étapes » (accueil « Choisis tes guides », écran de fin « Visite terminée ! », bouton « Ouvrir l'outil »…). Tous ces textes sont regroupés en tête de `visite.js` (`MLS.i18n.add('fr', …)`).

**Écran de fin sans note** : le quiz reste interactif, mais l'écran de fin n'affiche pas de score.

**Couleurs** : celles de l'outil, dans le `<style>` de `index.html`.

**`format-menu`** : menu à branches. Les éléments `- [emoji Libellé](#identifiant) :: description` deviennent des boutons ; un titre de lien `"terrain"` (`[…](#id "terrain")`) met l'élément en avant (pleine largeur, fond doré). Les citations `>` sont les répliques du guide : la 1re au premier passage, la 2e au retour, la 3e quand tout a été vu. Avec `<!-- parent: menu -->`, c'est un sous-menu (bouton « Revenir au menu principal ») ; sinon, bouton « J'ai fini la visite ».

**`format-scan`** : mise en situation sur un téléphone simulé. Le texte est la consigne du personnage ; la liste `- **Titre** :: …` forme la fiche (une ligne **Code** donne le code-barres affiché) ; chaque citation `> Choix (expression) :: réaction` devient un bouton de décision, et le personnage réagit avec cette expression. Réglages : `<!-- apres-scan: … -->` et `<!-- apres-photo: … -->` (répliques après le scan et après la photo).

**`format-prenom`** : le personnage pose une question (une citation `>`), l'utilisateur tape son prénom (facultatif, gardé dans le navigateur).

**`format-sms`** : dialogue façon messagerie. Même syntaxe que `format-dialogue` (`> @role(expression): texte`), mais les répliques arrivent seules, précédées de « … ». Chaque réplique reste affichée selon sa longueur (environ 230 mots par minute, entre 1,4 et 8 secondes ; une fois et demie plus si la voix lit les répliques). Boutons « Pause » et « Tout afficher ». Le premier rôle déclaré (`guide`) est toujours à gauche, les autres à droite.

**Le prénom dans le texte** :

| Écrit dans `visite.md` | Avec le prénom | Sans prénom |
|---|---|---|
| `Bonjour {prenom} !` | Bonjour Camille ! | Bonjour  ! |
| `Bienvenue{, prenom} !` | Bienvenue, Camille ! | Bienvenue ! |

Préférez la forme `{, prenom}` : la phrase reste juste si la personne ne donne pas son prénom.

## Mettre à jour le moteur

Recopier depuis le dépôt MicroLearn : `js/core/`, `js/formats/`, `css/player.css`, `assets/characters/`, `vendor/marked/`, `vendor/bootstrap-icons/` et `vendor/bootstrap/css/bootstrap.min.css`. Ne pas toucher à `visite.js`, `visite.md` ni `index.html` : les adaptations de la visite y sont regroupées.
