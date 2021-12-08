const
  arg = require('arg'),
  path = require('path'),
  fs = require('fs'),
  ACC = require('ac-connector'),
  ACCLogManager = ACC.ACCLogManager,
  xtkQueryDef = ACC.xtkQueryDef,
  xtkSpecFile = ACC.xtkSpecFile,
  diffCheker = require('deep-diff').diff,
  PackageLoader = require('./PackageLoader').PackageLoader,
  JXON = require('jxon'),
  ccol = require('./utils/consoleColors');
  const fsPromises = fs.promises;

  var env1 = 'DEV';
  var env2 = 'PROD';
  var outpuFile = null;


var diffHTML = `<html><head><style>
  body {
    font-family: Tahoma, Geneva, sans-serif;
    background-color: #000;
    color: #E6DDDD;
    }
    table{
      border-collapse: collapse;
      margin-bottom:10px;   
      width: 100%;   
      color:#000;
    }
    table td {
      padding:10px;
    }
    .elementSection, .elementSection > tbody{
      width: 100%; 
      display: flex;
      flex-flow: wrap;
      justify-content: space-between;
    }
    .object{
      display: flex;
      width: 500px;
      flex-wrap: wrap;
      flex: 500px;
      border:1px solid #DDD;
      border-radius:5px;
      margin:1em;
      color:#000;
      background-color:#FFFE;
    }
    .object > td{
      width:100%
    }
    .elementTitle {
      width: 100%;
      color: #E6DDDD;
    }
    .elementTitle td{
      font-size:2em;
      font-weight:bold;
      background-color:#0C3C37;
      border-bottom: 2px solid #999;
      text-align: center;
      text-transform: capitalize;
      display:block;
    }
    .object .A,.object .D,.object .E,.object .N{
      display:none;
    }
    .object.hover{
      /*flex:100%;*/
    }
    .object:hover .SD,.object.hover .A,.object.hover .D,.object.hover .E,.object.hover .N{
      display:table-row;
    }
    .objectTitle{
      cursor: pointer;
      text-align: center;
      font-variant: small-caps;     
    }
    tr.A{
     background-color:#78FA;
     background-image:linear-gradient(135deg, #78FA, #78AA);
    }
    tr.D{
     background-color:#FA4453AA;
     background-image:linear-gradient(135deg, #FA4453AA, #CA4453AA);
    }
    tr.SD{
     background-color:#000;
     color:#FA4453AA;
    }
    tr.E{
     background-color:#FFDC4FAA;
     background-image:linear-gradient(135deg, #FFDC4FAA, #FC6C4AAA);
     color:#000E;
    }
    tr.N{
     background-color:#07AA4FAA;
     background-image:linear-gradient(135deg, #07AA4FAA, #07664FAA);
    }
    </style>
    <script
        src="https://code.jquery.com/jquery-3.4.1.min.js"
        integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo="
        crossorigin="anonymous"></script>
    <script>
    function filter(){
      var filterText = $('#filter').val();
      if(filterText)
        $('.object').each((index, line)=>{
          $(line).hide();
          if($(line).html().match(filterText))
            $(line).show();
        });
      else
        $('.object').show();
    }
    function filterElement(){
      var choosenElement = $('#elementSelector').val();
      if(choosenElement != "ALL")
        $('.elementSection').each((index, section)=>{
          $(section).hide();
          if($(section).attr("id") == choosenElement + "_section")
            $(section).show();
        });
      else
        $('.elementSection').show();
    }
    function filterDiffType(){
      var choosenType = $('#diffTypeSelector').val();
      /*
      if(choosenType != "ALL")
        $('.D, .A, .N, .E, .SD').each((index, line)=>{
          $(line).hide();
          if($(line).hasClass(choosenType))
            $(line).show();
        });
      else
        $('.D, .A, .N, .E, .SD').show();
      */
      if(choosenType != "ALL")
        $('.object').each((index, line)=>{
          $(line).hide();
          if($('.' + choosenType, line).length > 0)
            $(line).show();
        });
      else
        $('.object').show();

    }


    $(document).ready(()=>{
      $('#filter').on('change keyup',filter);
      $('.elementTitle').each((index, title) =>{
        $('#elementSelector').append("<option value='" + $(title).text() + "'>" + $(title).text() + "</option>");
      });
      $('#elementSelector').on('change',filterElement);
      $('#diffTypeSelector').on('change',filterDiffType);
      $('.object').on("click", (event)=>{
        if($(event.target).hasClass('objectTitle'))
          $(event.currentTarget).toggleClass('hover')
      });
      $('#displayAllDiff').on('click',(event)=>{  $('.object').addClass('hover') });
      $('#hideAllDiff').on('click',(event)=>{ $('.object').removeClass('hover'); });
    });

    </script>
    </head>
    <body>
    <input type="text" id="filter" placeholder="Filtre"/><br/>
    <label>Type d'element</label>
    <select id="elementSelector"><option value="ALL">Tous</option></select></br>
    <input type="button" value="Afficher tous les détails" id="displayAllDiff"/></br>
    <input type="button" value="Masquer tous les détails" id="hideAllDiff"/></br>

    <label for="diffTypeSelector">Type de différence</label>
    <select id="diffTypeSelector" name="diffTypeSelector">
      <option value="ALL">Tous</option>
      <option value="D">Suppression</option>
      <option value="N">Ajout</option>
      <option value="E">Edition</option>
      <option value="A">Ajout dans une lise</option>
      <option value="SD">Absence d'element</option>
    </select>
    `;

var diffTxt = "";
var diffTxtObj = {

};

/*Package to load Spec*/
var spec = `
<specFile doNotPersist="true" xtkschema="xtk:specFile">
  <definition automaticDefinition="false" lineCountMax="5000" schema="xtk:srcSchema">
    <where>
      <condition expr="@namespace NOT IN ('xtk','nms','nl','cre','adi','dev')"/>
    </where>
  </definition>
  <definition automaticDefinition="false" lineCountMax="5000" schema="xtk:form">
    <where>
      <condition expr="@namespace NOT IN ('xtk','nms','nl','cre','adi','dev')"/>
    </where>
  </definition>
</specFile>
`

let options = parseArgumentsIntoOptions(process.argv);
var specFileReader = null;
if(options.env && options.env[0])
  env1 = options.env[0];
if(options.env && options.env[1])
  env2 = options.env[1];
if(options.spec)
  spec = options.spec;
else if(options.input) 
  specFileReader = fsPromises.readFile( options.input );
if(options.output)
  outpuFile = options.output;
/**Init des ACCLogin*/
console.log(`
    ${ccol.BgBlack+ccol.FG12 }  _____           _                                                 _     _____                                       ${ccol.Reset}
    ${ccol.BgBlack+ccol.FG34 } |  ___|         (_)                                               | |   \/  __ \\                                      ${ccol.Reset}
    ${ccol.BgBlack+ccol.FG196} | |__ _ ____   ___ _ __ ___  _ __  _ __   ___ _ __ ___   ___ _ __ | |_  | \/  \\\/ ___  _ __ ___  _ __   __ _ _ __ ___  ${ccol.Reset}
    ${ccol.BgBlack+ccol.FG202} |  __| '_ \\ \\ \/ \/ | '__\/ _ \\| '_ \\| '_ \\ \/ _ \\ '_ \` _ \\ \/ _ \\ '_ \\| __| | |    \/ _ \\| '_ \` _ \\| '_ \\ \/ _\` | '__\/ _ \\ ${ccol.Reset}
    ${ccol.BgBlack+ccol.FG226} | |__| | | \\ V \/| | | | (_) | | | | | | |  __\/ | | | | |  __\/ | | | |_  | \\__\/\\ (_) | | | | | | |_) | (_| | | |  __\/ ${ccol.Reset}
    ${ccol.BgBlack+ccol.FG10 } \\____\/_| |_|\\_\/ |_|_|  \\___\/|_| |_|_| |_|\\___|_| |_| |_|\\___|_| |_|\\__|  \\____\/\\___\/|_| |_| |_| .__\/ \\__,_|_|  \\___| ${ccol.Reset}
    ${ccol.BgBlack+ccol.FG10 }                                                                                               | |                    ${ccol.Reset}
    ${ccol.BgBlack+ccol.FG10 }                                                                                               |_|                    ${ccol.Reset}
    Compare ${env1} and ${env2}
  `);


var env1Login = ACCLogManager.getLogin( env1 ), env2Login = ACCLogManager.getLogin( env2 );
if( specFileReader )
  specFileReader.then(( result ) => {
    spec = result.toString();
    getPackages();
  });
else
  getPackages();

var differences = {};
function getPackages(){

  var loadEnv1Promise = PackageLoader.loadPackage(env1Login, spec), loadEnv2Promise = PackageLoader.loadPackage(env2Login, spec);
  loadEnv1Promise.then((result)=>{
    result[1].env = env1;
    fs.writeFile(`${env1}.json`, JSON.stringify(result, null, 2), ()=>{console.log(`${env1} file wrote`)});
  });
  loadEnv2Promise.then((result)=>{
    result[1].env = env2;
    fs.writeFile(`${env2}.json`, JSON.stringify(result, null, 2), ()=>{console.log(`${env2} file wrote`)});
  });


/*loadEnv1Promise = fsPromises.readFile(`${env1}.json`);
loadEnv2Promise = fsPromises.readFile(`${env2}.json`);*/

  Promise.all([loadEnv1Promise,loadEnv2Promise]).then(
      (arg) => {
        //console.log( arg );
        //fs.writeFile("output.json", JSON.stringify( arg, null, 2), ()=>{console.log("File wrote")});

          if( arg[0] instanceof Buffer)
            arg[0] = JSON.parse(arg[0].toString());
          if( arg[1] instanceof Buffer)
            arg[1] = JSON.parse(arg[1].toString());
          var packages1 = arg[0][1].package.entities;
          var packages2 = arg[1][1].package.entities;

          diffHTML += `<h1>Comparaison de l'environnement ${arg[0][1].env} par rapport à ${arg[1][1].env}</h1>
              `;
          if( !(packages1 instanceof Array))
          {
            console.log('Not Array, we transform it');
            packages1 = [packages1];
            packages2 = [packages2];
          }
            for(var k=0; k < packages1.length; k++)
            {
              var currSchema = packages1[k].$schema;
              var schemaName = currSchema.split(':')[1];
              var spec1 =  packages1[k][schemaName];
              var spec2 =  packages2[k][schemaName];
              //arg[1]
              console.log( `Compare ${currSchema}` );
              excludeSchemaAttributes( spec1, currSchema);
              var entities1 = transformArraySchemaToObj( currSchema , spec1);
              excludeSchemaAttributes( spec2, currSchema);
              var entities2 = transformArraySchemaToObj( currSchema , spec2);
              differences[schemaName] = {};
              diffTxtObj[schemaName] = {
                added : [],
                remove : [],
                edited : []
              };
              diffHTML += `<table class="elementSection" id="${schemaName}_section"><tr class="elementTitle"><td colspan="5">${schemaName}</td></tr>`;
              if( schemaName == "srcSchema" )
                generateSchemaReport(schemaName, entities1, entities2);
              else
                generateReport(schemaName, entities1, entities2);
              diffHTML += `</table>`;
              
            }
          diffHTML += `
                      </body>
                    </html>
                  `;
          var output = outpuFile || `output_${env1}_${env2}`;
          console.log(`Wrting ${output}.json|html files`);
          fs.writeFile(`${output}.json`, JSON.stringify( differences, null, 2), ()=>{console.log("File wrote")});
          //fs.writeFile(`${output}_element.json`, JSON.stringify( diffTxtObj, null, 2), ()=>{console.log("Elements File wrote")});
          fs.writeFile(`${output}.html`, diffHTML, ()=>{console.log("HTML wrote")});

          for(var element in diffTxtObj)
          {
            diffTxt+=`=========\n${element} : \n`;
            diffTxt+=`- Ajout:\n${diffTxtObj[element].added.join(',\n')} : \n`;
            diffTxt+=`- Supression:\n${diffTxtObj[element].remove.join(',\n')} : \n`;
            diffTxt+=`- Edition:\n${diffTxtObj[element].edited.join(',\n')} : \n`;
            diffTxt+="\n\n";
          }
          fs.writeFile(`${output}.txt`, diffTxt, ()=>{console.log("Elements File wrote")});
      }
    ).catch(
    (error) => {
      console.error("Error", error );
    }
    );

}

function generateReport(schemaName, entities1, entities2){
  var diffObj = diffTxtObj[schemaName];
   for(var key in entities1)
      {
        //differences[schemaName][key] = diffCheker(entities1[key], entities2[key]);
        var diffs = diffCheker(entities1[key], entities2[key]);
        if( !diffs || typeof diffs == "undefined")
          continue;
        differences[schemaName][key] = diffs;
        var elementName = ( entities1[key].$namespace ? entities1[key].$namespace + ":" + entities1[key].$name : key);
          diffHTML += `<tr class="object"><td colspan="5"><table><tr><td class="objectTitle">${schemaName} : ${( entities1[key].$namespace ? entities1[key].$namespace + ":" + entities1[key].$name : key)}</td></tr>`;
            diffs.forEach( (diff) =>{
              /*
                  N - indicates a newly added property/element
                  D - indicates a property/element was deleted
                  E - indicates a property/element was edited
                  A - indicates a change occurred within an array
              */
              /*if( ["E","A","N"] .indexOf(diff.kind) != -1  )
                return true;*/
              //Si suppression et pas de chemin, il n'existe pas. je retire de la comparaison
              if( diff.kind == 'D' && typeof diff.path == "undefined")
                {
                  diffHTML += `<tr class="SD"><td colspan="4">Ce ${schemaName} n'existe pas en ${env2}</td></tr>`;
                  diffObj.remove.push(elementName);
                  return true;
                }

              var objectType = "";
              if( diff.path && diff.path.length > 1 && ["attribute", "element", "enumeration", "value"].indexOf(diff.path[ diff.path.length - 2 ]) != -1 )
              {
                objectType =  objectTypeLabel[ diff.path[ diff.path.length - 2 ] ];
                //console.log('TYPE IS ' + objectType)
              }

                  var _lhs = diff.lhs ? diff.lhs : diff.item && diff.item.lhs ? diff.item.lhs : '';
                  var _rhs = diff.rhs ? diff.rhs : diff.item && diff.item.rhs ? diff.item.rhs : '';
                  var xmlStr, xmlStr2;
                  if( (_lhs.constructor != String) && (xmlStr = getXMLVersion(  diff.item && diff.item.path ? diff.item.path : diff.path, _lhs, objectType  )) )
                    _lhs = xmlStr;
                  if( (_rhs.constructor != String) && (xmlStr2 = getXMLVersion(  diff.item && diff.item.path ? diff.item.path : diff.path, _rhs, objectType  )) )
                    _rhs = xmlStr2;

              diffHTML += `<tr class=${diff.kind}><td title="${_lhs.replace(/"/g,'&quot;')} &#10;&#10;TO &#10;&#10; ${_rhs.replace(/"/g,'&quot;')}">`;
              if(diff.kind == "E")
                {
                  diffHTML += `Edition de ${getModificationText(diff.path, "", key)} en ${env2}`;
                  diffObj.edited.push(elementName);
                }
              if(diff.kind == "D")
                {
                  diffHTML += `Suppression de ${getModificationText(diff.path, diff.lhs, key)} en ${env2}`;
                  diffObj.edited.push(elementName);
                }
              if(diff.kind == "N")
                {
                  diffHTML += `Ajout de ${getModificationText(diff.path, diff.rhs, key)} en ${env2}`;
                  diffObj.added.push(elementName);
                }
              if(diff.kind == "A")
                {
                  diffHTML += `Modification de ${diff.path.join('/').replace(/\$/,'@')}[${diff.index}]  en ${env2} :  `;
                  if( diff.item.kind == 'N')
                    {
                      diffHTML += `Ajout de ${getModificationText(diff.item.path, diff.item.rhs, key)}`;
                    }
                  if( diff.item.kind == 'D')
                    {                       
                      diffHTML += `Suppression de ${getModificationText(diff.item.path, diff.item.lhs, key)}`;
                    } 
                  }
                  diffHTML += ``
                diffHTML += `</td></tr>`;
            });
          diffHTML += `</td></tr></table>`;
      }
}

var objectTypeLabel = {
  "attribute" : "l'attribut",
  "element" : "l'élément",
  "enumeration" : "l'énumération", 
  "value" : "la valeur"
};

function generateSchemaReport(schemaName, entities1, entities2){
  var diffObj = diffTxtObj[schemaName];
  console.log("generateSchemaReport ...");
   for(var key in entities1)
      {
        //differences[schemaName][key] = diffCheker(entities1[key], entities2[key]);
        var diffs = diffCheker(entities1[key], entities2[key]);
        if( !diffs )
          continue;
        differences[schemaName][key] = diffs;
        var elementName = `${entities1[key].$namespace}:${entities1[key].$name}`;
        //console.log(entities1[key]);
          diffHTML += `<tr class="object"><td colspan="5"><table><tr><td class="objectTitle">Schema : ${entities1[key].$namespace}:${entities1[key].$name}</td></tr>`;
        diffs.forEach( (diff) =>{
          /*
              N - indicates a newly added property/element
              D - indicates a property/element was deleted
              E - indicates a property/element was edited
              A - indicates a change occurred within an array
          */
          /*if( ["E","A","N"] .indexOf(diff.kind) != -1  )
            return true;*/
          //Si suppression et pas de chemin, il n'existe pas. je retire de la comparaison
          if( diff.kind == 'D' && typeof diff.path == "undefined")
            {
              diffHTML += `<tr class="SD"><td colspan="4">Ce schema n'existe pas en ${env2}</td></tr>`;
              diffObj.remove.push(elementName);
              return true;
            }

            var objectType = "";
            if( diff.path && diff.path.length > 1 && ["attribute", "element", "enumeration", "value"].indexOf(diff.path[ diff.path.length - 2 ]) != -1 )
            {
              objectType =  objectTypeLabel[ diff.path[ diff.path.length - 2 ] ];
              //console.log('TYPE IS ' + objectType)
            }

            var _lhs = diff.lhs ? diff.lhs : diff.item && diff.item.lhs ? diff.item.lhs : '';
            var _rhs = diff.rhs ? diff.rhs : diff.item && diff.item.rhs ? diff.item.rhs : '';
            var xmlStr, xmlStr2;
            if( (_lhs.constructor != String) && (xmlStr = getXMLVersion(  diff.item && diff.item.path ? diff.item.path : diff.path, _lhs, objectType  )) )
              _lhs = xmlStr;
            if( (_rhs.constructor != String) && (xmlStr2 = getXMLVersion(  diff.item && diff.item.path ? diff.item.path : diff.path, _rhs, objectType  )) )
              _rhs = xmlStr2;

          diffHTML += `<tr class=${diff.kind} title="${_lhs.replace(/"/g,'&quot;')} &#10;&#10;TO &#10;&#10; ${_rhs.replace(/"/g,'&quot;')}"><td>`;
          if(diff.kind == "E")
            {
              diffHTML += `Edition de ${objectType}  ${getModificationText(diff.path, "", key)} en ${env2}`;
              diffObj.edited.push(elementName);
            }
          if(diff.kind == "D")
            {
              diffHTML += `Suppression de ${objectType} ${getModificationText(diff.path, diff.lhs, key)} en ${env2}`;
              diffObj.edited.push(elementName);
            }
          if(diff.kind == "N")
            {
              diffHTML += `Ajout de ${objectType} ${getModificationText(diff.path, diff.rhs, key)} en ${env2}`;
              diffObj.added.push(elementName);
            }
          if(diff.kind == "A")
            {
              diffHTML += `Modification de ${objectType} ${diff.path.join('/').replace(/\$/,'@')}[${diff.index}]  en ${env2}:  `;
              if( diff.item.kind == 'N')
                {
                  diffHTML += `Ajout de ${getModificationText(diff.item.path, diff.item.rhs, key)}`;
                }
              if( diff.item.kind == 'D')
                {                       
                  diffHTML += `Suppression de ${getModificationText(diff.item.path, diff.item.lhs, key)}`;
                }                      
              }
              //diffHTML += `<td>${ diff.lhs ? diff.lhs : diff.item && diff.item.lhs ? diff.item.lhs : '' }</td><td>${diff.rhs ? diff.rhs : diff.item && diff.item.rhs ? diff.item.rhs : '' }</td>`
            diffHTML += `</td></tr>`;
        });
          diffHTML += `</td></tr></table>`;
      }
}

function getModificationText( modPath, modification, key ){
  var obj ={};
  var toDisplay;
  if( modPath )
    {
      if( modPath.length > 1 && ["attribute", "element", "enumeration", "value"].indexOf(modPath[ modPath.length - 2 ]) != -1 )
        {
          obj[ modPath[ modPath.length - 2 ] ] = modification;
          modPath.splice(  modPath.length - 2 , 2 );
        }
      else
        obj[ modPath[ modPath.length - 1 ] ] = modification;
    }
  else
    obj[ key ] = modification;
  try{
    toDisplay = JXON.jsToString(obj).replace(/</g,'&lt;').replace(/>/g,'&gt;');
    //diffHTML += `Suppression de ${ xml }`;
  }
  catch( e ){
    //console.log(e)
    //console.log( obj );
    toDisplay = JSON.stringify( modification );
  }
  if( modPath )
    toDisplay = `${modPath.join('/').replace(/\$/,"@")} ${toDisplay != '""' ? "=" + toDisplay : ''}`;
  return toDisplay;
}

function getXMLVersion( path, content, key ){
 var obj ={};
 var toDisplay = null;
 if( path )
    {
      if( path.length > 1 && ["attribute", "element", "enumeration", "value"].indexOf(path[ path.length - 2 ]) != -1 )
        {
          obj[ path[ path.length - 2 ] ] = content;
        }
      else
        obj[ path[ path.length - 1 ] ] = content;
    }
  else
    obj[ key ] = modification;
  try{
    toDisplay = JXON.jsToString(obj).replace(/</g,'&lt;').replace(/>/g,'&gt;');
    //diffHTML += `Suppression de ${ xml }`;
  }
  catch( e ){
    //console.log(e)
    //console.log( obj );
    //toDisplay = JSON.stringify( modification );
  }
  return toDisplay;
}


function transformArraySchemaToObj( schema, array ){
    //console.log("schema ? ", schema, array)
    if( !(array instanceof Array))
    {    
      var obj = {};
      var key = getElementKey( array, schema );
      obj[key] = array;
      processSpecialSchema( schema, obj[key] );
      return obj;
    }
    //console.log("I transorfm");
    var obj = {};
    for(var i = 0; i< array.length; i++)
    {
      var element = array[i];
      var key = getElementKey( element, schema );
      //console.log("key ? ", key)
      obj[key] = element;
      processSpecialSchema( schema, obj[key] );
    } 
    return obj;
  }

function processSpecialSchema( schema, obj ){  
   if(['xtk:srcSchema','element'].indexOf(schema) != -1 )
    {
      if( obj.methods && obj.methods.method)
        obj.methods.method = transformArraySchemaToObj("method", obj.methods.method);
      if( obj.enumeration )
        obj.enumeration = transformArraySchemaToObj("enumeration", obj.enumeration);
      if( obj.element )
        obj.element = transformArraySchemaToObj("element", obj.element);
      if( obj.attribute )
        obj.attribute = transformArraySchemaToObj("attribute", obj.attribute);
    }
    
  if( ['xtk:workflow','nms:webApp'].indexOf(schema) != -1 )
    {
      if( obj.activities )
        for(var act in obj.activities )
        {
          obj.activities[act] = transformArraySchemaToObj(act, obj.activities[act]);
        }
    }
  if( ['enumeration','xtk:enum'].indexOf(schema) != -1 )
    {
      if( obj.value)
        obj.value = transformArraySchemaToObj("value", obj.value);      
    }
}

var schemaKeys = {
  'xtk:srcSchema' : ['namespace','name'],
  'xtk:javascript' : ['namespace','name'],
  'xtk:jst' : ['namespace','name'],
  'xtk:workflow' : 'internalName',
  'method' : 'name',
  'enumeration' : 'name',
  'folder' : 'name',
  'node' : 'expr',
  'condition' : 'expr'
}
var excludedSchemaAttributes = {
  'condition' : ['internalId'],
  'activities' : ['x','y']
}
function getElementKey( element, schema){
    var schemaKey = schemaKeys[schema] || null ;
    if(typeof schemaKey == "string" && element && typeof element["$"+schemaKey] != "undefined")
      return element["$"+schemaKey];
    else if(schemaKey instanceof Array)
    {
      //console.log('try to return ', schemaKey)
      var key = "";
      schemaKey.forEach((currKey)=>{key += element["$"+currKey]})
      return key;
    }
    else if( element.$internalName )
      return element.$internalName;
    else if( element.$namespace && element.$name )
      return element.$namespace + element.$name;
    else if( element.$name )
      return element.$name;
    return "";
  }


function excludeSchemaAttributes( element, schema ){  
  if(element instanceof Array )
    for(var i=0;i<element.length;i++ )
      excludeSchemaAttributes( element[i], schema );
  else if(typeof element == 'object' ){
    var schemaExclusion = excludedSchemaAttributes[schema] || null ;
    if( schemaExclusion && schemaExclusion instanceof Array )
    {
      //console.log("got schemaExclusion", schemaExclusion, element);
      schemaExclusion.forEach( (attribute) => {
        delete element["$"+attribute];
      });
    }
    for(var k in element){
      if(typeof element[k] == 'object' )
        excludeSchemaAttributes( element[k], k );
      else if(typeof element[k] == 'array' )
        for(var i=0;i<element[k].length;i++ )
          excludeSchemaAttributes( element[k][i], k );
    }
  }
  //Cas spécial des tableaux d'activité de workflow (nombreux noms différents, mais attributs commun (x,y etc.))
  if( schema == 'xtk:workflow' && element.activities )
    for(var act in element.activities )
    {
    for(var i=0;i<element.activities[act].length;i++ )
     excludeSchemaAttributes( element.activities[act][i], 'activities');
    }
}



function parseArgumentsIntoOptions(rawArgs) {
 const args = arg(
   {
     '--spec': String,
     '--output': String,
     '--input' : String,
     '-s': '--spec',     
     '-o' : '--output',
     '-i' : '--input'
     //TOOD : add enableLogs and byPassBackup options
   },
   {
     argv: rawArgs.slice(2),
   }
 );
 return {
   spec: args['--spec'] || false,
   output: args['--output'] || false,
   input: args['--input'] || false,
   env: args['_'] || null
 };
}