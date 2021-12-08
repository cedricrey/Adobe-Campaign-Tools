"use strict";
var ACC = require('ac-connector');
var ACLogManager = ACC.ACCLogManager;
var xtkQueryDef = ACC.xtkQueryDef;
var xtkSpecFile = ACC.xtkSpecFile;


class PackageLoader{
  static loadPackage(accLogin, env, specDefinition){
    /*var specWriter = { loginPromises : [], loaderPromises[] },*/
    specDefinition = specDefinition.replace(/\n/gm,'');

/*
    currEnv = {};
    currEnv.name = env;*/
    //var accLogin = ACLogManager.getLogin( env );
    var specFile = new xtkSpecFile({ accLogin : accLogin });
    //Return the promise
    return specFile.GenerateDoc( specDefinition );
    //console.log("Got accLogin " + env );
    /*
    specWriter[env] = currEnv;
    specWriter.loginPromises.push( currEnv.accLogin.getLoginPromise() );
    specWriter.loaderPromises.push( currEnv.specFile.GenerateDoc( specDefinition ) );
    */

  /*
    Promise.all(specWriter.loginPromises).then( () => {
      for( var i in environnements)
      {
        var env = environnements[i];
        currEnv = specWriter[env];
        console.log("Try to go on " + env );
        currEnv.specFile.GenerateDoc( specDefinition.replace(/\n/gm,'') )
            .then( function(result){ 
              console.log('Got the spec...' )
              fs.writeFile(outputFolder + 'xtk_core_' + this.name + '.xml.json' , JSON.stringify(result[1], null, 2), () => {})
              fs.writeFile(outputFolder + 'xtk_core_' + this.name + '.json' , JSON.stringify(result[0], null, 2), () => {});
              var xmlVersion = result[2];
              fs.writeFile(outputFolder + 'xtk_core_' + this.name + '.xml' , xmlVersion, () => {});
            }.bind(currEnv))
            .catch(function(fail) { 
              fs.writeFile(outputFolder + 'xtk_core_' + this.name + '.error.log', JSON.stringify( fail.result , null, "\t" ) ) ;
            }.bind(currEnv))
      }
    }).catch( (e) => {
      console.log('Ouch... got a problem !' );
    });
*/


  }
}

exports.PackageLoader = PackageLoader;