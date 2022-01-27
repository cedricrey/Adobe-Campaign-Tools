
//Get the real Schema Temp Table (when Workflow fail / stop / pause it can loose the context and the temp schema)
//Recuperation du schema temporaire pour lui coller la bonne table (vars.tableName)
var targetSchema = application.getSchema( vars.targetSchema );
targetSchemaDOM = targetSchema.toDocument().getElementsByTagName('schema')[0];
targetSchemaDOM.getElementsByTagName('element')[0].setAttribute('sqltable',vars.tableName);
registerSchema(vars.targetSchema.split(':')[1], new XML( targetSchemaDOM.toXMLString() ), false);
