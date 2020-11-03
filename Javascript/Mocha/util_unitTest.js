eval( xtk.javascript.load('util:mocha.js').data );
eval( xtk.javascript.load('util:expect.js').data );

document.body.appendChild(<div id='mocha'/>);

var reportPageStyle = getOption('UnTestCSS');
var reportPageScript = xtk.javascript.load('util:unitTestPageScript.js').data;
/*
mocha.setup({
  ui:'bdd',
  asyncOnly: false
  });
describe('a suite of tests', function(){
  task.wait(500);

  it('should take less than 500ms', function(done){
    task.wait(done, 300);
  })

  it('should take less than 500ms as well', function(done){
    task.wait(done, 200);
  })
});
mocha.run();
*/

function UnitTest( options ){
  this.reportName = 'UTest_' + formatDate( new Date(), "%4Y%2M%2D_%2H%2N%2S");
  mocha.setup({
    ui:'bdd',
    noHighlighting : true
    });
  if( options.reportName )
    this.reportName = 'UTest_' + options.reportName;
}

UnitTest.prototype.run = function(){
  mocha.run();
  document.body.appendChild(<script>{reportPageScript}</script>);
  document.body.appendChild(<p>{"Executé le " + formatDate(new Date(),"%2D/%2M/%4Y à %2H%2N%2S")}</p>);
  document.body = htmlyze( document.body );
  var docBody  = document.body.toXMLString();  
  //docBody = docBody.replace(/[\n][\s]*(<span class="(?:number|string|comment|keyword|init)">[^<]*<\/span>)[\n][\s]*/mg," $1 ");
  docBody = UnitTest.highlightTags( docBody );
  //On force l'option à être de type "texte long"
  xtk.session.Write( <option dataType="12" name={this.reportName} xtkschema="xtk:option"/> );
  setOption( this.reportName, "<html><head><script src='http://code.jquery.com/jquery-1.11.3.min.js'></script><style>" + reportPageStyle+ "</style></head>" + docBody + "</html>");
 // setOption( this.reportName, "<html><head><style>" + reportPageStyle+ "</style></head>" + docBody + "</html>");
  
  console.log("Test finished, please open");
  console.log( getOption('NmsServer_URL' ) + "/util/displayOptionPage.jssp?optName=" + this.reportName);
  
  
  //console.log( htmlyze( document.body ) );
};

UnitTest.highlight = function(js) {
  return js
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
    .replace(/\/\/(.*)/gm, '<span class="comment">//$1</span>')
    .replace(/('.*?')/gm, '<span class="string">$1</span>')
    .replace(/(\d+\.\d+)/gm, '<span class="number">$1</span>')
    .replace(/(\d+)/gm, '<span class="number">$1</span>')
    .replace(/\bnew[ \t]+(\w+)/gm, '<span class="keyword">new</span> <span class="init">$1</span>')
    .replace(/\b(function|new|throw|return|var|if|else)\b/gm, '<span class="keyword">$1</span>')
}

UnitTest.highlightTags = function( nodeStr ) {
  return nodeStr.replace(/<code>([^<]*(?:(?!<\/code)<[^<]*)*)<\/code>/mg, function( macth, p1 ){ return "<code>"+  UnitTest.highlight(p1) +"</code>" })
        .replace(/[\s]*<code>/mg,'<code>');
};
