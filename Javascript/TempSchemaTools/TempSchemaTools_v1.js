function TempSchemaTools(){
  if( typeof vars.targetSchema == "undefined" )
    {
    logWarning("TempSchemaTools : Aucun schéma temporaire n'est définit")
    throw "No Temporary Schema";
    }
  this.targetSchema = vars.targetSchema;
  this.targetSchemaName = vars.targetSchema.split(':')[1];
  this.targetSchemaNS = vars.targetSchema.split(':')[0];
  this.tableName = vars.tableName;
}
/**
* @method génère un schéma temporaire basé sur le schéma en entré asoscié à la bonne table temporaire
* @return XML un schéma temporaire dont la racine est tempSchemas, pouvant être utilisé dans une queryDef pour spécifier une table temporaire
*/
TempSchemaTools.prototype.generateTempSchema = function(){
  var targetSchema = application.getSchema( this.targetSchema );
  var tempSchemas = <tempSchemas>
        <schema mappingType="sql" name={this.targetSchemaName} namespace={this.targetSchemaNS}>
          <element name={this.targetSchemaName} sqltable={this.tableName}/>
        </schema>    
      </tempSchemas> ;
  for( var key in targetSchema.root.children )
    {
    var currNode = targetSchema.root.children[key]; 
    if( currNode.isAttribute )
      tempSchemas.schema.element.appendChild(<attribute label={currNode.label} name={key.replace("@","")} sqlname={currNode.SQLName} type={currNode.type}/>);
    
    
    else if( key == "target" )
      {    
        var currElement = <element externalJoin="false" label={currNode.label} name="target" revLink="targetData" target={currNode.target.schema.id} type="link" unbound="false"/>;
        for each( var join in currNode.joinParts )
          {
            currElement.appendChild( <join xpath-dst={join.destination.name} xpath-src={join.source.name}/> );
          }
        tempSchemas.schema.element.appendChild( currElement );
      }
     else
      {
        var currElement = <element label={currNode.label} name={key} type={currNode.type}/>;          
        if( currNode.target )
            currElement.@target = currNode.target.schema.id;
        if( currNode.isCalculated )
            currElement.@expr = currNode.calculateExpr;
         if( currNode.type == 'link' )
          {
           for each( var join in currNode.joinParts )
            {
            //logInfo( "je suis du join..." );
              currElement.appendChild( <join xpath-dst={join.destination ? join.destination.name : '0' } xpath-src={join.source ? join.source.name : '0'}/> );
            }
           }
        tempSchemas.schema.element.appendChild( currElement );
      }
    }
  for each(var key in targetSchema.root.keys)
    {
      var currKey = <key name={key.name}/>;
      for each( var field in key.fields )
        currKey.appendChild(  <keyfield xpath={field.name}/> );
     tempSchemas.schema.element.appendChild(currKey)
    }
     //logInfo("Key: " + key.name + "\t is-internal: " + key.isInternal)  
    
    
  //logInfo( 'tempSchemas = ' +  tempSchemas.toXMLString() );
  return tempSchemas;
};

/**
* @method Traite les données du schéma temporaire en entrée
* @argument options Object options de paramétrage du traitement
*/
TempSchemaTools.prototype.processDatas = function( options ){
  options = options || {}; //Init de l'option si non renseigné
  var tempSchemas = this.generateTempSchema();  
  var qCountXML = <queryDef schema={this.targetSchema} operation="count">
    <select>
    </select>
    {tempSchemas}
  </queryDef>;
  var qdCount = xtk.queryDef.create(qCountXML);
  
  qdCount.SelectAll(true);
  var resCount = qdCount.ExecuteQuery();
  
  var nbTotal = resCount.@count; //On recupère le nombre total de ligne de la requete
  var lineStep = 1000; //Nombre de ligne a traiter en meme temps  
  
  //logInfo( "TempSchemaTools : " + nbTotal + " lignes à traiter.");

  var elementName = this.targetSchemaName;

  //Creation des vagues
  for(i=0; i<=nbTotal; i+=lineStep)
  {
    try{  
      var context = {
        targetSchema : this.targetSchema,
        targetSchemaName : this.targetSchemaName,
        targetSchemaNS : this.targetSchemaNS      
      };
      /**/
      //test de la ligne 0
      /*
      var qdXmlTest = <queryDef schema={vars.targetSchema} operation="select" startLine="0" lineCount="1">
          <select>
          </select>    
          {tempSchemas}
        </queryDef>;
         var qdTest = xtk.queryDef.create( qdXmlTest );
        qdTest.SelectAll(true);
        var resultTest = qdTest.ExecuteQuery(); 
        logInfo('La ligne 0 est : ' + resultTest[elementName][0].toXMLString() );
        */
      /**/
      
      
      
      //Parcours des i=>i+lineStep lignes
      var qdXml = <queryDef schema={vars.targetSchema} operation="select" startLine={i} lineCount={lineStep}>
          <select>
          </select>    
          {tempSchemas}
        </queryDef>;
      
      if( typeof options.fieldsToSelect == "xml" )
        qdXml.select.appendChild( options.fieldsToSelect.copy() );      
      
      /*Ajout d'un tri pour être sûr de garder la même liste à chaque itération. 
      Si nécessaire (cas de modification des clefs lors du traitement) possibilité de définir d'autres colonnes de tri (orderBy : Array : ["@id","@col2"] ou String "@id")*/
      var keyArray = TempSchemaTools.getSchemaKey( tempSchemas.schema );
      if( options.orderBy && typeof options.orderBy == "string" )
        keyArray = [ options.orderBy ];
      else if( options.orderBy && typeof options.orderBy == "array" )
        keyArray = options.orderBy;
      
      var orderBy = new XML("<orderBy/>");
      for( var iKey = 0; iKey < keyArray.length; iKey++)
        orderBy.appendChild(<node expr={keyArray[iKey]} sort="1"/>);
      /*Fin de l'orderBy*/
      
        
      qdXml.appendChild( orderBy );
        
      //logInfo("qdXml : " + qdXml.toXMLString() ); 
      var qd = xtk.queryDef.create( qdXml );
      
      if( options.selectAllFields ) 
        qd.SelectAll(true);
         
     // logInfo("SQL QUERY : " + qd.BuildQuery() ); 
      var result = qd.ExecuteQuery();    
      
      //A faire avant le traitement
      if( typeof options.beforeIteration == "function" )
        options.beforeIteration( result , context );
     
     //A faire pour chaque element
     if( typeof options.elementProcess == "function" )
      {
       for (var key in result[elementName]) 
        {
          //logInfo("let's process key " + key );
          element = result[elementName][key];
          options.elementProcess( element, key , context );
          //logInfo("OK process key " + key );
        }  
       }       
      //A faire avant le traitement
      if( typeof options.afterIteration == "function" )
        options.afterIteration( result, context  );
      
    }//Try qd = xtk.queryDef.create - Lignes i => i+lineStep
    catch( err )
    {    
        logWarning("Erreur pour les lignes n°" + i + " - " + (i + lineStep) );
        logWarning( err.message ? err.message : err );
        continue;
    }  
  }
}

TempSchemaTools.prototype.extendTempSchema = function( extension ) {
  var newTableTempName = "wkf"+(instance.id<0 ? (instance.id+4294967296) : instance.id).toString()+"_"+task.taskIdentifier;
  var newSchemaName = activity.name;
  var tempSchema = this.generateTempSchema();
  
  //Construction de la requete vers la table précédente
  var sQueryDef = xtk.queryDef.create(<queryDef schema={vars.targetSchema} operation="select">
          <select>
          </select>    
          {tempSchema}
        </queryDef>);
  sQueryDef.SelectAll(true);      
  sSelect = sQueryDef.BuildQuery()
  var sCols = buildColumnList( vars.targetSchema, sQueryDef.toXML().select)  
  
  var newSchema = tempSchema.schema;
  newSchema.@name = newSchemaName;
  newSchema.@namespace = "temp";
  newSchema.element[0].@name = newSchemaName;
  newSchema.element[0].@sqltable = newTableTempName;
  for each(var node in extension.children())
    newSchema.element[0].appendChild( node );
  setOption( "INFOLOG", newSchema.toXMLString() ); 
  registerSchema(newSchemaName, newSchema, false);
  // Create the schema from the queryDef
  buildSqlTable("temp:" + newSchemaName );
  var sSql = "INSERT INTO " + newTableTempName + " (" + sCols + ") " + sSelect
  if( instance.showSQL )
    logInfo("SQL: "+sSql)
  vars.recCount = sqlExec(sSql)
  vars.tableName = newTableTempName;
  vars.targetSchema = "temp:" + newSchemaName;  
  
  //Mise a jour du schema principal de l'objet courant
  this.targetSchema = vars.targetSchema;
  this.targetSchemaName = vars.targetSchema.split(':')[1];
  this.targetSchemaNS = vars.targetSchema.split(':')[0];
  this.tableName = vars.tableName;
  
  //Mise à jour de l'activité pour consultation et manipulation des données ensuite
  var extension = <extension/>;
  extension.appendChild( newSchema );  
  var newActivityXML = <activity />;  
  var wkf = xtk.workflow.load( instance.id );
  wkfXML = wkf.toXML();  
  for each(var currActivity in wkfXML.activities.children() )
  {
      if( activity.name == currActivity.@name.toString() )
      {
        
        newActivityXML = currActivity;
        if( newActivityXML.extension.length() == 0 )
          newActivityXML.extension = extension;
        else if( newActivityXML.extension.schema.length() == 0 )
          newActivityXML.extension[0].appendChild( newSchema )
        else
          newActivityXML.extension[0].schema[0] = newSchema;
        newActivityXML.@['_operation'] = "update";
        
        break;
      }
  } 
 var updateWkf = <workflow xtkschema="xtk:workflow" id={wkfXML.@id} _operation="update"><activities _operation="update">{newActivityXML}</activities></workflow>;
 
 xtk.session.Write( updateWkf );  
}


TempSchemaTools.getSchemaKey = function( schemaXML ){
  var keyArray = new Array();
  var keyFields = schemaXML.element[0].key[0].keyfield;
  for(var k in keyFields )
   keyArray.push( keyFields[k].@xpath.toString() );
   
  return keyArray;
}