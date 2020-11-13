/*
Light JS lib for Adobe Campaign that allows the use of PhantomJS (installed by default in any ACC insallation)
Handle the PhantomJS Script creation with Campaign javascript dependencies (direct Script Injection), using JST temlating "utils:phantomScriptGenerator.jst"
The result of the run is everything put in the stdout (meaning, in JS, what is push by console.log function)

*/


var PhantomConnector = function( arguments ){
  this.options = arguments || {};
  this.currentExecutionId = "phc_" + (new Date()).getTime();
  this.executionScriptFileName = PhantomConnector.globals.executionDirectory + "/" + this.currentExecutionId + '.js';
  //MUST BE JXON
  this.scriptConfig = {
    initScript : { $ : arguments.initScript || "" },
    jsToLoad : arguments.jsToLoad || "",
    pageURL : arguments.pageURL || "",
    pageHTML : { $ : arguments.pageHTML || "" },
    onPageLoadedScript : { $ : arguments.onPageLoadedScript || "" },
    autoExit : arguments.handleExit ? false : true,
    viewPort : arguments.viewPort || {}
  }
}

PhantomConnector.globals = {
  executionDirectory : getOption('PhantomConnector_directory') || 'PHANTOM'
}

PhantomConnector.prototype.run = function( ){
  this.scriptConfig.initScript.$ = PhantomConnector.manageScriptDependency( this.scriptConfig.initScript.$ );
  if( this.scriptConfig.jsToLoad != "" && this.scriptConfig.jsToLoad.constructor !== Array)
    {
    this.scriptConfig.jsToLoad = [this.scriptConfig.jsToLoad];
    this.scriptConfig.embededJSLib = {$ : ""};
    for each(var lib in this.scriptConfig.jsToLoad )
      this.scriptConfig.embededJSLib.$ += PhantomConnector.manageScriptDependency( "loadLibrary('"+lib+"')" ) + "\n";
    }
  var executionScript = this.generateExecutionScript();
  PhantomConnector.writeFile( this.executionScriptFileName , executionScript );
  //logInfo("Script File is : " + this.executionScriptFileName);
  //return
  var result = execCommand('phantomjs ' + this.executionScriptFileName );
  if( result[0] == 0 )
    return result[1];
  else
    throw result[1];
}

PhantomConnector.prototype.generateExecutionScript = function(  ){

  var jst = xtk.jst.load("utils:phantomScriptGenerator");
  var template = jst.code;

  //logInfo('this.scriptConfig :' , JSON.stringify(this.scriptConfig))
  var result = xtk.builder.EvaluateJavaScriptTemplate(
    "",
    template,
    { config : this.scriptConfig }
  );
  //setOption('LOGS',result[1]);
  return result[1];
}
PhantomConnector.writeFile = function( fileName , fileContent ){
  //Verification de l'existence du dossier PhantomConnector
  var directory = new File( PhantomConnector.globals.executionDirectory );
  if( !directory.exists )
     directory.mkdir();
  var scriptBuffer = new MemoryBuffer();
  scriptBuffer.fromString( fileContent );
  scriptBuffer.save( fileName );
  scriptBuffer.dispose();
}

PhantomConnector.dependencyReg = /(?:loadLibrary|phantom\.injectJs)\(['"]([^'"]*)['"]\)/;
PhantomConnector.manageScriptDependency = function( script ){
  result = script.toString().replace( PhantomConnector.dependencyReg, function( correspondance, libName ){
    return xtk.javascript.load( libName ).data.toString();
  });
  //Recursive watch
  if( result.match( PhantomConnector.dependencyReg ) )
    result = PhantomConnector.manageScriptDependency( result );

  return result;
}
