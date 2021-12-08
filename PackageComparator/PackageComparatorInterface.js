#!/usr/bin/env node
"use strict";
var ACC = require('ac-connector');
var ACCLogManager = ACC.ACCLogManager;
var xtkQueryDef = ACC.xtkQueryDef;
var xtkSpecFile = ACC.xtkSpecFile;
var JXON = require('jxon');
var xmlFormat = require('xml-formatter');
var PackageLoader = require('./PackageLoader').PackageLoader;
var PackageComparator = require('./PackageComparator').PackageComparator;

var jsdiff = require('diff'),
diffCheker = require('deep-diff').diff,
http = require('http'),
fs = require('fs'),
socket = require('socket.io');


class PCUI{
  static start(){
    PCUI.initSoapElements();
    PCUI.UIhttpServer = http.createServer(PCUI.clientRequest).listen(5252);
    console.log('\n\n================================\n\nInterface Access started, please open : \n\n\x1B[36mhttp://localhost:5252/ \x1B[0;40;37m\n\n================================\n\n');
    PCUI.UIsocket = socket(PCUI.UIhttpServer)
                    .on('connection', function(socket){
                      socket.on('listConnections', PCUI.listConnections);
                      socket.on('requestCompare', PCUI.requestCompare);
                      socket.on('searchPackage', PCUI.searchPackage);
                    });
  }

  static initSoapElements(){
    PCUI.environments = ACCLogManager.listConnections();
    PCUI.specWriter = { loginPromises : [] };    
    for( var i in PCUI.environments)
    {
      var env = PCUI.environments[i];
      var currEnv = {};
      currEnv.name = env;
      currEnv.accLogin = ACCLogManager.getLogin( env );
      //console.log("Got accLogin " + env );
      PCUI.specWriter[env] = currEnv;
      var currLonginPromise = currEnv.accLogin.getLoginPromise();
      PCUI.specWriter.loginPromises.push( currLonginPromise );
      currLonginPromise.catch(function(error){
        console.log("Error while log : ", this,  error.response.body );
        //PCUI.specWriter.loginPromises
      }.bind(env))
    }
    /*
    Promise.all(PCUI.specWriter.loginPromises).then( () => {
      
      for( var i in PCUI.environments)
      {
        var env = PCUI.environments[i];
        currEnv = PCUI.specWriter[env];
        console.log("Try to go on " + env );
        currEnv.accSpecFile = new xtkSpecFile({ accLogin : currEnv.accLogin });
        currEnv.accSpecFile.GenerateDoc( specDefinition.replace(/\n/gm,'') )
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
    });*/
  }

  static clientRequest(request, response){  
    var content = ""; 
    try{
      if( request.url.indexOf("/images/") == 0 )
         content = fs.readFileSync( require.resolve('./ressources/ui' + request.url ) );
      else if( request.url.indexOf("/ressources/") == 0 )
         content = fs.readFileSync( require.resolve('.' + request.url ) );
      else
        content = fs.readFileSync( require.resolve('./ressources/ui/index.html') );
    }
    catch(e){
      console.error("Error for request : " +  request.url)
      console.error( e );
    }
    response.end(content);    
  }

  static listConnections( mess ){
    console.log('connectionsList !! ', PCUI.environments )
    PCUI.UIsocket.emit('connectionsList', PCUI.environments);
  }

  static requestCompare( mess ){
    //console.log('requestCompare !! ', mess )
    /*PCUI.UIsocket.emit('connectionsList', PCUI.environments);*/
    var specLoadPromises = [], accLoginPromises = [];
    var environments = mess.environments;
    var spec = mess.spec;
    var origin = mess.origin;
    for(var i in environments)
    {
      var env = environments[i]
      var accLogin = PCUI.specWriter[env].accLogin;
      //accLogin.getLoginPromise().then( function (accLogin, env){
           
      var loadPromise = PackageLoader.loadPackage(accLogin, env,spec);
      specLoadPromises.push(loadPromise);
      loadPromise.then(
        function(env,result){
          result.env = env
        }.bind(this,env)
      )
      .catch( function( e ){
        console.log("Error occured ", e );
      });
      //}.bind(this,accLogin,env));
      //accLoginPromises.push( accLogin.getLoginPromise() );
    }
   //Promise.all(accLoginPromises).then( () => {
       Promise.all(specLoadPromises)
               .then(function( arg ){
                 //console.log("got all specs ", arg);
                     var specs = [];
                    for(var s in arg )
                    {
                      var env = arg[s].env;
                      //console.log("arg[s].env? " , s, arg[s]);
                      //var spec = require("./xtk_core_"+env[e]+".xml.json").package.entities;
                      var spec = arg[s][1].package.entities;
                      //console.log('arg[s][1] ? ', spec, arg[s]);
                      //console.log('env', env);
                      console.log(spec);
                      spec.name = env;
                      //origin
                      if(env == origin)
                      {
                        specs = [spec].concat( specs );
                      }
                      else
                        specs.push( spec );
                    }
                  //console.log("specs? " , specs);
                  var packageComparaison = PackageComparator.compare( specs );
                  var comparaisonEnv = [];
                  specs.forEach( (spec) => {comparaisonEnv.push(spec.name)});
                  PCUI.UIsocket.emit('packageComparaison', {environments : comparaisonEnv, HTMLcomparaison : packageComparaison});
               })
               .catch( function( e ){
                 console.log("Error occured ", e );
               })
             //});
  }
  
  static searchPackage( mess ){
    var environment = mess.environment;
    console.log(environment);
    var packageName = mess.spec.split(':');
    var searchACCLogin = PCUI.specWriter[environment].accLogin;

    var query = `<queryDef fullLoad="true" startPath="/" schema="xtk:specFile" operation="get">
            <select>
            <node expr="definition"/>
            </select>
            <where>
            <condition expr="@name=\'${packageName[1]}\'"/>
            <condition boolOperator="AND" expr="@namespace=\'${packageName[0]}\'"/>
            </where>
            </queryDef>`
    searchACCLogin.getLoginPromise().then( () => {
      var specQDF = new xtkQueryDef({ accLogin : searchACCLogin, outputFormat :'xml' });
      specQDF.ExecuteQuery( query ).then((result) => {
          console.log("query result" , JXON.xmlToString( result.documentElement.childNodes[0] ) );

          PCUI.UIsocket.emit('packageReult', xmlFormat( JXON.xmlToString( result.documentElement.childNodes[0] ) )  );
      });
    });


  }
 



}
PCUI.start();
