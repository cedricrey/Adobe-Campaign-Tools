//Browser simulation
window = {
  location : 
    {
    "href":"about:blank",
    "origin":"null",
    "protocol":"about:",
    "username":"",
    "password":"",
    "host":"",
    "hostname":"",
    "port":"",
    "pathname":"",
    "search":"",
    "hash":""
    }
}
location = window.location;

document.body = <body/>;
document.createElement = function( eltName ){
    return <{eltName}/>;
  };
document.getElementById = function ( id ){
  var ae = document.body.descendants();
  for(var i in ae)
    {
    if(ae[i].attribute('id').toString() == id)
      return ae[i];
    }
  return null;
}
document.getElementsByClassName = function ( className ){
  var ae = document.body.descendants();
  var rArr = [];
  var regex = new RegExp("(^|\s)" + className + "(\s|$)");
  for(var i in ae)
    {
   // if(ae[i].attribute('class').toString() == className)
    if ( regex.test( ae[i].attribute('class').toString() ) )
      rArr.push(ae[i]);
    }
  return rArr;
}
XML.prototype.getElementsByClassName = function ( className ){
  var ae = this.descendants();
  var rArr = [];
  var regex = new RegExp("(^|\s)" + className + "(\s|$)");
  for(var i in ae)
    {
   // if(ae[i].attribute('class').toString() == className)
    if ( regex.test( ae[i].attribute('class').toString() ) )
      rArr.push(ae[i]);
    }
  return rArr;
}
/*elt : (XML) element root from wich searching starts
 className : (String) class name*/
function findElementsByClassName( elt , className){
  var ae = elt.descendants();
  var rArr = [];
  var regex = new RegExp("(^|\s)" + className + "(\s|$)");
  for(var i in ae)
    {
   // if(ae[i].attribute('class').toString() == className)
    if ( regex.test( ae[i].attribute('class').toString() ) )
      rArr.push(ae[i]);
    }
  return rArr;
}
document.getElementsByTagName = function ( tagName ){
  var ae = document.body.descendants();
  var rArr = [];
  for(var i in ae)
    {
    if(ae[i].name().toString() == tagName)
      rArr.push(ae[i]);
    }
  return rArr;
};
XML.prototype.getElementsByTagName = function ( tagName ){
  var ae = this.descendants();
  var rArr = [];
  for(var i in ae)
    {
    if(ae[i].name().toString() == tagName)
      rArr.push(ae[i]);
    }
  return rArr;
};
/*elt : (XML) element root from wich searching starts
 tagName : (String) tag name*/
function findElementsByTagName( elt , tagName){
  var ae = elt.descendants();
  var rArr = [];
  for(var i in ae)
    {
    if(ae[i].name() && ae[i].name().toString() == tagName)
      rArr.push(ae[i]);
    }
  return rArr;
};
function setTimeout( fn, ms ){
	var nextDate = new Date();
  nextDate.setTime( nextDate.getTime() + ms );
  var i = 100000;//Securisation;
  while (new Date() < nextDate && i>0)
  {
   i--;
  }
  fn();
}
this.setTimeout = setTimeout;

function setInterval( fn, ms ){
  fn();
}
this.setInterval = setInterval;

function clearTimeout( t ){
}
this.clearTimeout = clearTimeout;

function clearInterval( t ){
}
this.clearInterval = clearInterval;

console = {};
console.log = function( args ){
	logInfo( args );
};
console.warn = function( args ){
	logWarning( args );
};

function htmlyze( node ){
      if(node.hasSimpleContent() && node.nodeKind() == "element")
        {
        
        }
      else 
      {
        var elements = node.elements();
        for(var i = 0; i < elements.length(); i++ )
          {
          if( elements[i].name().toString() == "style")
          	{
          	node.@style = convertStyleDom( elements[i] );
          	delete node[elements[i].name().toString()];
          	}
          else
          	elements[i] = htmlyze( elements[i] );
          }
      }
      /*
      if( node.nodeKind() == "element" )
      {
        var attributes = node.attributes();  
        for(var i = 0; i < attributes.length(); i++ )
        {
            //Chaque attribut : attributes[i] - attributes[i].name() - attributes[i].toString()
            //logInfo(node.name() + " - " + attributes[i].name() + " ---- " + attributesToConvert.indexOf(attributes[i].name().toString()))
          
         }
      }
      */
      return node;
}
function convertStyleDom( styeNode ){
	var rSt = "";
	var elements = styeNode.elements();  
    for(var i = 0; i < elements.length(); i++ )
    {
    	rSt += elements[i].name() + ":" + elements[i].toString();
    }
    return rSt;
}