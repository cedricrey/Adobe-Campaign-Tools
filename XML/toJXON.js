/*
Return a JXON from a DOMDocument or DOMElement
JXON vs DOM : https://experienceleague.adobe.com/developer/campaign-api/api/p-6.html
DOM : https://experienceleague.adobe.com/developer/campaign-api/api/c-DOMDocument.html
*/

function toJXON(domDocument) {
    function transformElement( domDocument ){
      var obj = {};
      var attrs = domDocument.attributes;
      for (var k in attrs) {
          var attr = attrs[k];
          obj[attr.name] = attr.value;
      }
      var elms = domDocument.getElements();
      for (var k in elms) {
          var tagName = elms[k].tagName;
          //multiple children management
          if( obj[tagName] )
            {
              if( obj[tagName].constructor != Array )
                obj[tagName] = [obj[tagName]];
            obj[tagName].push( transformElement(elms[k]) );
            }
          else
            obj[tagName] = transformElement(elms[k]);
      }
      var childs = domDocument.childNodes
      for( var k in childs )
      {
      var child = childs[ k ];    
      if ( ( child.nodeType == 3 || child.nodeType == 4 ) && child.nodeValue.replace(/^\s+$/m,'') != "" )
          {
          obj['$'] = child.nodeValue;
          }
      }    
       return obj;
    }
    var rootObj = {};
    //If document and not element
    if( domDocument.nodeType == 9)
      domDocument = domDocument.root;
    rootObj[ domDocument.tagName ] = transformElement( domDocument );
    return rootObj;
}
