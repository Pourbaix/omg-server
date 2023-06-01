## A. Explication de la fonctionnalité 
---
L'import automatique à pour but de diminuer la charge utilisateur en important les données depuis une API fournie par le fabricant de la pompe. Dans ce cas-ci, il s'agit de l'API de l'application [Carelink Connect]([CareLink™ Connect - Apps on Google Play](https://play.google.com/store/apps/details?id=com.medtronic.diabetes.carepartner&hl=en_US&gl=US)) et du site web [Logiciel CareLink™ Personal – Pour les personnes diabétiques (minimed.eu)](https://carelink.minimed.eu/app/login).

Comme l'application et le site web peuvent recevoir des mises à jour, l'API peut elle aussi changer. Si un des composant de l'API change sa manière de fonctionner, ça peut casser la fonctionnalité d'import automatique dans OMG. J'ai moi même expérimenté ce problème lors de la réalisation de mon TFE.

C'est pour cette raison que j'ai décidé de produire ce document, afin de guider un nouvel étudiant dans la compréhension de cette API et du travail que j'ai réalisé jusque ici pour l'utiliser. Je vais aussi donner des pistes pour régler un potentiel problème avec l'API si elle venait à changer dans le futur.

Pour construire l'import automatique, je me suis inspiré de [ce projet GitHub](https://github.com/ondrej1024/carelink-python-client) qui fournis une classe permettant d'effectuer la connexion et la récupération des données en utilisant les routes de l'API dont je vais parler dans un instant. 

## B. Composition de l'API
---
Dans les routes que j'ai utilisées, il y en a pour effectuer la connexion/authentification et d'autres pour récupérer les infos comptes/data.

### <u>B1. Phase de connexion</u>

Cette phase sert à récupérer le token qui sera utilisé pour la récupération de données.

#### >> On contacte 3 routes pour effectuer l'authentification:
1. https://carelink.minimed.eu/patient/sso/login, 

	 -> <u>MÉTHODE</u>: `GET`
	 -> <u>PARAMS</u>: `lang` et `country`, qui correspondent à la langue et le pays 
	 -> <u>DESCRIPTION</u>: Cet appel permet simplement de charger une page de connexion à CareLink. Vous pouvez tester la page sur votre navigateur en allant sur la route https://carelink.minimed.eu/patient/sso/login?country=BE&lang=ENG. On va utiliser l'HTML reçu pour extraire le `sessionId` et le `sessionData` que vous pouvez d'ailleur aussi observer dans l'URL de la page quand elle a finit de charger.
2. https://mdtlogin.medtronic.com/mmcl/auth/oauth/v2/authorize/login,

 	-> <u>MÉTHODE</u>: `POST`
 	-> <u>PARAMS</u>: Le `sessionId` et `sessionData` récupéré précédemment ainsi que les credentials de l'utilisateur avec lequel on souhaite se connecter dont le `username`, le `password`. On ajoute aussi à ça `local` pour la langue dans laquelle les données sont récupérées, `action` ser à "login" et `actionButton` set à "Log in". Attention toutes ces données doivent être envoyées via le POST et il ne faut pas oublier de garder les paramètres `country` et `lang` dans l'URL. 
 	-> <u>DESCRIPTION</u>: Avec cet appel on va se connecter et faire valider les identifiants utilisateur.
3. https://mdtlogin.medtronic.com/mmcl/auth/oauth/v2/authorize/consent,

 	-> <u>MÉTHODE</u>: `POST`,
 	-> <u>PARAMS</u>: Toujours le `sessionId` et `sessionData` mais cette fois récupéré de l'appel précédent (le login). À cela, on ajoute `action`, `response_type` et `response_mode`.
 	-> <u>DESCRIPTION</u>: C'est ici que l'on va récupérer le cookie qui sera ensuite utilisable pour faire des requêtes pour obtenir des données sur le patient ou le compte utilisateur.

### <u>B2. Phase de récupération des données </u>

#### >> Une fois le token récupéré on peut aller chercher les données des dernières 24h:

Pour récupérer les données des dernière 24h, il suffit de contacter la route:
- https://carelink.minimed.eu/patient/monitor/data,
> <u>MÉTHODE</u>: `POST`,
> <u>PARAMS</u>: Le username de l'utilisateur avec lequel on est actuellement connecté `username`, le role de cet utilisateur (il peut être récupéré avec la route `https://carelink.minimed.eu/patient/users/me/profile` qui fournit toutes les information sur l'utilisateur connecté) `role` et le username du patient dont on souhaite récupérer les données `patientId`.
> <u>DESCRIPTION</u>: Permet de récupérer les données des dernières 24 heures contenant les données d'inusline et de glycémie.

Il y a aussi moyen de récupérer la liste des utilisateurs suivis par un compte ne contactant la route https://carelink.minimed.eu/patient/m2m/links/patients.

Toutes ces routes sont utilisées dans le fichier de classe `careLinkImport.js` présent dans le backend OMG-Server.

## C. Comment agir quand l'API est modifiée
---

Si jamais il arriverait que l'API soie encore modifiée dans le futur (ce qui va évidemment arriver un jour ou l'autre), il existe plusieurs manières de troubleshoot les problèmes et de remettre l'import-auto en état de marche.

1. Effectuer un processus de connexion et de récupération de données sur le site web de CareLink comme le ferait un utilisateur lambda. Tous cela dans le but d'ouvrir la console et de visualiser les requêtes qui sont faites en arrière plan dans la section `Réseau` du navigateur. Cela permettra d'éventuellement repérer des changements dans les requêtes effectuées.

2. Aller voir les issues des projets qui utilises cet API comme https://github.com/ondrej1024/carelink-python-client ou https://github.com/nightscout/minimed-connect-to-nightscout. Si jamais il n'y en a pas qui traite le problème, vous pouvez en créer une. 

3. Vous pouvez également aller voir le travail de [bewest](https://github.com/bewest) qui a analysé en profondeur l'API de CareLink.

Pour tester des routes et visualiser les données récupérées vous pouvez aussi utiliser des outils comme Postman ou Thunder-Client.