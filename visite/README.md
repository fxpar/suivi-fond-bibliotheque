# Visite guidée

Diaporama qui présente l'outil pas à pas, joué par le moteur **MicroLearn** (https://github.com/edu-fpar/micro-learning-app), copié dans ce dossier (version 1.0.0, commit `3db88cc`). Cette copie est désormais un module à part entière : on peut la modifier librement.

## Modifier la visite

Tout le texte est dans **`visite.md`**, au format MicroLearn : slides séparées par `---`, une ligne `<!-- slide: format-… -->` en tête de chaque slide. La référence complète des formats : https://edu-fpar.github.io/micro-learning-app/docs/skill.md

Pour la faire modifier par une IA :

> Lis https://edu-fpar.github.io/micro-learning-app/docs/skill.md, puis modifie ce fichier `visite.md` : … (en gardant les formats `format-prenom` et `format-sms` décrits ci-dessous).

## Ce qui est propre à la visite (`visite.js`)

**Textes de l'interface** : le lecteur passe au tutoiement et parle de « visite » et d'« étapes » (accueil « Choisis tes guides », écran de fin « Visite terminée ! », bouton « Ouvrir l'outil »…). Tous ces textes sont regroupés en tête de `visite.js` (`MLS.i18n.add('fr', …)`).

**Écran de fin sans note** : le quiz reste interactif, mais l'écran de fin n'affiche pas de score.

**Couleurs** : celles de l'outil, dans le `<style>` de `index.html`.

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
