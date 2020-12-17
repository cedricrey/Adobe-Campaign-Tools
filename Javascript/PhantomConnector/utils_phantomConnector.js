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
    injectJS : arguments.injectJS || "",
    pageURL : arguments.pageURL || "",
    pageHTML : { $ : arguments.pageHTML ? arguments.pageHTML.toString().replace(/"/gm,('\\"')) : "" },
    onPageLoadedScript : { $ : arguments.onPageLoadedScript || "" },
    autoExit : arguments.handleExit ? false : true,
    viewPort : arguments.viewPort || {}    
  }
  if( arguments.proxy && arguments.proxy != "" )
    this.proxy = arguments.proxy;
  //this.execTimeout = arguments.execTimeout || 60; //Only for Unix system...
}

PhantomConnector.globals = {
  executionDirectory : getOption('PhantomConnector_directory') || 'PHANTOM',
  libDirectory : getOption('PhantomConnector_libDirectory') ? getOption('PhantomConnector_libDirectory') : getOption('PhantomConnector_directory') ? getOption('PhantomConnector_directory') + '/lib' : 'PHANTOM/lib'
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
      {
        this.scriptConfig.embededJSLib.$ += PhantomConnector.manageScriptDependency( "loadLibrary('"+lib+"')" ) + "\n";
      }
    }
  if( this.scriptConfig.injectJS != "" )
    {
    if(this.scriptConfig.injectJS.constructor !== Array)
      this.scriptConfig.injectJS = [this.scriptConfig.injectJS];
    this.scriptConfig.injectJSLib = {$ : ""};
    for each(var lib in this.scriptConfig.injectJS )
      {
        var libFileName = PhantomConnector.loadInjectedLib( lib );
        this.scriptConfig.injectJSLib.$ += "phantom.injectJs('"+libFileName+"');" + "\n";

      }
    }
  var executionScript = this.generateExecutionScript();
  if( !executionScript.match(/phantom\.exit\(\)/))
    logWarning("WARNING : It seems that 'handleExit' option is true, but no 'phantom.exit()' execution found in the script. Execution may stuck up without exiting and needs an admin kill...");
  //Generate the temp script
  PhantomConnector.writeFile( this.executionScriptFileName , executionScript );
  //logInfo("Script File is : " + this.executionScriptFileName);
  //return
  //In Unix like system... => 'timeout -s SIGKILL --preserve-status '+ this.execTimeout + 'phantomjs ....')
  var command = 'phantomjs --ssl-protocol=any --ignore-ssl-errors=yes '
  if( this.proxy )
    command += " --proxy=" + this.proxy;
  command += " " + this.executionScriptFileName;
  var result = execCommand(command, true );

  //Remove the temp script
  PhantomConnector.removeFile(this.executionScriptFileName);

  if( result[0] == 0 )
    return result[1];
  else
    {
      var codeError = result[0];
      logError( "[PhantomConnector] " + result[1] + ' ('+ codeError +')');
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

PhantomConnector.dependencyReg = /(?:loadLibrary)\(['"]([^'"]*)['"]\)/;
PhantomConnector.manageScriptDependency = function( script ){
  result = script.toString().replace( PhantomConnector.dependencyReg, function( correspondance, libName ){
    return xtk.javascript.load( libName ).data.toString();
  });
  //Recursive watch
  if( result.match( PhantomConnector.dependencyReg ) )
    result = PhantomConnector.manageScriptDependency( result );

  return result;
}
PhantomConnector.loadInjectedLib = function( libName ){
  var directoryName = PhantomConnector.globals.libDirectory;
  var directory = new File( directoryName );
  if( !directory.exists )
     directory.mkdir();
  var data = xtk.javascript.load( libName ).data.toString();
  var scriptBuffer = new MemoryBuffer();
  scriptBuffer.fromString( data );
  //var fileName = 
  var signature = scriptBuffer.sha256();
  fileName = directoryName + '/' + signature + '.js';  
  var file = new File( fileName );
  if( !file.exists )
    scriptBuffer.save( fileName );


  file.dispose();
  scriptBuffer.dispose();

  return fileName;
}
