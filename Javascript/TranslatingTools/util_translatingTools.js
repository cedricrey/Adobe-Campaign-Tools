/*
Propos de cet outil : permettre de générer le même code HTML en plusieurs langues à partir d'un template

*/
//loadLibrary("xtk:json2.js");
loadLibrary('utils:CSVTool.js');
    
var TranslatingTool = function( options ){
  this.translateFile = options.translateFile || "";
  this.templateFile = options.templateFile || "";
  this.translateDatas = {};
  this.attributeNames = [];
  this.langIndex = [];
  this.codeDelimiters = options.codeDelimiters || null;  
  this.subjectField = options.subjectField || null;  
  this.directTranslate = options.directTranslate || null;  
  this.parseTranslateFile();  
}
/*
******
*********************** FONCTIONNEMENT EN MODE COLONNE = VARIABLES, LIGNE = LANG *************************
******
OBSOLETE : ON UTILISE MAINTENANT LA BIBLIOTHEQUE CSVTool qui prend en charge le traitement des CSV
TranslatingTool.prototype.parseTranslateFile = function(){
  if( this.translateFile != "")
    {
    //var translateDatas = {}, attributeNames = [];
    
    var tf = new File( this.translateFile );
    tf.open("r");
    var headerLine = tf.readln();
    
    //SCAN de l'en-tete des colonnes
    if( headerLine )
      {
      headerLine = headerLine.split(";");
        for(var i in headerLine)
          {
          this.attributeNames[ i ] = headerLine[ i ];
          }
      }
    while( line = tf.readln() )
      {
      var obj = {};
      line = line.split(";");
         for(var i in line)
         {
          obj[ this.attributeNames[ i ] ] = line[i];
         }
      if( obj.lang )
        {
          this.translateDatas[ obj.lang ] = obj;
        }
      }    
    logInfo("translateFile parsed : " + JSON.stringify( this.translateDatas ) );
    }
    logInfo("TranslatingTool.parseTranslateFile finished");
}
******
*********************** FONCTIONNEMENT EN MODE COLONNE = VARIABLES, LIGNE = LANG *************************
******
*/

/*
Fichier translateFile CSV au format :
        ;   FR   ;   DE     ;   IT    
title   ;Bonjour ;Guten Tag ;Buongiorno 
url     ;http..  ;...       ;...
...
...
..
.

CRE le 12/05/2017 : Ajout de l'affichage conditionné :
Si le fichier de traduction contient des variables commençant par "IF_", nous ne considérons pas cette variable comme un remplacement à faire,
mais ce qui vient derrière le "IF_" comme étant une balise d'affichage. Si la colonne traduite contient la valeur "1", le contenu HTML entre les balise {{VAR}} et {{/VAR}} sera laissé.
Sinon, il sera retiré.
Exemple :
CSV :
        ;   FR   ;   DE     ;   IT    
IF_cta  ;    1   ;          ;   1 

et template HTML :
{{cta}}
<a href=""/>GO</a>
{{/cta}}

La traduction en 'FR' et 'IT' conservera le code <a href=""/>GO</a>.
Celle de 'DE' supprimera ce code
*/

TranslatingTool.prototype.parseTranslateFile = function(){
  if( this.translateFile != "")
    {  
    var csvTool = new CSVTool( { readingMode : 'byCol'});
    this.translateDatas =  csvTool.parseFile( this.translateFile );
    //logInfo("translateFile parsed : " + JSON.stringify( this.translateDatas ) );
    setOption('LAST_TRANSLATINGTOOLS_DATAS', JSON.stringify( this.translateDatas ) );
    //setOption('LAST_TRANSLATINGTOOLS_OBJ', objStr );    
    }
    logInfo("TranslatingTool.parseTranslateFile finished");
}

//utilisé pour déspécialiser les caractère spéciaux RegEx
TranslatingTool.matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

TranslatingTool.prototype.generateHTML = function ( lang, parameters ){
  var options = parameters || {};
  var subjectField = parameters.subjectField || this.subjectField;
  var datas = this.translateDatas[ lang ];
  if( this.directTranslate )
    var dtDatas = this.translateDatas[ this.directTranslate ];

  var html = "";
  if( datas && this.templateFile != "" ){
      //Lecture du template
     var templateFile = new File( this.templateFile );
     templateFile.open("r");
     while( (line = templateFile.readln()) != null )
       {
       html += line + '\n';
       //logInfo("J'ai une ligne : " + line );
       }
     
     //logInfo("HTML BRUT : " + html );  
     //remplacement des variables dans le template
     for( var k in datas ){
         //CAS des bloc à remplacer
        if( k.indexOf("IF_") == 0 )
          {
            var ifVariable = k.substr(3);
            var replacement = datas[ k ] == "1" ? "$1" : "";
            var regIF = new RegExp( "{{" + ifVariable + "}}(([^{]*)((?!{{\/" + ifVariable + "}}){[^{]*)*){{\/"+ ifVariable +"}}" , "g" );
            html = html.replace( regIF , replacement );
          }
        else if( this.directTranslate )
          {
            var content = datas[ k ];
            content = this.replaceContentCode( content );
            content = TranslatingTool.encodeHTMLEntities( content );
            //logInfo('k is ' + k + " => " + dtDatas[ k ] );
            var reg = new RegExp( dtDatas[ k ].replace(TranslatingTool.matchOperatorsRe, '\\$&') , "g" );
            html = html.replace( reg , content );          
          }
        else
          {
            var content = datas[ k ];
            content = this.replaceContentCode( content );
            content = TranslatingTool.encodeHTMLEntities( content );
            var reg = new RegExp( "{{" + k + "}}" , "g" );
            html = html.replace( reg , content );
          }
     }  
  }
  if( options.deliveryId )
    {
    var delivery = nms.delivery.get( options.deliveryId );
    delivery.content.html.source = html;    
    if( subjectField && datas[ subjectField ] )
      {
      delivery.mailParameters.subject = datas[ subjectField ];
      }
    if( options.subject )
      {
      delivery.mailParameters.subject = options.subject;
      }
    }
  return html;
}

TranslatingTool.prototype.replaceContentCode = function ( content ){
     if( this.codeDelimiters )
      for(var i in this.codeDelimiters)
        {
        var fi = i.charAt(0);
        var reg = new RegExp( i + "(([^" + fi + "]*)((?!" + i + ")" + fi + "[^" + fi + "]*)*)" + i , "g" );
        content = content.replace( reg , this.codeDelimiters[ i ] );
        }
     return content;
}

TranslatingTool.encodeHTMLEntities = function( content ){
  return content.replace(/[\u00A0-\u9999]/g, function(i) {
   return '&#'+i.charCodeAt(0)+';';
  });
}
