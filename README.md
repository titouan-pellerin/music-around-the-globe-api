# Music Around The Globe

Une application web interactive pour découvrir de la musique à travers le monde. Le principe est assez simple. L'utilisateur commence par renseigner ses artistes favoris. L'algorithme va utiliser cette sélection pour trouver des artistes en lien avec les goûts de l'utilisateur, pour ensuite les afficher autour d'un globe 3D selon leur emplacement sur la planète.

Ce dépôt correspond à l'API. Cette API fait elle-même appel aux API de Spotify, MusicBrainz et Mapbox. 

[Dépôt de l'interface utilisateur](https://github.com/titouan-pellerin/music-around-the-globe)

Une première démonstration de l'application est disponible en suivant ce lien :
[http://globe.titouanpellerin.info](http://globe.titouanpellerin.info)

Le projet est encore en cours de développement. L'étape sur laquelle je travaille actuellement, correspond à l'affichage des informations d'un artiste sur lequel on cliquerait depuis le globe 3D.

## Project run
```
node index.js
```
