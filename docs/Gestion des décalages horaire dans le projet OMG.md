Dans le cadre de l'importation et de la visualisation des données dans l'application OMG, il y a un point assez sous-estimé et pourtant très important c'est le décalage horaire. 

En effet, lors d'une mise en production, on se rend vite compte que le VPS n'est pas dans le même fuseau horaire que la Belgique et que ça cause des problèmes au niveau du stockage des datetime des données.

## Processus de gestion des données temporelles

```mermaid
---
Datetime data management process 
---
flowchart TD
	id1[Donnée importée dans l'application] 
	id2([Stockage en <u>UTC0</u> en DB])
	id3[Donnée visualisée en frontend par l'utilisateur]

	subgraph <u></u>
	id1 -- Conversion en UTC0 --> id2 
	id2 -- Conversion sur le fuseau horaire utilisateur --> id3
	end
```

Pour résumer, voici les **3 états** dans lequel les données se trouvent:
1. ***Donnée importée***
2. ***Donnée stockée en base de données***
3. ***Donnée visualisée par le l'utilisateur***

Et les **2 étapes** pour passer d'un état à l'autre:
1. ***Conversion d'une donnée importée en UTC0***
2. ***Conversion d'une donnée au fuseau horaire de l'utilisateur***

## Conversion des données importées en UTC0

Quand on importe des données dans la base de données que ce soit avec l'import manuel ou automatique, elles seront calquées sur le fuseau horaire du compte du patient. On veut pouvoir convertir ces données en UTC0 pour les stocker et les redistribuer aux utilisateurs pour la visualisation.

Le principal souci est de savoir sur quel fuseau horaire sont calquées les données. 

- Dans le cas de l'**import manuel**, on part du principe que les données ont toujours des datetimes calquées sur le fuseau horaire Belge. On enlève donc en conséquence les heures nécessaires aux datetimes des données importées (2h en heure été et 1h autrement).

- Pour l'**import automatique**, on utilise la variable de pays fournie par l'utilisateur lors de la configuration. Cette variable représente un code pays comme par example "BE" ou "US". Grâce à ce code pays, on peut déduire le pays lié et donc le décalage horaire en utilisant la librairie  `countries-and-timezones`. Elle fournie une méthode nommée `getTimezonesForCountry` qui permet de récupérer les informations sur le fuseau horaire d'un pays donné. A partir de là, il suffit d'enlever les heures nécessaires.

Un gros souci avec la mise des données en UTC0 dans le backend, c'est qu'à partir du moment où on fait l'usage de la classe `Date`, un décalage horaire est automatiquement appliqué au données. En production, ce n'est pas un soucis car le VPS est dans une zone UTC0 c'est à dire sans décalage horaire donc les données ne sont pas altérées. Mais en développement, comme le backend est hébergé sur la machine du développeur, un décalage est appliqué.

Pour résoudre tous les problèmes cité auparavant, j'ai pris soin de construire des méthodes spécialisées. On peut les retrouvées dans le fichier `dateUtils.js` qui se trouve dans le dossier `utils` du projet ***OMG-SERVER***.
Voici un résumé des fonctions que l'on retrouve et de leur but premier:

1. **hasDST(),**
```js 
function hasDST(date = new Date(), zone) {
    return moment.tz(date.toISOString(), zone).isDST();
}
```
**N.B.**: DST = "Daylight Saving Time" 
> Cette première fonction va permettre de détecter les datetimes se situant dans la période d'heure d'été. Cette opération s'avérait difficile car, comme énoncé auparavant, comme les datetimes peuvent être calquées sur n'importe quel fuseau horaire, les périodes d'heure d'été peuvent aussi varier. Par exemple au US, l'heure d'été a commencé le 12 mars 2023, et en Belgique c'était le 26 mars 2023. 

2. **normalizedUTC()**,
```js
function normalizedUTC(date) {
    // Used to cancel the Offset of the server
    let offset = new Date().getTimezoneOffset() * 60000;
    let newDateMs = date + offset;
    return newDateMs;
}
```
> Avec cette méthode, on va enlever le décalage horaire du serveur de la datetime. Ici on utilise la représentation en millisecondes pour effectuer les opérations.

3. **normalizedUTCWithCountry()**,
```js
function normalizeUTCWithCountry(country, date) {
    // Used to cancel the Offset of the data from the Carelink API
    // The offest is set by Carelink based on the country code
    let timezone = ct.getTimezonesForCountry(country);
    let offset = 0;
    if (hasDST(new Date(), timezone[0].name)) {
        offset = timezone[0].dstOffset * 60000;
    } else {
        offset = timezone[0].utcOffset * 60000;
    }
    let newDateMs = date - offset;
    return newDateMs;
}
```
> Même principe que la méthode précédente mais ici c'est utilisé pour enlever le décalage des datetimes des données provenant de l'import. On doit donc utiliser le code pays à la fois pour récupérer le décalage horaire mais aussi pour savoir si la datetime cible est en DST ou pas. Comme avec les autres méthodes on travaille avec les millisecondes pour les opérations de soustraction.

4. **toNormalizedUTCISOStringWithCountry()**,
```js
function toNormalizedUTCISOStringWithCountry(country, date) {
    // Takes an ISO String as input and return the ISO String at UTC:0
    let oldTimeMs = new Date(date).getTime();
    let newTimeMs = normalizeUTCWithCountry(country, oldTimeMs);
    let newIso = new Date(date);
    newIso.setTime(newTimeMs);
    return newIso.toISOString();
}
```
> Utilise la méthode précédente mais retourne la datetime en format ISO. C'est très utile à la fois lors du stockage des données en DB et également pour les comparaisons avec les données déjà stockées. En effet, lorsqu'on récupère une datetime de la DB, elle est en format ISO.

5. **roundTo5Minutes()**,
```js
function roundTo5Minutes(numberOfMinutes) {
    if (numberOfMinutes % 5 == 0) {
        return numberOfMinutes;
    }
    let minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    let roundedTime = 0;
    for (let i in minutesList) {
        if (minutesList[i] < numberOfMinutes) {
            roundedTime = minutesList[i];
        } else {
            return roundedTime;
        }
    }
    return roundedTime;
}
```
> C'est une méthode utilisée à beaucoup d'endroit dans l'application qui permet d'arrondir les minutes à un multiple de 5. C'est une règle qui a été fixée avec la cliente pour garantir la compatibilité entre les différents types de données de l'application et pour pouvoir plus facilement les associer.

6. **ISOTo5Minutes()**,
```js
function ISOTo5Minutes(ISODate) {
    let newDate = new Date(ISODate);
    let minutes = newDate.getMinutes();
    let newMinutes = roundTo5Minutes(minutes);
    newDate.setMinutes(newMinutes);
    newDate.setSeconds(0);
    return newDate.toISOString();
}
```
> Même chose que au dessus mais retourne la datetime au format ISO. Aussi utile lors des comparaison avec des datetimes provenant de la base de données.


## Conversion d'une donnée au fuseau horaire de l'utilisateur

Lorsqu'une donnée est récupérée par le backend et envoyée au frontend pour être visualisée, il faut qu'elle soie convertie dans le fuseau horaire de l'utilisateur.

Pour ce faire, on utilise la classe `Date` en JS. Cette classe nous est très utile car si on lui passe la datetime UTC0 en paramètre, elle nous retourne une date avec le décalage horaire requis appliqué.

On peut partir du principe que les datetimes récupérées de la DB sauront au format ISO.
On peut donc utiliser ces datetimes pour instancier la classe `Date`:
```js
new Date("2023-05-01T15:00:00.000Z");
```
Cette instruction nous donne cette date: `Mon May 01 2023 17:00:00 GMT+0200 (heure d’été d’Europe centrale)`. On peut observer que 2 heures ont été ajoutées ce qui correspond bien au décalage horaire en Belgique à l'heure d'été (Là où je me trouve). 
Le décalage appliqué dépend de là où se trouve l'utilisateur car c'est sa machine (le frontend) qui instancie la classe `Date` et c'est exactement ce qui est recherché ici.