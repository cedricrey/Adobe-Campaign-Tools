## Sort large Array of object 
```
// le tableau à trier
var liste = ['Delta', 'alpha', 'CHARLIE', 'bravo'];

// Création d'objet temporaire qui contient les positions
// et les valeurs en minuscules
var mapped = liste.map(function(e, i) {
  return { index: i, value: e.toLowerCase() };
})

// on trie l'objet temporaire avec les valeurs réduites
mapped.sort(function(a, b) {
  if (a.value > b.value) {
    return 1;
  }
  if (a.value < b.value) {
    return -1;
  }
  return 0;
});

// on utilise un objet final pour les résultats
var result = mapped.map(function(e){
  return liste[e.index];
});

```
Works on a v7.0 instance
(from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort thanks Moz ;-) )
