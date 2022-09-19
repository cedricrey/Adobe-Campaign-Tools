

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
