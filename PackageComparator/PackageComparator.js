"use strict";
var jsdiff = require('diff');
var diffCheker = require('deep-diff').diff;
var fs = require('fs');
var JXON = require('jxon');


function srcTextToHtml( txt ){
  return txt.replace(/\t/gm,'&emsp;&emsp;')
            .replace(/>/gm,'&gt;')
            .replace(/</gm,'&lt;')
            .replace(/\n/gm,'<br/>')
}
String.prototype.srcTextToHtml = function(){
  return srcTextToHtml( this );
}

class PackageComparator{
  constructor(){
  }

  static compare(specs){
    var tables = {};
    /*
    var specs = [];
    for(var e in env )
    {
      var spec = require("./xtk_core_"+env[e]+".xml.json").package.entities;
      spec.name = env[e];
      specs.push( spec );
    }
    */
    //Basé sur une transfo du raw de SOAP en JXON
    if(specs[0] instanceof Array)
    {
        for(var k=0; k < specs[0].length; k++)
        { 
          try{
          var currentELements = specs[0][k].$schema.split(':')[1];  
          }
          catch(e)
          {
            console.log( k + " ==== " , specs[0] );
            console.log( e );
            throw e;
          }   
          var entities = [];
            specs.forEach(( currSpec ) => {
              if( currSpec[k] && currSpec[k][currentELements] )
              {
                var spec = currSpec[k][currentELements];
                spec.name = currSpec.name;
                entities.push(spec)
                if( currSpec.name == "prod" && currentELements == "workflow")
                  console.log( spec );
              }
            })
          tables[specs[0][k].$schema] = tables[specs[0][k].$schema] ? tables[specs[0][k].$schema] + PackageComparator.compareEntity( specs[0][k].$schema, entities ) : PackageComparator.compareEntity( specs[0][k].$schema, entities );
        }
    }
    else{
          var currentELements = specs[0].$schema.split(':')[1];  
          console.log('compareEntity', specs[0].$schema);
        
          var entities = [];
            specs.forEach(( currSpec ) => {
              if( currSpec[currentELements] )
                  {
                  var spec = currSpec[currentELements];
                      spec.name = currSpec.name;
                      entities.push(spec)
                  }
            })
          tables[specs[0].$schema] = tables[specs[0].$schema] ? tables[specs[0].$schema] + "<br/><br/>" + PackageComparator.compareEntity( specs[0].$schema, entities ) :  PackageComparator.compareEntity( specs[0].$schema, entities );    
    }
    return tables;
  }

  //Basé sur une transfo du raw de SOAP en JXON
  static getElementKey( element, schema){
    var schemaKey = PackageComparator.schemaKeys[schema] || null ;
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

  static excludeSchemaAttributes( element, schema ){
    
    if(element instanceof Array )
      for(var i=0;i<element.length;i++ )
        PackageComparator.excludeSchemaAttributes( element[i], schema );
    else if(typeof element == 'object' ){
      var schemaExclusion = PackageComparator.excludedSchemaAttributes[schema] || null ;
      if( schemaExclusion && schemaExclusion instanceof Array )
      {
        //console.log("got schemaExclusion", schemaExclusion, element);
        schemaExclusion.forEach( (attribute) => {
          delete element["$"+attribute];
        });
      }
      for(var k in element){
        if(typeof element[k] == 'object' )
          PackageComparator.excludeSchemaAttributes( element[k], k );
        else if(typeof element[k] == 'array' )
          for(var i=0;i<element[k].length;i++ )
            PackageComparator.excludeSchemaAttributes( element[k][i], k );
      }
    }
    //Cas spécial des tableaux d'activité de workflow (nombreux noms différents, mais attributs commun (x,y etc.))
    if( schema == 'xtk:workflow' && element.activities )
      for(var act in element.activities )
      {
      for(var i=0;i<element.activities[act].length;i++ )
       PackageComparator.excludeSchemaAttributes( element.activities[act][i], 'activities');
      }
  }

  static compareEntity( schema, specs )
  {
        PackageComparator.excludeSchemaAttributes( specs[0], schema);
    var entitiesOrigin = PackageComparator.transformArraySchemaToObj( schema , specs[0] );
        
    var differences = {};
    var names = [specs[0].name || "spec_0"];

    var originName = (specs[0].name || '').toString();
    delete specs[0].name;
    for(var i=1;i<specs.length; i++)
    {
      PackageComparator.excludeSchemaAttributes( specs[i], schema);
      var entitiesR = PackageComparator.transformArraySchemaToObj( schema , specs[i]);
  //        PackageComparator.excludeSchemaAttributes( entitiesR, '');
      var name = specs[i].name || ("spec_" + i) ;
      names.push( name );

      var currName = (specs[i].name || '').toString();
      delete specs[i].name;
      var currDifferences = diffCheker(entitiesOrigin, entitiesR);
      //entitiesR.name = currName;

      if(currDifferences)
      {
        /*currDifferences.sort(function(a,b){
          return a.path.join("-") > b.path.join("-");
        })*/
        currDifferences.forEach(( diff ) =>{
          var index = diff.path.join("-");
          if( typeof differences[index] == "undefined" )
            differences[index] = {
                        lhs : diff.lhs,
                        path : diff.path,
                        kind : diff.kind
             };
          differences[index]["kind_" + name ] = diff.kind || "" ;
          differences[index]["hs_" + name ] = diff.rhs || "" ;        
        });
      }
      else
        console.log("No difference between " + originName + " and " + currName);
    }

    //fs.writeFileSync('output_differences.json', JSON.stringify(differences,null,2) );
    //console.log( differences )
    if( !PackageComparator.isEmpty(differences) ){
      differences.names = names;
      var table = PackageComparator.getHTMLDifferences( differences );
      /*
      var css = fs.readFileSync( require.resolve('./ressources/ui/compare.css'));
      var js = fs.readFileSync( require.resolve('./ressources/ui/compare.js'));
      var html = `<html><head><meta charset="UTF-8"><style></style></head>
                  <body><form id="toolsForm"></form>${table}
                  <script type="text/javascript">var environments = ['${names.join("','")}']</script>
                  <script type="text/javascript">${js}</script>
                  </body>
                  </html>`
      fs.writeFileSync("compare_"+ schema.replace(/:/gm,'_') +".html", html );
      */
      return table;
      }
      else
        return `<div>No difference for ${schema}</div>`

  }

  static transformArraySchemaToObj( schema, array ){
    if( !(array instanceof Array))
    {    
      var obj = {};
      var key = PackageComparator.getElementKey( array, schema );
      obj[key] = array;
      PackageComparator.processSpecialSchema( schema, obj[key] );
      return obj;
    }
    //console.log("I transorfm");
    var obj = {};
    for(var i = 0; i< array.length; i++)
    {
      var element = array[i];
      var key = PackageComparator.getElementKey( element, schema );
      obj[key] = element;
      PackageComparator.processSpecialSchema( schema, obj[key] );
    } 
    return obj;
  }

  static processSpecialSchema( schema, obj ){  
     if(['xtk:srcSchema','element'].indexOf(schema) != -1 )
      {
        if( obj.methods && obj.methods.method)
          obj.methods.method = PackageComparator.transformArraySchemaToObj("method", obj.methods.method);
        if( obj.enumeration )
          obj.enumeration = PackageComparator.transformArraySchemaToObj("enumeration", obj.enumeration);
        if( obj.element )
          obj.element = PackageComparator.transformArraySchemaToObj("element", obj.element);
        if( obj.attribute )
          obj.attribute = PackageComparator.transformArraySchemaToObj("attribute", obj.attribute);
      }
      
    if( ['xtk:workflow','nms:webApp'].indexOf(schema) != -1 )
      {
        /*
        if( obj.activities && obj.activities.query)
          obj.activities.query = PackageComparator.transformArraySchemaToObj("query", obj.activities.query);     
        if( obj.activities && obj.activities.js)
          obj.activities.js = PackageComparator.transformArraySchemaToObj("js", obj.activities.js);   
        */
        if( obj.activities )
          for(var act in obj.activities )
          {
            obj.activities[act] = PackageComparator.transformArraySchemaToObj(act, obj.activities[act]);
          }
      }
    if( ['enumeration','xtk:enum'].indexOf(schema) != -1 )
      {
        if( obj.value)
          obj.value = PackageComparator.transformArraySchemaToObj("value", obj.value);      
      }

      /*
    if( schema == 'query' )
      {
        if( obj.select && obj.select.node)
          obj.value = PackageComparator.transformArraySchemaToObj("node", obj.select.node);    
        if( obj.where && obj.where.condition)
          obj.value = PackageComparator.transformArraySchemaToObj("condition", obj.condition);     
      }*/
  }

  static isEmpty(obj) {
      for(var prop in obj) {
          if(obj.hasOwnProperty(prop))
              return false;
      }
      return JSON.stringify(obj) === JSON.stringify({});
  }

  static getHTMLDifferences( differences ){
    var table = '<table border="1" style="font-family:consolas"><tr><th>Chemin</th>'
    if( differences.names && differences.names instanceof Array )
      differences.names.forEach( (name) => { table += "<th>" + name + "</th>"});
    table += '</tr>';


  var spV = "<span style='color:green;background-color: #0F0;'>";
  var spR = "<span style='color:A00;background-color:#F88'>";
  var spG = "<span style='color:#444'>";
  var spEnd = "</span>";




    for(var i in differences)
    {
      if(i == "names")
        continue;
      

      var elementName = i.replace(/\.|,|-|;/gm,"_")
      var diff = differences[i];
      var path = diff.path.join('/');
      path = path.replace(/\/(\d+)\//gm,'[$1]/')
                 .replace(/attributes\/|\$/gm,'@');


      table += '<tr><td>'+path+'</td>';


      var color = diff.kind == "N" ? 'red' :
        diff.kind == "D" ?  'red' :
        diff.kind == "E" ?  'orange' : 'grey';


      var lhs = diff.kind == "N" ? "ABSENT" : diff.lhs;
      
      //var rhs = diff.kind == "D" ? "" : diff.rhs ;

      if( (typeof lhs == "string" && lhs.match(/\n/gm))
          || typeof lhs == "object"
          )
      {
        var lhs = (typeof lhs == "object") ? JSON.stringify(lhs) : lhs.toString()//.srcTextToHtml();
        var rhsTds = '', lhsOut = '', nbLine = 0;
        for(var j=1; j < differences.names.length; j++)
          {
            //var diffName = j.replace(/\.|,|-|;/gm,"_")
            var name = differences.names[j];
          
            var kind = diff["kind_" + name], hs = diff["hs_" + name];
            if( kind == "D" )
              {
                rhsTds += '<td>Absent</td>';
                continue;
              }
            else if( kind == undefined || hs == undefined)
              {
                rhsTds += '<td>Identique</td>';
                continue;
              }
            rhs = (typeof hs == "object") ? JSON.stringify(hs) : hs.toString()//.srcTextToHtml();

            //console.log("gonna diff", lhs, rhs)

            lhsOut += '<div class="compareText compareText_lhs" id="lhs_'+elementName+'_'+j+'">';
            var rhsOut = `<div class="compareText compareText_${name}" id="rhs_${elementName}_${j}">`;
            console.log(`Try to differenciate ${elementName+'_'+j} and ${elementName}_${j}`)
            var currDifference = jsdiff.diffLines(lhs, rhs);
            currDifference.forEach(function(part){
              if( part.added )
                {
                  rhsOut += spV + part.value.srcTextToHtml() + spEnd;
                  var lineCarriage = new Array((part.value.match(/\n/g) || []).length + 1 );
                  lhsOut += lineCarriage.join('<br/>');
                }
              else if( part.removed )
                {
                  lhsOut += spR + part.value.srcTextToHtml() + spEnd;
                  var lineCarriage = new Array((part.value.match(/\n/g) || []).length + 1 );
                  rhsOut += lineCarriage.join('<br/>');
                }
              else
              {
                rhsOut += spG + part.value.srcTextToHtml() + spEnd;
                lhsOut += spG + part.value.srcTextToHtml() + spEnd;              
              }

            });
            //In order to align current column text with the left side
            //var lineCarriage = new Array(nbLine);          
            rhsOut += '</div>';
            //rhs = '<span>' + rhs + '</span>';    
            rhsTds += '<td>' + rhsOut + '</td>';  
            //rhsTds += '<td>' + rhsOut + '</td>';
            lhsOut += '</div>';
            //Nb line in right side more 2 last cariage
            nbLine += (rhsOut.match(/<br\/>/g) || []).length + 2;
          }

          table += '<td>' + lhsOut + '</td>' + rhsTds;
      }
      else
      {  
          lhs = typeof lhs == "object" ? /*JSON.stringify(lhs, null, '\t').replace(/\n/gm,'<br/>').replace(/\t/gm,'&emsp;&emsp;')*/ "Object" : 
                typeof lhs == "undefined" ? "Null" : lhs.toString().replace(/\n/gm,'<br/>').replace(/\t/gm,'&emsp;&emsp;');
          /*rhs = typeof rhs == "object" ? JSON.stringify(rhs): 
                typeof rhs == "undefined" ? "" : rhs.toString();*/
          lhs = '<span style="color:'+color+'">'+lhs+'</span>';
          /*rhs = '<span style="color:'+color+'">'+rhs+'</span>';*/
      
          table += '<td>' + lhs + '</td>';
          
          /*table += '<td>' + rhs + '</td>';*/
          for(var j=1; j < differences.names.length; j++)
          {
            var name = differences.names[j];
      
            var kind = diff["kind_" + name], hs = diff["hs_" + name];
            var color = kind == "N" ? 'green' :
                        kind == "D" ?  'red' :
                        kind == "E" ?  'orange' : 'grey';
            var rhs = kind == "D" ? "Absent" : kind == undefined ? "Identique" : hs ;
            rhs = typeof rhs == "object" ? /*JSON.stringify(rhs, null, '\t').replace(/\n/gm,'<br/>').replace(/\t/gm,'&emsp;&emsp;')*/ "Object" : 
                typeof rhs == "undefined" ? "" : rhs.toString().replace(/\n/gm,'<br/>').replace(/\t/gm,'&emsp;&emsp;');
            rhs = '<span style="color:'+color+'">' + rhs + '</span>';
      
            table += '<td>' + rhs + '</td>';
          }
      }
      table += '</tr>';


    }
    table += '</table>';
    return table;
  }

}

PackageComparator.schemaKeys = {
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
PackageComparator.excludedSchemaAttributes = {
  'condition' : ['internalId'],
  'activities' : ['x','y']
}
exports.PackageComparator = PackageComparator;