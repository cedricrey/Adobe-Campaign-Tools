JSSP that display a list of object.
Work in progress, new feature / design to come

Work with 2 parameters :
- schema (mandatory) : the schema of the object
- selectField : list of field to display, by xpath notation, comma separated (ex : @lastName,@firstName)

Exemple : 
https://adobeCampaignServer/utils/listViewer.jssp?schema=xtk:option&selectField=@name

Todo : instead of "id" attribute, get the real key

