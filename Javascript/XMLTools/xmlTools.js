/*
content : xml node
return : xml node with text node encoded
*/
function encodeContentToHTML ( content ){
    function ecodeNodetoHTML ( node ){
      if(node && node.hasSimpleContent() && node.nodeKind() == "element")
        {
        var nodeContent = node.toString();
        nodeContent = encodeHTMLEntities(nodeContent);
        node.setChildren( nodeContent );
        }
      else if( node )
      {
        var elements = node.elements();
        for(var i = 0; i < elements.length(); i++ )
          {
          elements[i] = ecodeNodetoHTML( elements[i] );
          }
      }
      if(node && node.nodeKind() == "element" )
      {
        var attributes = node.attributes();  
        for(var i = 0; i < attributes.length(); i++ )
         {      
            node.@[attributes[i].name().toString()] = encodeHTMLEntities( attributes[i].toString() );    
         }
      }   
      return node;
    }
  content = ecodeNodetoHTML( content )
  return content;
}
function encodeHTMLEntities( string ){
  return string.replace(/[\u00A0-\u9999]/g, function(i) {
   return '&#'+i.charCodeAt(0)+';';
  });
  /*
  return string.replace(/\u20AC/g, function(i) {
     return '&euro;';
    })
    .replace(/\u0152/g, function(i) {
     return '&OElig;';
    })
    .replace(/\u0153/g, function(i) {
     return '&oelig;';
    })
  */
} 
function decodeHTMLEntities( string ){
  return string.replace(/&#([0-9]+);/g, function(i) {
   return String.fromCharCode(i);
  });
} 

//Fonctions utilitaires pour mettre à jour une valeur (value) dans un arbre (node) suivant un chemin XPath (xpath)
function setObjFromXPath( node, xpath, val ){
  if( typeof val == "xml")
    value = val.copy();
  else
    value = val.toString();
  //Retrait des eventuels [
  xpath = xpath.replace(/\[|\]/g,"");
  var arr = xpath.split('/');
  var arrExpr = "";
  for(var i in arr)
    arrExpr += "['" + arr[i] + "']";
  
  //Au cas ou le noeud (dernier element du chemin xpath) est un element, et que son nom n'est pas le même que celui retourné par la requete
  var destination = arr[ arr.length - 1 ];
  
  if( ! destination.match("^@") && typeof value == "xml" && value.nodeKind() == "element")
    {
    value.setName( destination );
    }
  //Au cas ou le noeud est un attribut    
  if( destination.match("^@"))
  {
  value = value.toString();  
  }
  eval("node" + arrExpr + " = value;");
}


//Fonctions utilitaires pour obtenir une valeur dans un arbre (node) suivant un chemin XPath (xpath)
function getObjFromXPath( node, xpath ){
  //Retrait des eventuels [
  xpath = xpath.replace(/\[|\]/g,"");
  var value;
  var arr = xpath.split('/');
  var arrExpr = "", value;
  for(var i in arr)
    arrExpr += "['" + arr[i] + "']";
  eval("value = node" + arrExpr );
  
  //logInfo("node['geo']['ville'] = " + node['geo']['ville']);
  return value.copy();
}