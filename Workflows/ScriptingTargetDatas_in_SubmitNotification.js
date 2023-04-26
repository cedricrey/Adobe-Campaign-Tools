var modelId = "DM146723";
var modelBisId = "DM149689";

var tempSchema = application.getSchema( vars.targetSchema );
var mainDocument = tempSchema.toDocument();

var tempDataSchemaName = "notification-all";

var tempSchemaXML = new XML( tempSchema.toDocument().root.toXMLString() );
//Modification du nom
tempSchemaXML.element[0].@name = tempDataSchemaName;
tempSchemaXML.@name = tempDataSchemaName;

//Modification de la table temp
var originTableName = tempSchemaXML.element[0].@sqltable.toString();
var newTableName = originTableName + "_ALL";
tempSchemaXML.element[0].@sqltable = newTableName;

//Ajout du lien de la table targetData vers Broadlog
tempSchemaXML.element[0].appendChild(
          <element advanced="false" externalJoin="false" label="Logs de diffusion des destinataires" name="broadLog" revLink="targetData" target="nms:broadLogRcp" type="link" unbound="true">
              <join xpath-dst="@recipient-id" xpath-src="@id"/>
              <join xpath-dst="@targetData-id" xpath-src="@targetData-id"/>
          </element>
        );

//Ajout des 2 attributs targetData-id et delivery-id
tempSchemaXML.element[0].appendChild(<attribute advanced="false" label="" length="0" name="targetData-id" notNull="true" sql="true" sqlname="iTargetDataId" type="long" xml="false"/>);
tempSchemaXML.element[0].appendChild(<attribute advanced="true" label="Clé étrangère du lien 'Diffusion' (champ 'id')" length="0" name="delivery-id" notNull="true" sql="true" sqlname="iDeliveryId" type="long" xml="false"/>);

//Ajout d'un revLink sur le lien "target" (vers nms:recipient par défaut)
for each(var el in tempSchemaXML.element[0].element )
  {
  if(el.@name.toString() == "target")
    el.@revLink = "targetData";
  }

//Changement du nom "schema" vers "srcSchema" (vraiment utile ?)
tempSchemaXML.setName('srcSchema');

//Enregistrement du schéma dans le contexte d'execution courant
registerSchema("temp:" + tempDataSchemaName, tempSchemaXML, false);
//Construction de la table de travail (avec les nouveaux champs 'iTargetDataId' et 'iDeliveryId')
buildSqlTable("temp:" + tempDataSchemaName);

//Remplissage de la nouvelle table targetData
var queryToCopy = NLWS.xtkQueryDef.create(
  {
    queryDef:{
      schema:vars.targetSchema,operation:'select' 
    }
  });
queryToCopy.SelectAll(0);
var columnsReg = /SELECT ([\w .,]*) FROM/gi;
var strQuery = queryToCopy.BuildQuery();
var columns = columnsReg.exec( strQuery );
if( columns && columns.length > 1 )
  columns = columns[1];
  
else
  logError( "Une erreur est survenue lors de la récupération des colonnes du targetData : " + strQuery );
  
columns = columns.replace(/W[\d]*./g,"");
sqlExec("INSERT INTO "+ newTableName +"("+columns+",iTargetDataId ) SELECT "+columns+",rownum FROM " + originTableName);
logInfo("INSERT INTO "+ newTableName +"("+columns+",iTargetDataId ) SELECT "+columns+",rownum FROM " + originTableName);

var targetSchema  = vars.targetSchema;
var tableName     = vars.tableName;
var filterName = targetSchema + "|" + tableName ;

       
targetSchema = "temp:" + tempDataSchemaName;
filterName = targetSchema + "|" + newTableName;

for each(var email in ['adress1@email.com','adress2@email.com'])
{
  var currentModel = modelId;
  if( email === 'adress2@email.com' )
    currentModel = modelBisId;
   var target = {delivery:{
     targets:{
      deliveryTarget:{
         targetPart:{
             type:"query",exclusion:'false',ignoreDeleteStatus:'false',
             where:{
                filterName : filterName,
                //condition: {expr: "@id IN ("+ lstTarget.join(',') + ")"}
                condition: [
                  {expr: "@id=["+targetSchema + ":@id]"},
                  {expr: "["+targetSchema + ":@modelName]='" + currentModel + "'"},
                
                  ]
             }
         }
      }
     }      
   }
  };
var notificationId = NLWS.nmsDelivery.SubmitNotification(currentModel,target) 
}
