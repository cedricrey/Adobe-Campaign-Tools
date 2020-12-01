JSSP that display a list of object.
Work in progress, new feature / design to come

Work with 2 parameters :
- schema (mandatory) : the schema of the object
- selectField : list of field to display, by xpath notation, comma separated (ex : @lastName,@firstName)

Exemple : 
https://adobeCampaignServer/utils/listViewer.jssp?schema=xtk:option&selectField=@name



New : JST Generation Page
JSSP can be generated with fixed parameter !!
Example :
```javascript
var jst = xtk.jst.load("utils:listViewerBuilder");
  var template = jst.code;

  //logInfo('this.scriptConfig :' , JSON.stringify(this.scriptConfig))
  var result = xtk.builder.EvaluateJavaScriptTemplate(
    "",
    template,
    { config : {
      schema : 'xtk:option'
      }
    }
  );
  
//setOption('LOGS', result[1] )
var jssp = xtk.jssp.load('utils:listOptions.jssp');
if( !jssp )
 jssp = xtk.jssp.create();


jssp.namespace = "utils";
jssp.name = "listOptions.jssp";
jssp.data =  result[1];

jssp.save();
```

