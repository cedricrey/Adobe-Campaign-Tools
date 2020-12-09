/*
Light JS lib for Adobe Campaign that allows the use of PhantomJS (installed by default in any ACC insallation)
Handle the PhantomJS Script creation with Campaign javascript dependencies (direct Script Injection), using JST temlating "utils:phantomScriptGenerator.jst"
The result of the run is everything put in the stdout (meaning, in JS, what is push by console.log function)

*/

/**
* Constructor
* @property {Object} options - Options of the PhantomConnector instance
    initScript : {String} The script that must be executed before page loading (phantomJS Apis available)
    jsToLoad : {String | Array of String} : xtk:javascript name(s) to load (data will be wrote as raw)
    pageURL : {String} The url page to load if wanted
    pageHTML : {String} The page content to load if prefered
    onPageLoadedScript : {String} The script that will be executed when the page will be loaded (if url or content provided)
    handleExit : {Boolean} If true, indicates that "phantomJS.exit is handle by the script. Usefull for 'async' function. Carefull !!!! If not handle correctly, the script won't finished !!! (and even with a "workflow kill" you'll have the PhantomJS process up !!!!!!!!!!)
    viewPort : {Object} : 'width' and 'height' parameter for viewport of script execution
* */

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
/** 
* Run Phantom as configured in the instance
* @summary function "run" the PhantomJS command with the script produced and returns what have been log (usually by 'console.log' in your script, or error). You can produce file and return the file name for example
* @return {String} what have been log (usually by 'console.log' in your script, or error)
*/}

PhantomConnector.prototype.run = function( ){
  this.scriptConfig.initScript.$ = PhantomConnector.manageScriptDependency( this.scriptConfig.initScript.$ );
  if( this.scriptConfig.jsToLoad != "" )
    {
    if(this.scriptConfig.jsToLoad.constructor !== Array)
      this.scriptConfig.jsToLoad = [this.scriptConfig.jsToLoad];
    this.scriptConfig.embededJSLib = {$ : ""};
    for each(var lib in this.scriptConfig.jsToLoad )
      this.scriptConfig.embededJSLib.$ += PhantomConnector.manageScriptDependency( "loadLibrary('"+lib+"')" ) + "\n";
    }
  var executionScript = this.generateExecutionScript();
  //Generate the temp script
  PhantomConnector.writeFile( this.executionScriptFileName , executionScript );
  //logInfo("Script File is : " + this.executionScriptFileName);
  //return
  var result = execCommand('phantomjs --ssl-protocol=any --ignore-ssl-errors=yes ' + this.executionScriptFileName, true );

  //Remove the temp script
  PhantomConnector.removeFile(this.executionScriptFileName);

  if( result[0] == 0 )
    return result[1];
  else
    {
      logError( "[PhantomConnector] " + result[1] )
      throw result[1];
    }
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
PhantomConnector.removeFile = function( fileName ){
  var file = new File( fileName );
  file.remove();
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
