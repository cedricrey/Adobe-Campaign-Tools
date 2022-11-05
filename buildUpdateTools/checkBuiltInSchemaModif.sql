--Verification of builtin srcSchema. MData should be null (builtinf srcSchema must come from xml files)
SELECT iCreatedById
,iModifiedById
,mData
,sEntitySchema
,sImg
,sLabel
,sMd5
,sName
,sNamespace
,tsCreated
,tsLastModified
FROM XtkEntity
WHERE sNameSpace IN ('nms','nl','xtk','ncm') AND sEntitySchema IN ('xtk:srcSchema') AND mdata is not null;
