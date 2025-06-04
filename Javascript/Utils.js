

//Function to find 'closest' type of folder, from another folder.
//Will go up in the tree.
function findClosestFolderType( fullName, model ){
   
  var folder = null;
  cursor = fullName;
  while (folder == null && cursor != "" )
    {
    var fQuery = NLWS.xtkQueryDef.create( {
      query : {
        schema : "xtk:folder",
        operation : "select",
        select : {
          node : [
            { expr : "@id" },
            { expr : "@fullName" },
            { expr : "@label" }            
          ]
        },
        where : {
          condition : [
            { expr : "@fullName LIKE '"+ cursor +"' + '%'"},            
            { expr : "@model = '"+model+"'"}
            ]
          }      
        }    
      } );
      
      var res = fQuery.ExecuteQuery();
      if( res.getElementsByTagName('folder').length > 0)
        folder = res.getElementsByTagName('folder')[0];
      else
        cursor = cursor.replace(/(.*)\/[^\/]*$/g,'$1');  
      
    }//while
  return folder;
}

//Special for French, but can match to all : make the string in Camel case for french place
function toPlaceCase(inStr) {  var str = inStr.replace(/\w[^- ]*/g, function(tStr) {
      var linkWords = new Array("d'",'de','du','la','le','les',"l'",'lès','et','en','sous','sur');
      if(linkWords.indexOf(tStr.toLowerCase()) == -1 ){return tStr.charAt(0).toUpperCase() + tStr.substr(1).toLowerCase();} 
      else return tStr.toLowerCase();
    });  
    return str.charAt(0).toUpperCase() + str.substr(1);
}
String.prototype.toPlaceCase = function(){
  return toPlaceCase( this );
}
