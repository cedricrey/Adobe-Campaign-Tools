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
  
  //Vérification de source externe
  var targetSchema = application.getSchema( this.targetSchema );
  //logInfo(' SCHEMA ? ' + targetSchema.toDocument().toXMLString() );
  if( targetSchema.toDocument().root.getElements('element')[0].getAttribute('dataSource').toString() != "" )
    this.dataSource = targetSchema.toDocument().root.getElements('element')[0].getAttribute('dataSource').toString();
  
  
  //Vérification des clefs pour demande de génération
  this.needNewPrimaryKey = false;
  var tempSchemas = this.generateTempSchema();  
  var keyArray = TempSchemaTools.getSchemaKey( tempSchemas.schema );
  if( keyArray.length == 0 )
    this.needNewPrimaryKey = true;
}
/**
* @method génère un schéma temporaire basé sur le schéma en entré asoscié à la bonne table temporaire
* @return XML un schéma temporaire dont la racine est tempSchemas, pouvant être utilisé dans une queryDef pour spécifier une table temporaire
*/
TempSchemaTools.prototype.generateTempSchema = function(){
  var targetSchema = application.getSchema( this.targetSchema );
  //logInfo( " --------- targetSchema.toDocument().root.getElements('element')[0].getAttribute('dataSource') ??? " + targetSchema.toDocument().root.getElements('element')[0].getAttribute('dataSource') );
  var tempSchemas = <tempSchemas>
        <schema mappingType="sql" name={this.targetSchemaName} namespace={this.targetSchemaNS} label={"Données traitées par '" + activity.label + "'"}>
          <element name={this.targetSchemaName} sqltable={this.tableName} label={"Données traitées par '" + activity.label + "'"} unbound="false"/>
        </schema>    
      </tempSchemas> ;
  if( this.dataSource )
    tempSchemas.schema.element.@dataSource = this.dataSource;
  //logInfo(' tempSchemas.schema.element : ' + tempSchemas.schema.element.toXMLString() );
  TempSchemaTools.copyChildren(targetSchema.root, tempSchemas.schema.element)

  for each(var key in targetSchema.root.keys)
    {
      var currKey = <key name={key.name} internal={key.isInternal}/>;
      for each( var field in key.fields )
        currKey.appendChild(  <keyfield xpath={field.name}/> );
     tempSchemas.schema.element.appendChild(currKey)
    }
     //logInfo("Key: " + key.name + "\t is-internal: " + key.isInternal)  
     
     
  //logInfo( 'tempSchemas = ' +  tempSchemas.toXMLString() );
  return tempSchemas;
};
 
TempSchemaTools.copyChildren = function(origin, target){
for( var key in origin.children )
    {
    var currNode = origin.children[key]; 
    if( currNode.isAttribute )
      {
      var attrib = <attribute label={currNode.label} name={key.replace("@","")} notNull={currNode.isNotNull} sqlname={currNode.SQLName} type={currNode.type}/>;
      if( currNode.size )
        attrib.@length = currNode.size;
      target.appendChild(attrib);
      }
     
     
    else if( key == "target" )
      {    
        var currElement = <element externalJoin="false" label={currNode.label} name="target" revLink="targetData" target={currNode.target.schema.id} type="link" unbound="false"/>;
        for each( var join in currNode.joinParts )
          {
            currElement.appendChild( <join xpath-dst={join.destination.name} xpath-src={join.source.name}/> );
          }
        target.appendChild( currElement );
      }
     else
      {
        var currElement = <element label={currNode.label} name={key} type={currNode.type} sqlname={currNode.SQLName}/>;          
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
        TempSchemaTools.copyChildren(currNode, currElement);
        target.appendChild( currElement );
      }
    }
}

/**
* @method Traite les données du schéma temporaire en entrée
* @argument options Object options de paramétrage du traitement
*/
/*
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
       
      //Parcours des i=>i+lineStep lignes
      var qdXml = <queryDef schema={vars.targetSchema} operation="select" startLine={i} lineCount={lineStep}>
          <select>
          </select>    
          {tempSchemas}
        </queryDef>;
       
      if( typeof options.fieldsToSelect == "xml" )
        qdXml.select.appendChild( options.fieldsToSelect.copy() );      
       
      //Ajout d'un tri pour être sûr de garder la même liste à chaque itération. 
      //Si nécessaire (cas de modification des clefs lors du traitement) possibilité de définir d'autres colonnes de tri (orderBy : Array : ["@id","@col2"] ou String "@id")
      var keyArray = TempSchemaTools.getSchemaKey( tempSchemas.schema );
      if( options.orderBy && typeof options.orderBy == "string" )
        keyArray = [ options.orderBy ];
      else if( options.orderBy && typeof options.orderBy == "array" )
        keyArray = options.orderBy;
       
      var orderBy = new XML("<orderBy/>");
      for( var iKey = 0; iKey < keyArray.length; iKey++)
        orderBy.appendChild(<node expr={keyArray[iKey]} sort="1"/>);
      //Fin de l'orderBy
       
         
      qdXml.appendChild( orderBy );
         
      //logInfo("qdXml : " + qdXml.toXMLString() ); 
      var qd = xtk.queryDef.create( qdXml );
       
      if( options.selectAllFields ) 
        qd.SelectAll(true);
 
          
      options.logSQL ? logInfo("SQL QUERY : " + qd.BuildQuery() ) : ""; 
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
*/ 
TempSchemaTools.prototype.processDatas = function( options ){
  options = options || {}; //Init de l'option si non renseigné
  //Init de la génération des clefs primaire si nécessaire (via appel à extension du shéma)
  if( this.needNewPrimaryKey )
    this.extendTempSchema(/*Sans rien, on force juste l'ajout primarykey*/);
  
  var tempSchemas = this.generateTempSchema();  
  
  //Si reprise, on force l'enregistrement du schema
  if( task.vars.TSTProcessInitiated )
    registerSchema(tempSchemas.schema.element[0].@name, tempSchemas.schema, false);
  
  var qCountXML = <queryDef schema={this.targetSchema} operation="count">
    <select>
    </select>
    {tempSchemas}
  </queryDef>;
  var qdCount = xtk.queryDef.create(qCountXML);
   
  qdCount.SelectAll(true);
  var resCount = qdCount.ExecuteQuery();
   
  var nbTotal = resCount.@count; //On recupère le nombre total de ligne de la requete
  
  var lineStep = options.lineStep || 1000; //Nombre de ligne a traiter en meme temps  
   
  //logInfo( "TempSchemaTools : " + nbTotal + " lignes à traiter.");
 
  var elementName = this.targetSchemaName;
 
  try{  
    var context = {
      targetSchema : this.targetSchema,
      targetSchemaName : this.targetSchemaName,
      targetSchemaNS : this.targetSchemaNS      
    };
     
    //Parcours des i=>i+lineStep lignes
    var qdXml = <queryDef schema={vars.targetSchema} operation="select" startLine="0" lineCount={lineStep}>
        <select>
        </select>    
        {tempSchemas}
        <where/>
      </queryDef>;
    var qdKeyXML = qdXml.copy();
    
    if( typeof options.fieldsToSelect == "xml" )
        qdXml.select.appendChild( options.fieldsToSelect.children().copy() );
   
    if( typeof options.customTempKeys == "xml" )
      {
      qdXml.tempSchemas.schema.element.key = options.customTempKeys;
      tempSchemas.schema.element.key = options.customTempKeys;
      registerSchema(tempSchemas.schema.element[0].@name, tempSchemas.schema, false);
      }
       
    //Ajout d'un tri pour être sûr de garder la même liste à chaque itération. 
    //Si nécessaire (cas de modification des clefs lors du traitement) possibilité de définir d'autres colonnes de tri (orderBy : Array : ["@id","@col2"] ou String "@id")
    var keyArray = TempSchemaTools.getSchemaKey( tempSchemas.schema );
    if( options.orderBy && typeof options.orderBy == "string" )
      keyArray = [ options.orderBy ];
    else if( options.orderBy && options.orderBy.constructor == Array )
      keyArray = options.orderBy;    
    
    //LogSQL d'exemple 
    if(options.logSQL || instance.showSQL ){
        var qdExemple = xtk.queryDef.create( qdXml );
        if( options.selectAllFields ) 
            qdExemple.SelectAll(true);
        logInfo("SQL: " + qdExemple.BuildQuery() );
    }
    
    //ajout de la clef dans la requete si demande d'enregistrement des elements
    if( !options.selectAllFields && options.saveElements ) 
    {
      for(var i in keyArray)
      {
        qdXml.select.appendChild(<node expr={keyArray[i]}/>);
      }
    }
    
    
    //Mise en conformité des clefs pour agragation
    var fields = TempSchemaTools.getAllSchemaFields( tempSchemas.schema )
    for(var i in keyArray)
    {
      var key = keyArray[i];
      //Si il y a un "-" dans la clef, on force l'ajout des [] autour du nom (si il n'y en a pas déjà)
      if(key.indexOf("-") != -1)
      {
        key = key.replace(/(^[^[]*$)/gm,"[$1]");
        keyArray[i] = key;
      }
      for each(field in fields){
        if(field.expr == key && ( field.type == "datetime" || field.type == "datetimenotz"))
          {
            keyArray[i] = "ToString(" + key + ")";
            logInfo('Key : ' + keyArray[i] );
          }
        }
    }

    var orderBy = new XML("<orderBy/>");
    for( var iKey = 0; iKey < keyArray.length; iKey++)
      orderBy.appendChild(<node expr={keyArray[iKey]} sort="1"/>);
    qdXml.appendChild( orderBy );
    //Fin de l'orderBy    

    //Calcul de l'expression de la clef
    var keyExpr = keyArray.join('+');

    //logInfo('KeyExpr : ' + keyExpr);

    if( keyExpr == "" )
      throw "Erreur : aucune clef ou champs de tri";
    //Ajout de cette clef dans le select avec un alias
    qdXml.select.appendChild(<node expr={keyExpr} alias="@internKey" sort="1"/>);
    
    //Recuperation du type de clef
    qdKeyXML.select.appendChild(<node expr={keyExpr} alias="@internKey"/>);
    var qdKey = xtk.queryDef.create( qdKeyXML );
    //logInfo('Try to get Key');
    var resultKey = qdKey.BuildQueryEx();
    //logInfo('Got Key ' + resultKey[1]);
    var format = resultKey[1];
    var keyFormatRegexp = new RegExp('@internKey:([^,]*)','g');    
    var m = keyFormatRegexp.exec( format );
    var keyType = m[1];
    
    
    //Fonction avant le traitement des toutes les vagues
    if( typeof options.beforeProcess == "function" )
      options.beforeProcess( context );     
    
    var currentLastKey = "";
    //En cas de coupure du workflow, une reprise consécutive va tout faire recommencer
    //var lastKeyVarName = "tstCurrentLastKey_" + ( task.id <0 ? (task.id+4294967296) : task.id );
    //logInfo(' TEMP SCHEMA TOOLS VAR : ' + lastKeyVarName );
    //On tente de reprendre là où on en était...
    /*
    if( instance.vars[ lastKeyVarName ] )
      currentLastKey = instance.vars[ lastKeyVarName ];
    */
    if( task.vars && task.vars.TSTlastKey )
      {
      currentLastKey = task.vars.TSTlastKey;
      logInfo('[TempSchemaTools] : Reprise du traitement à la ligne ' + currentLastKey );
      }
    //On force le premier passage
    var resultLength = lineStep;
    //On place un flag permettant de savoir que le traitement a déjà été initié (cas de coupure : détectection)
      task.vars.TSTProcessInitiated = true;
    //Creation des vagues
    //for(i=0; i<=nbTotal; i+=lineStep)
    //Tentative d'optimisation : utilisation de variable globale
    var result, currentqdXml, qd, children;
    //Si il y a moins de lignes que le nombre demandées, c'est la fin
    while(resultLength >= lineStep)
    {      
        try{        
          currentqdXml = qdXml.copy();
          //currentqdXml.@startLine = i;
          //Performance : on ne va plus passer par i > nombre de ligne, mais direcement filtrer par @key > dernier clef de tri connue
          //Ainsi, neo ne va requeter 'que' sur lineStep lignes, et non plus sur i+lineStep lignes...
          //Par clef
          if( currentLastKey != "" )
              currentqdXml.where.appendChild( <condition expr={ keyExpr + " > " + currentLastKey }/>);
          
          //var qd = xtk.queryDef.create( currentqdXml );
          qd = NLWS.xtkQueryDef.create( currentqdXml );
           
          if( options.selectAllFields ) 
            qd.SelectAll(true);
            
              
          //options.logSQL ? logInfo("SQL QUERY : " + qd.BuildQuery() ) : ""; 
          //logInfo('Try to execute ' + currentqdXml.select );
            //logInfo('$$$$$$$$$$$$$$$$ GONNA SELECT');
          result = qd.ExecuteQuery();    
          resultLength = result.getElements( elementName ).length;
          //logInfo('result is : ' + result.toXMLString() );
          //setOption("CREY_LOGINFO","HIIIII HO : " + result.toXMLString() );
          
            //logInfo('£££££££££££ GOT RESULT');
            
          context.query = qd; 
          //A faire avant le traitement de cette vague
          if( typeof options.beforeIteration == "function" )
            options.beforeIteration( result , context );
          
            //logInfo('%%%%%%%%%% GONNA ITERATE');
         //A faire pour chaque element
         if( typeof options.elementProcess == "function" )
          {
            children = result.getElements( elementName );
           //for(var key in result[elementName]) 
            for(var key = 0;key < children.length; key ++)
            {
              //logInfo("let's process key " + key );
              try{
              //element = result[elementName][key];
              var element = children[ key ];
              options.elementProcess( element, key , context );
              
              if( options.saveElements )
                {
                //result.@xtkschema = this.targetSchema;
                //result.@_key = "@internKey";
                result.$_operation = "update";
                result.$_key = "@internKey";
                }
              }
              catch( err ){
                logInfo( err.message ? err.message : err );
                logInfo('the elementName is : ' + elementName );
                logInfo('the key is : ' + key );
              }
              //logInfo("OK process key " + key );
            } 
            //Recuperation de la dernière clef
            
            try{
              //currentLastKey = result[elementName][key].@internKey.toString();
              if( children.length > 0 )
                currentLastKey = children[ children.length - 1 ].$internKey.toString();
              }
            catch( err ){
              logInfo( err.message ? err.message : err );
              logInfo('the elementName is : ' + elementName );
              logInfo('the key is : ' + key );
            }
            if( keyType != 'long' )
              currentLastKey = "'" + currentLastKey + "'";
            //logInfo( i + "last key : " + currentLastKey );
           }       
          //A faire après le traitement de cette vague
          if( typeof options.afterIteration == "function" )
            options.afterIteration( result, context  );
        
          if( options.saveElements )
            {
            //result.@xtkschema = this.targetSchema;
            //result.@_key = "@internKey";
            result.$xtkschema = this.targetSchema;
            //result.$_key = "@internKey";
            //logInfo('******************GONNA SAVE' + currentLastKey);
            NLWS.xtkSession.WriteCollection( result );
            //logInfo('$$$$$$$$$$$$$$$$$$SAVED' + currentLastKey);
            }
          
           //on met la clef dans les variables de la tâche, en cas de coupure ("reprise consécutive du wokf")
           task.vars.TSTlastKey = currentLastKey;
           //logInfo('task ? ' +  task.toXML() );
           //logInfo('task.vars ? ' + task.vars );
           /*
           <workflowTask abortReason="0" activity="js" assignee-id="0" assigneeFilter="" assigneeType="0"
              creationDate="2021-07-01 12:30:59.413Z" hostname="rfala" id="-2139389425"
              nextProcessingDate="" objectId="0" objectSchema="" operator-id="0"
              processingCount="1" processingDate="2021-07-01 12:31:46.140Z" status="1"
              taskIdentifier="142" title="" workflow-id="-2137278711" xtkschema="xtk:workflowTask">
              <variables TSTProcessInitiated="true" TSTProcessInitiated-type="boolean" TSTlastKey="99992"/>
              <eventVariables description="20 000" listId="-2137278920" localDistributionId="0"
                              recCount="20000" recCount-type="number" schema="nms:recipient"
                              tableName="wkf2157688585_141_1" targetSchema="temp:readGroup"/>
              <assignee _cs="" id="0" type="0"/>
              <operator _cs=" ()" id="0" type="0"/>
            </workflowTask>
            */
            TempSchemaTools.saveTask();
           //xtk.session.Write()
           //task.save();
        }//Try var currentqdXml = qdXml.copy(); (Try sur la vague)
        catch( err )
        {    
            logWarning("Erreur pour les lignes n°" + i + " - " + (i + lineStep) );            
            if(qd) logWarning("SQL: " + i + " - " + qd.BuildQuery() );
            logWarning( err.message ? err.message : err );
            continue;
        }   
     }
     //Fonction après le traitement des toutes les vagues
   if( typeof options.afterProcess == "function" )
    options.afterProcess( context );
  }// try{ var context = { //Try global du processus (englobant toutes les vagues)
  catch( err )
  {    
      logWarning( err.message ? err.message : err );
  }
} 

TempSchemaTools.saveTask = function(){
  var varsTask = {};
  for(var k in task.vars)
    varsTask[k] = task.vars[k];
  //varsTask.TSTlastKey = currentLastKey;
   NLWS.xtkSession.Write({
    workflowTask : {
      xtkschema : "xtk:workflowTask",
      id : task.id,
      variables : varsTask
    }
   });
}


TempSchemaTools.prototype.processDatasSQL = function( options ){
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
   
  //logInfo( "TempSchemaTools : " + nbTotal + " lignes à traiter.");
 
  var elementName = this.targetSchemaName;
 
  try{  
    var context = {
      targetSchema : this.targetSchema,
      targetSchemaName : this.targetSchemaName,
      targetSchemaNS : this.targetSchemaNS      
    };
         
    var qdXml = <queryDef schema={vars.targetSchema} operation="select" lineCount={nbTotal}>
        <select>
        </select>    
        {tempSchemas}
      </queryDef>;
      
    if( typeof options.fieldsToSelect == "xml" )
        qdXml.select.appendChild( options.fieldsToSelect.copy() );
       
    //Ajout d'un tri pour être sûr de garder la même liste à chaque itération. 
    //Si nécessaire (cas de modification des clefs lors du traitement) possibilité de définir d'autres colonnes de tri (orderBy : Array : ["@id","@col2"] ou String "@id")
    var keyArray = TempSchemaTools.getSchemaKey( tempSchemas.schema );
    if( options.orderBy && typeof options.orderBy == "string" )
      keyArray = [ options.orderBy ];
    else if( options.orderBy && typeof options.orderBy == "array" )
      keyArray = options.orderBy;
     
    var orderBy = new XML("<orderBy/>");
    for( var iKey = 0; iKey < keyArray.length; iKey++)
      orderBy.appendChild(<node expr={keyArray[iKey]} sort="1"/>);
    qdXml.appendChild( orderBy );
    //Fin de l'orderBy     
        
    //LogSQL d'exemple 
    if(options.logSQL || instance.showSQL ){
        var qdExemple = xtk.queryDef.create( qdXml );
        if( options.selectAllFields ) 
            qdExemple.SelectAll(true);
        logInfo("SQL: " + qdExemple.BuildQuery() );
    }
  
     //Fonction avant le traitement des toutes les vagues
    if( typeof options.beforeProcess == "function" )
      options.beforeProcess( context );          
    
    var qd = xtk.queryDef.create( qdXml );
           
    if( options.selectAllFields ) 
      qd.SelectAll(true); 
              
    //options.logSQL ? logInfo("SQL QUERY : " + qd.BuildQuery() ) : ""; 
    //var result = qd.ExecuteQuery();
    var sqlBuiltQuery = qd.BuildQueryEx();
    var sqlQuery = sqlBuiltQuery[0];
    var outputFormat = sqlBuiltQuery[1];
    
    var xmlResult = sqlSelect(outputFormat, sqlQuery);
          
    context.query = qd; 
          
     //A faire pour chaque element
     if( typeof options.elementProcess == "function" )
      {
       for (var key in xmlResult[elementName]) 
        {
          //logInfo("let's process key " + key );
          element = xmlResult[elementName][key];
          options.elementProcess( element, key , context );
          //logInfo("OK process key " + key );
        }  
       }   
     
     //Fonction après le traitement des toutes les vagues
   if( typeof options.afterProcess == "function" )
    options.afterProcess( context );
  }// try{ var context = { //Try global du processus (englobant toutes les vagues)
  catch( err )
  {    
      logWarning( err.message ? err.message : err );
  }
} 


TempSchemaTools.rowNumSQLList = {
  "oracle" : "ROWNUM",
  "mssql" : "row_number () over (order by getDate())"
};

TempSchemaTools.rowNumSQL = TempSchemaTools.rowNumSQLList[ application.getDBMSType() ] || "ROWNUM";

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
  
  //Ajout du numéro de ligne si primaryKey nécessaire      
  if( this.needNewPrimaryKey )
    {
    //sQueryDef.select.node.add(<node expr={"[SQLDATA[" + TempSchemaTools.rowNumSQL + "]]"}/>);
    sQueryDef.select.node.add(<node expr="RowId()"/>);
    }

  //logInfo( "sQueryDef is : " + sQueryDef.toXML() );
  sSelect = sQueryDef.BuildQuery()
  //logInfo( "sSelect is : " + sSelect );
  sSelect = sSelect.replace(/ top \d+ /gi," ");
  
  var sCols = buildColumnList( vars.targetSchema, sQueryDef.toXML().select)  
   
  var newSchema = tempSchema.schema;
  newSchema.@name = newSchemaName;
  newSchema.@namespace = "temp";
  newSchema.element[0].@name = newSchemaName;
  newSchema.element[0].@sqltable = newTableTempName;
  if( extension )
    for each(var node in extension.children())
      newSchema.element[0].appendChild( node );
  
  //Ajout du numéro de ligne si nécessaire
  if( this.needNewPrimaryKey )
    {
    newSchema.element[0].appendChild( <attribute name="lineNum" sqlname="iLineNum" label="Numero de ligne" type="long"/> );
    newSchema.element[0].appendChild( <key internal="true" name="id">
                                        <keyfield xpath="@lineNum"/>
                                      </key>);
    sCols += ", iLineNum";
    this.needNewPrimaryKey = false;
    }

  //setOption( "INFOLOG", newSchema.toXMLString() ); 
  registerSchema(newSchemaName, newSchema, false);
  
  //En cas de reprise de l'activité suite à coupure, on reprend sans écraser l'ancienne table
  if( !TempSchemaTools.isTempSchemaAlreadyExtended() )
    {
    // Create the schema from the queryDef
    buildSqlTable("temp:" + newSchemaName );
    var sSql = "INSERT INTO " + newTableTempName + " (" + sCols + ") " + sSelect
    if( instance.showSQL )
      logInfo("SQL: "+sSql)    
    if( this.dataSource )
      vars.recCount = sqlExecOnDataSource(sSql, this.dataSource);
    else
      vars.recCount = sqlExec(sSql);
    }
  else
    {
    vars.recCount = task.vars.TSTrecCount;
    }
  //logInfo('---------- recCount ? ' + vars.recCount );
  vars.tableName = newTableTempName;
  vars.targetSchema = "temp:" + newSchemaName;  
  
  
  //Mise a jour du schema principal de l'objet courant
  this.targetSchema = vars.targetSchema;
  this.targetSchemaName = vars.targetSchema.split(':')[1];
  this.targetSchemaNS = vars.targetSchema.split(':')[0];
  this.tableName = vars.tableName;
  
  //Sauvegarde pour cas de reprise
  task.vars.TSTtargetSchema = vars.targetSchema;
  task.vars.TSTtargetSchemaName = vars.targetSchema.split(':')[1];
  task.vars.TSTtargetSchemaNS = vars.targetSchema.split(':')[0];
  task.vars.TSTtableName = vars.tableName;
  task.vars.TSTrecCount = vars.recCount;
  task.vars.TSTTempSchemaAlreadyExtended = true;
  TempSchemaTools.saveTask();
  
  
  //Mise à jour de l'activité pour consultation et manipulation des données ensuite
  var extension = <extension/>;
  extension.appendChild( newSchema ); 
  extension.@label = newSchema.@label.toString();
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
          newActivityXML.extension[0].appendChild( newSchema );
        else
          newActivityXML.extension[0].schema[0] = newSchema;
        newActivityXML.extension[0].@label = newSchema.@label.toString();
        newActivityXML.@['_operation'] = "update";
         
         
        break;
      }
  } 
   //logInfo(' TempSchemaTools.prototype.extendTempSchema newSchema : ' + newSchema );
 var updateWkf = <workflow xtkschema="xtk:workflow" id={wkfXML.@id} _operation="update"><activities _operation="update">{newActivityXML}</activities></workflow>;
  
 xtk.session.Write( updateWkf );
 
}
 
TempSchemaTools.isTempSchemaAlreadyExtended = function(){
  return typeof task.vars.TSTTempSchemaAlreadyExtended != "undefined" && task.vars.TSTTempSchemaAlreadyExtended;
} 

 
 
TempSchemaTools.getSchemaKey = function( schemaXML ){
  var keyArray = new Array();
  if( schemaXML.element[0].key.length() > 0 )
  {
    var keyFields = schemaXML.element[0].key[0].keyfield;
    for(var k in keyFields )
     keyArray.push( keyFields[k].@xpath.toString() );
  }
  return keyArray;
}


TempSchemaTools.getAllSchemaFields = function( schemaXML ){
  var qSelectXML = <queryDef schema={schemaXML.@namespace + ":" + schemaXML.@name} operation="select">
    <select>
    </select>
  </queryDef>;
  var qdSelect = xtk.queryDef.create(qSelectXML);
   
  qdSelect.SelectAll(true);
  for each( var node in qdSelect.select.node )
    node.anyType = false;
    
  var build = qdSelect.BuildQueryEx();

  var allFields = [];
  var format = build[1];
  format = format.split(",");
  for(var i=1;i<format.length;i++)
      {
        //logInfo(format[i])
        var currentField = format[i].split(":");
        var expr = (currentField[0] || "").replace(/\//g,".");
        expr = expr.replace(/@([^.]*-[^.]*)/g,"@['$1']").replace(/^ *| *$/g,"");
        allFields.push({
          expr : expr,
          name : (currentField[0] || "").replace("@","").replace(/^ */g,""),
          type : currentField[1]
        });
      }
  return allFields;
}
