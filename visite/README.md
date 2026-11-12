# Visite guidée

Diaporama qui présente l'outil pas à pas, joué par le moteur **MicroLearn** (https://github.com/edu-fpar/micro-learning-app), copié tel quel dans ce dossier (version 1.0.0, commit `3db88cc`).

## Modifier la visite

Tout le texte est dans **`visite.md`**, au format MicroLearn : slides séparées par `---`, une ligne `<!-- slide: format-… -->` en tête de chaque slide. La référence complète des formats : https://edu-fpar.github.io/micro-learning-app/docs/skill.md

Pour la faire modifier par une IA :

> Lis https://edu-fpar.github.io/micro-learning-app/docs/skill.md, puis modifie ce fichier `visite.md` : … (en gardant les formats `format-prenom` et `format-sms` décrits ci-dessous).

## Ce qui est propre à la visite (`visite.js`)

**`format-prenom`** : le personnage pose une question (une citation `>`), l'utilisateur tape son prénom (facultatif, gardé dans le navigateur).

**`format-sms`** : dialogue façon messagerie. Même syntaxe que `format-dialogue` (`> @role(expression): texte`), mais les répliques arrivent seules, précédées de « … ». Chaque réplique reste affichée selon sa longueur (environ 230 mots par minute, entre 1,4 et 8 secondes ; une fois et demie plus si la voix lit les répliques). Boutons « Pause » et « Tout afficher ». Le premier rôle déclaré (`guide`) est toujours à gauche, les autres à droite.

**Le prénom dans le texte** :

| Écrit dans `visite.md` | Avec le prénom | Sans prénom |
|---|---|---|
| `Bonjour {prenom} !` | Bonjour Camille ! | Bonjour  ! |
| `Bienvenue{, prenom} !` | Bienvenue, Camille ! | Bienvenue ! |

Préférez la forme `{, prenom}` : la phrase reste juste si la personne ne donne pas son prénom.

## Mettre à jour le moteur

Recopier depuis le dépôt MicroLearn : `js/core/`, `js/formats/`, `css/player.css`, `assets/characters/`, `vendor/marked/`, `vendor/bootstrap-icons/` et `vendor/bootstrap/css/bootstrap.min.css`. Ne pas toucher à `visite.js` ni à `visite.md`.
