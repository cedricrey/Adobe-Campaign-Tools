//Sorry for the french documentation...
//Script de modification de l'objet diffusion dans l'activité 'delivery'
//Ici : changement à la vollée du mapping (nms:deliveryMapping) sans tout casser

var newMappingId = 123456789
//On change d'abord la clef du lien
delivery.mapping_id = newMappingId;
//On charge ensuite le nouveau mapping
var newMapping = nms.deliveryMapping.load(newMappingId)
//Pour modifier la diffusion (delivery), on va travailler sur sa forme DOM
var deliveryXML = delivery.toDocument();
//Idem avec le nouveau mapping
var newMappingDOM = newMapping.toDocument();
//Par défaut, le vrai nom des mapping est 'deliveryMapping', on va le mettre avec son nom vue de la diffusion : mapping
newMappingDOM.renameNode( newMappingDOM.root, '', 'mapping');
//On créer une copie exploitable dans le DOM de la diffusion (sinon, on se fait jeter : 'SCR-160037 L'objet XML n'appartient pas au même document.')
var newMappingCopy = deliveryXML.importNode(newMappingDOM.root, true );
//On remplace l'ancien <mapping> par le nouveau
deliveryXML.root.replaceChild(  newMappingCopy , deliveryXML.getElementsByTagName('mapping')[0] );
//FIN : l'objet "delivery" sera sauvé avec les modification apportée à son alter ego 'DOM'...
