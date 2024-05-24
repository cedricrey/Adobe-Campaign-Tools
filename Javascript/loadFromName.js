//Exemple with mapping. Adapt with the @name (can be interalName) and schema
var mapping = NLWS.nmsDeliveryMapping.load( 
  NLWS.xtkQueryDef.create(
  {
  queryDef : {
    schema : "nms:deliveryMapping",
    operation : "get",
    select : {
      node : {expr : "@id"}
      },
    where : {
      condition : { expr : "@name = '" + mappingToProcess + "'" }
      }
    }  
  }).ExecuteQuery().$id

);
