//loadLibrary("xtk:json2.js");


var CSVTool = function( arguments ){
  this.options = arguments || {};  
  this.readingMode = this.options.readingMode || 'byLine'; //sinon 'byCol';
  this.rootObjectType = this.options.rootObjectType || 'Object'; //Sinon Array. En mode Object, la première colonne contient le nom de l'attribut { "valeur B1" : { "valeur A2" : "valeur B2" , "valeur A3" : "valeur B3" }}
}

CSVTool.prototype.parseFile = function( fileName ){
  if( this.readingMode == 'byLine')
    return this.parseFileByLine( fileName );
  else
    return this.parseFileByCol( fileName );

}

CSVTool.prototype.parseFileByLine = function( fileName ){
  var datas = this.rootObjectType == "Array" ? [] : {};
  var attributeNames = new Array(); 
  var file = new File( fileName );
  file.open("r");
  var headerLine = file.readln();
  if( fileName != "")
 //SCAN de l'en-tete des colonnes
    if( headerLine )
      {
      headerLine = headerLine.split(";");
        for(var i in headerLine)
          {
          attributeNames[ i ] = headerLine[ i ];
          }
      }
    //var csvReg = new RegExp(/(\"[^\";]+;[^\"]+)|\"([^\"]+)\";|([^;]+)|(;{2,})/g);
    var csvRegTemplate = new RegExp(/"((?:[^"]*"{2}[^"]*|[^"])+)"|([^;]+)|(^;)|(;{2,})/g);
    /* => REG : 4 groupes. 
    1e groupe Tout ce qui est entre " --- " y compris les double double quote (""texte"" servant à mettre du texte entre quote en CSV... faut suivre)
    2e groupe Tout ce qui n'est pas un ";" (donc séparé par ;)
    3e groupe Toutes les lignes qui commencent par ";"
    4e groupe Tous les enchainnement de 2 ";" ou plus
    */ 
           
    //var csvRegBRL = new RegExp(/([^\";]+;[^\"]+\")|"((?:[^"]*"{2}[^"]*|[^"])+)"|([^;]+)|(^;)|(;{2,})/g);
    var csvRegBRLTemplate = new RegExp(/([^\"]+\");|"((?:[^"]*"{2}[^"]*|[^"])+)"|([^;]+)|(^;)|(;{2,})/g);
    
    /*
    => Reg pour le cas particulier du passage à la ligne : identique à la premiere csvReg, mais avec un groupe en 1er qui détecte la fin de la phrase précédente ([^\"]+\");
    */    
    
    var objStr = "";  
    //Pour chaque ligne lue on creer l'objet correspondant
    while( line = file.readln() )
      {
      var obj = [];
      //Decoupage des colonnes
      //line = line.split(";");
      var mtch;
      //Nouvelle RegEx pour partir de 0 sur cette ligne
      var csvReg = new RegExp( csvRegTemplate );
      while( mtch = csvReg.exec( line ) )
        {
        //CAS particulier de la"
        if( mtch[3] )
              {
              //logInfo("FOUND ^; at " + obj.length );
              obj.push( "" );
              }
        //CAS particulier de la suite de colonne vide ";;;;;..."
        else if( mtch[4] )
          for(var n = 1; n < mtch[4].length; n++ )
            obj.push( "" );
        else
          obj.push( mtch[1] || mtch[2] );
        }
      if( obj.length > 0 )
        {
        var o = 0;
         //SI la dernière case commence par " et ne finit pas par ", on a un saut de ligne. On doit lire la suite   
         while( obj[ obj.length-1 ].match("^\"") && !obj[ obj.length-1 ].match("\"$") && line != null)
          {
          o++;
          //On ajoute un saut de ligne
          obj[ obj.length-1 ] += "\n";
          //On passe a la ligne suivante du fichier
          line = file.readln();
        //Nouvelle RegEx pour partir de 0 sur cette ligne
          var csvRegBRL = new RegExp(csvRegBRLTemplate);
          //On regarde applique la regexp CSV
          var mtch2 = csvRegBRL.exec( line );
          //Si à la premiere execution, on trouve au moins une "valeur" (ligne non vide), on ajoute la premiere valeur à l'objet courant
          if( mtch2 )
            {       
            var complement =  mtch2[1] || mtch2[2] || mtch2[3] ;
            obj[ obj.length-1 ] += complement;
            //On supprime du début de la ligne ce qu'on vient d'extraire et on reprend sur la regexp de base pour la suite
            line = line.substr( complement.length );
            }
          
          //Nouvelle RegEx de base pour repartir sur cette ligne (sans l'éventuel bout de ligne précedente si trouvée)      
          var csvReg = new RegExp( csvRegTemplate );
          //Si il y a d'auter match, cela signifie qu'on est passé sur une colonne suivante. On passe donc à l'objet suivant  
          while( mtch2 = csvReg.exec( line ) )
            {
            //CAS particulier de la"
            if( mtch2[3] )
              {
              //logInfo("FOUND ^; at " + obj.length );
              obj.push( "" );
              }
            //CAS particulier de la suite de colonne vide ";;;;;..."
            else if( mtch2[4] )
              for(var n = 1; n < mtch2[4].length; n++ )
                {
                //logInfo(obj[0] + " -- FOUND ;{2,} at " + obj.length );
                obj.push( "" );
                }
            else
              obj.push( mtch2[1] || mtch2[2] );
            }
          //Si il n'y a pas eu d'autre colonne, alors on continue à lire les lignes suivante pour l'objet courant. Si il y en a eu d'autre, mais également multiligne, la même procédure s'applique sur les lignes suivante
          //Tant qu'on aura un objet courant commençant par le délimiteur de chaîne " et ne finissant pas par ce même délimiteur ", on lira les lignes suivantes
          }
        }      
      objStr += JSON.stringify( obj ) + "\n";
      //Recuperation du nom de la variable en début de ligne (1ère colonne) pour utilisation en mode "Objet"
      currVariable = obj[ 0 ];
      var currObj = {};
      //logInfo("obj = " +  JSON.stringify( obj ) );
      for(var i = 0; i < obj.length; i++)
         {
         //Recuperation de la langue de la colonne
         var attribute = attributeNames[ i ];
         //attribution de la valeur en remplaçant les " CSV => "" par des &quot; et en supprimant les doubles quote encadrant les valeurs multilignes => ^"([\s\S]*)"$
         if( attribute )
          currObj[ attribute ] = obj[i].replace( /^"([\s\S]*)"$/g,"$1").replace(/""/g,'&quot;');
         //logInfo(obj[0] + "." + i + " = " +  obj[i] )
         }
      if( this.rootObjectType == "Array" )
        datas.push(currObj);
      else
        datas[ currVariable ] = currObj;
      }
    setOption('LAST_CSVTOOL_DATAS', JSON.stringify( datas ) );
    setOption('LAST_CSVTOOL_OBJ', objStr );
    //logInfo("CSV.parseFileByLine finished");
    return datas;
}

CSVTool.prototype.parseFileByCol = function( fileName ){
  var datas = {};
  if( fileName != "")
    {
    //var translateDatas = {}, attributeNames = [];    
    var file = new File( fileName );
    var indexes = new Array();
    file.open("r");
    var headerLine = file.readln();
    var nbTotalCol = 1; //Sert a la gestion des CSV délimités : Excel encadre des colonnes par " en cas de multiligne
    //SCAN de l'en-tete des colonnes
    if( headerLine )
      {
      //Decoupage des colonnes
      headerLine = headerLine.split(";");
        //Pour chaque colonne (sauf la 1ère), une langue
        for(var i = 1; i < headerLine.length; i++)
          {
          indexes[ i ] = headerLine[ i ];
          if( headerLine[ i ] != "" )
            datas[ headerLine[ i ] ] = {};
          }
      nbTotalCol = headerLine.length;
      }
    
    //var csvReg = new RegExp(/(\"[^\";]+;[^\"]+)|\"([^\"]+)\";|([^;]+)|(;{2,})/g);
    var csvRegTemplate = new RegExp(/"((?:[^"]*"{2}[^"]*|[^"])+)"|([^;]+)|(^;)|(;{2,})/g);
    /* => REG : 4 groupes. 
    1e groupe Tout ce qui est entre " --- " y compris les double double quote (""texte"" servant à mettre du texte entre quote en CSV... faut suivre)
    2e groupe Tout ce qui n'est pas un ";" (donc séparé par ;)
    3e groupe Toutes les lignes qui commencent par ";"
    4e groupe Tous les enchainnement de 2 ";" ou plus
    */ 
           
    //var csvRegBRL = new RegExp(/([^\";]+;[^\"]+\")|"((?:[^"]*"{2}[^"]*|[^"])+)"|([^;]+)|(^;)|(;{2,})/g);
    var csvRegBRLTemplate = new RegExp(/([^\"]+\");|"((?:[^"]*"{2}[^"]*|[^"])+)"|([^;]+)|(^;)|(;{2,})/g);
    
    /*
    => Reg pour le cas particulier du passage à la ligne : identique à la premiere csvReg, mais avec un groupe en 1er qui détecte la fin de la phrase précédente ([^\"]+\");
    */    
    
    var objStr = "";  
    //Pour chaque ligne lue on creer l'objet correspondant
    while( line = file.readln() )
      {
      var obj = [];
      //Decoupage des colonnes
      //line = line.split(";");
      var mtch;
      //Nouvelle RegEx pour partir de 0 sur cette ligne
      var csvReg = new RegExp( csvRegTemplate );
      while( mtch = csvReg.exec( line ) )
        {
        //CAS particulier de la"
        if( mtch[3] )
              {
              //logInfo("FOUND ^; at " + obj.length );
              obj.push( "" );
              }
        //CAS particulier de la suite de colonne vide ";;;;;..."
        else if( mtch[4] )
          for(var n = 1; n < mtch[4].length; n++ )
            obj.push( "" );
        else
          obj.push( mtch[1] || mtch[2] );
        }
      if( obj.length > 0 )
        {
        var o = 0;
         //SI la dernière case commence par " et ne finit pas par ", on a un saut de ligne. On doit lire la suite   
         while( obj[ obj.length-1 ].match("^\"") && !obj[ obj.length-1 ].match("\"$") && line != null)
          {
          o++;
          //On ajoute un saut de ligne
          obj[ obj.length-1 ] += "\n";
          //On passe a la ligne suivante du fichier
          line = file.readln();
        //Nouvelle RegEx pour partir de 0 sur cette ligne
          var csvRegBRL = new RegExp(csvRegBRLTemplate);
          //On regarde applique la regexp CSV
          var mtch2 = csvRegBRL.exec( line );
          //Si à la premiere execution, on trouve au moins une "valeur" (ligne non vide), on ajoute la premiere valeur à l'objet courant
          if( mtch2 )
            {       
            var complement =  mtch2[1] || mtch2[2] || mtch2[3] ;
            obj[ obj.length-1 ] += complement;
            //On supprime du début de la ligne ce qu'on vient d'extraire et on reprend sur la regexp de base pour la suite
            line = line.substr( complement.length );
            }
          
          //Nouvelle RegEx de base pour repartir sur cette ligne (sans l'éventuel bout de ligne précedente si trouvée)      
          var csvReg = new RegExp( csvRegTemplate );
          //Si il y a d'auter match, cela signifie qu'on est passé sur une colonne suivante. On passe donc à l'objet suivant  
          while( mtch2 = csvReg.exec( line ) )
            {
            //CAS particulier de la"
            if( mtch2[3] )
              {
              //logInfo("FOUND ^; at " + obj.length );
              obj.push( "" );
              }
            //CAS particulier de la suite de colonne vide ";;;;;..."
            else if( mtch2[4] )
              for(var n = 1; n < mtch2[4].length; n++ )
                {
                //logInfo(obj[0] + " -- FOUND ;{2,} at " + obj.length );
                obj.push( "" );
                }
            else
              obj.push( mtch2[1] || mtch2[2] );
            }
          //Si il n'y a pas eu d'autre colonne, alors on continue à lire les lignes suivante pour l'objet courant. Si il y en a eu d'autre, mais également multiligne, la même procédure s'applique sur les lignes suivante
          //Tant qu'on aura un objet courant commençant par le délimiteur de chaîne " et ne finissant pas par ce même délimiteur ", on lira les lignes suivantes
          }
        } 
      
      objStr += JSON.stringify( obj ) + "\n";
      
      //logInfo("obj = " +  JSON.stringify( obj ) );
      //line = line.split(";");
      //Recuperation du nom de la variable en début de ligne (1ère colonne)
      currVariable = obj[ 0 ];
      currNbCol = 0;
      for(var i = 1; i < obj.length; i++)
         {
         //Recuperation de la langue de la colonne
         var index = indexes[ i ];
         //Si langue ok et existante dans translateDatas, on récupère la valeur de la case pour la variable courante 
         //en remplaçant les " CSV => "" par des &quot; et en supprimant les doubles quote encadrant les valeurs multilignes => ^"([\s\S]*)"$
         if( index && datas[ index ])
          datas[ index ][currVariable] = obj[i].replace( /^"([\s\S]*)"$/g,"$1").replace(/""/g,'&quot;');            
         }
      
      }    
    //logInfo("File parsed : " + JSON.stringify( this.translateDatas ) );
    setOption('LAST_CSVTOOL_DATAS', JSON.stringify( datas ) );
    setOption('LAST_CSVTOOL_OBJ', objStr );
    
    }
    //logInfo("CSV.parseFileByCol finished");

  return datas;
}


/*
Explication du parsing des lignes CSV : Un fichier CSV (généralement fourni par Excel) n'est pas une simple suite de lignes contenant des valeur délimitées par ";"
Il peut s'y trouver : 
 - des valeurs contenant elles-même le délimiteur ";",
 - des valeurs multilignes. Dans ce cas, le CSV passe à la ligne dans le fichier, alors que ce n'est pas un passage à la ligne de données suivante.
 
Pour pallier à ces execptions, Excel et les autres appliquent une règle : ils encadrent les valeurs particulières par un délimiteur de chaîne. La plupart du temps, ce délimiteur est "

Ainsi :

-------------------------------------------------------
|   A1   |   B1   |   C1   |   D1   |   E1   |   F1   |
-------------------------------------------------------
| Bonj;a |   B2   |        |        |   Hello|   F2   |
-------------------------------------------------------
| Multi  |   B3   |        |        |   Hello|   F3   |
| Ligne  |        |        |        |   Hello|        |
-------------------------------------------------------   
|   A4   |   B4   |   C4   |   D4   |   E4   |   F4   |

Aura comme forme de texte :
A1;B1;C1;D1;E1;F1
"Bonj;a";B2;;;Hello;F2
"Multi
Ligne";B3;;"Hello
Hello";F3
A4;B4;C4;D4;E4;F4

Il faut donc être en mesure de detecter ces délimiteurs de chaîne, ainsi que les colonnes vides (double ;;)
C'est ce que propose le code dans la boucle des 2 fonctions 
(ces 2 codes ne peuvent être factorisé facilement car le traitement final de la boucle n'est pas le même. Il faudrait créer une fonction prenant en paramètre le File et la ligne lue, compliqué pour pas grand apport)
Bien évidement, ce code n'est pas le meilleur et ne traite pas TOUS les cas (exemple : si un contributeur du fichier "s'amuse" à faire un saut de ligne et commence sa ligne par un ; on plante le parseur. Mais personne n'aura cette idée saugrenue)

*/