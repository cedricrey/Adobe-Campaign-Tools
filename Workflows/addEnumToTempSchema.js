/**
Here is how we can add an enum to an attribute of a temp schema (can be used into a nms:group for example)
PARAM : 
- ATTRIBUTE_NAME is the attribute on wich we want use the enumeration
- ENUM_NAME is the full name of the enumeration (example : "nms:delivery:messageType")
*/
var ATTRIBUTE_NAME = "myAttribute";
var ENUM_NAME = "nms:mySchema:myEnum";

var schema = application.getSchema(vars.targetSchema);

var schemaXML = schema.toDocument()
var mainName = schemaXML.getElementsByTagName('element')[0].getAttribute('name').toString();
var attributes = schemaXML.getElementsByTagName('element')[0].getElementsByTagName('attribute');
for each( attribute in attributes )
  if( attribute.getAttribute('name').toString() == ATTRIBUTE_NAME )
    attribute.setAttribute('enum', ENUM_NAME );
    
registerSchema( mainName, new XML( schemaXML.toXMLString().replace( "<?xml version='1.0'?>", '') ), false);
