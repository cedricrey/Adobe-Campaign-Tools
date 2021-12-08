"use strict";
var ACC = require('ac-connector');
var ACLogManager = ACC.ACCLogManager;
var xtkQueryDef = ACC.xtkQueryDef;
var xtkSpecFile = ACC.xtkSpecFile;


class PackageLoader{
  static loadPackage(accLogin, specDefinition){
    specDefinition = specDefinition.replace(/\n/gm,'');
    var specFile = new xtkSpecFile({ accLogin : accLogin });
    //Return the promise
    return specFile.GenerateDoc( specDefinition );
  }
}

exports.PackageLoader = PackageLoader;