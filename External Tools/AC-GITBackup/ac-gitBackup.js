const fs = require('fs'),
      path = require('path'),
      { exec, spawn } = require('child_process'),
      os = require("os"),
      ACC = require('ac-connector'),
      ACSync = require('ac-sync'),
      ACCLogManager = ACC.ACCLogManager,
      xtkQueryDef = ACC.xtkQueryDef

var config;
try{
  config = require("./conf/config");
  }
catch( e )
  {
  fs.copyFileSync("./conf/config-example.json","./conf/config.json");
  var config = require("./conf/config");
  }



var executionDate = new Date();
var lastSyncDateStr = '1970-01-01 00:00:00.000Z';

var primaryKeyBySchema = {};
for( var f in ACSync.fileMapByFetch )
  {
   var fe = ACSync.fileMapByFetch[f];
   if( !fe.specificKey )
    primaryKeyBySchema[ fe.schema ] = fe.primaryKey;
  }


if( config.lastSyncDate )
  {
    lastSyncDateStr = formatDate(config.lastSyncDate);
  }
var allEnv = {};
if(typeof config.env == "string" )
  config.env = [ config.env ];

//PEPRARE FOLDER
var mainFolder = config.directories.gitRoot + path.sep + config.directories.backupSubDirectoryName;
  if (!fs.existsSync( mainFolder )) {
    fs.mkdirSync( mainFolder )
  }

//ALL STEPS :
//STEP 1 : PULL FROM GIT
//Verification que les opération de tous les environnement soient terminées
function pullGit(){
  console.log(`PLEASE GIT REPO, GIVE ME LAST CHANGES...`);
  console.log(`Going to ${mainFolder} && git pull`);
  for(var k in allEnv )
    if( !allEnv[k].allFetcheExecuted )
      return false;
  //On attend la fin de tous les ACSync.fetch
  Promise.all(allFetches).finally( result => {
      //var pushingCmd = spawn(`cd ${mainFolder} && git pull`, {
      var pushingCmd = spawn(`git -C ${mainFolder} pull`, {
        shell: true
      });
      pushingCmd.stdout.on('data', (data) => {
        console.log(data.toString());
      });

      pushingCmd.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      pushingCmd.on('exit', (code) => {
        console.log(`GIT PULL COMPLETE ${code}`);
        console.log(`LET'S SYNCHRONYSE WITH ACC`);
        getAllNewElements();
      });
    }
  );
}


/*PART 2 GETING ALL MODIFIED ELEMENTS*/  
var allSchemaPromises = new Array();
function getAllNewElements(){
  config.env.forEach( (env) => {
      console.log("********** TRY THE ENV : ", env);
      try{
        var lastEnvSyncDate = require( mainFolder + "/" + env + "/lastSyncDate.json" ).lastSyncDate;
        console.log('I GOT LAST SYNCDATE FROM ENV');
        lastSyncDateStr = formatDate(new Date(lastEnvSyncDate));
      }
      catch(e){
        //C'est pas grave on l'ecrira la fin
        console.log('no last sync date for this env')
      }
      allEnv[ env ] = {
        accLogin : ACCLogManager.getLogin( env.toString() ),
        toSync : {

        }
      };
      allEnv[ env ].accLogin.getLoginPromise().catch( ( e ) => { console.log("error while login", env);})
      for(var currElement in config.elementToSync)
      {
        var elementDef = config.elementToSync[ currElement ];
        if( elementDef.excludeEnv )
        {
          if( elementDef.excludeEnv.constructor != Array )
            elementDef.excludeEnv = [excludeEnv.excludeEnv];
          if( elementDef.excludeEnv.indexOf( env ) != -1 )
            continue;
        }
        var schema = elementDef.schema;

        var currentResolve, currentReject;
        var elementEnvPromise = new Promise( (resolve, reject ) => {currentResolve = resolve; currentReject = reject;});
        currentResolve.s = schema;
        //console.log("BEFORE ? ", currentResolve.s, schema);
        var queryDef = new xtkQueryDef({ accLogin : allEnv[ env ].accLogin });
        var condition = "";
        if( elementDef.modificationDateField )
          condition = elementDef.modificationDateField + " > #" + lastSyncDateStr + "#";

        var selectNode = `<node alias="@primaryKey" expr="${primaryKeyBySchema[schema] ? primaryKeyBySchema[schema] : "" }"/>`;
        //Ce con de Neolane est pas foutu de me remonter les clefs composées des éléments stockés dans xtkEntity (????). 
        //Typiquement, <node expr="@namespace + ':' + @name"/> ne renvoit rien. (alors que dans les conditions ça fonctionne => <condition expr=""@namespace + ':' + @name = 'nms:tamere"/>....)
        //On est donc obligé de passer par une décomposition de la clef dans le select pour la recomposer pour acSync....
        if( primaryKeyBySchema[schema] && primaryKeyBySchema[schema].indexOf(':') != -1 )
          {
            selectNode = "";
            primaryKeyBySchema[schema].replace(/[+' ]/g,'').split(':').forEach( (key) => { 
                selectNode += `<node expr="${key}"/>`
              });
          }

        var query = `
          <queryDef startPath="/" schema="${schema}" operation="select">
            <select>
            ${selectNode}
            </select>
            <where>
              <condition expr="${condition}"/>
              ${elementDef.conditions ? elementDef.conditions.join('') : ''}
            </where>
          </queryDef>`;
          //console.log('-----\n', query, '\n------\n');
          queryDef.ExecuteQuery( query ).then( function ( env, elementDef, currElement, currentResolve, result){
            //console.log("currentResolve ? ", env, currentResolve, schema);
            allEnv[ env ].toSync[ currElement ] = { definition : elementDef, toSyncList : result };
            //console.log("I got a result...", result);
            //console.log("allSchemaPromises ? ", allSchemaPromises)
            currentResolve( result );

          }.bind(this, env, elementDef, currElement, currentResolve) );
        allSchemaPromises.push( elementEnvPromise );
      }
    }
  )


  /*PART 3 : fetching files*/
  //var allFetch = [];
  Promise.all( allSchemaPromises ).finally( 
    (results) => {
      //console.log('FINIIIISHED');
      for(var env in allEnv)
        {
          allEnv[env].acSync = new ACSync({connectionName : env, enableLog : false});
          allEnv[env].fetches = [];
          for(var el in allEnv[env].toSync )
          {
            var currElement = allEnv[env].toSync[el];
            var schema = currElement.definition.schema;
            var elementName = schema.split(':')[1];
            var elements = [];
            if( currElement.toSyncList[elementName + "-collection"] && currElement.toSyncList[elementName + "-collection"][elementName])
             elements = currElement.toSyncList[elementName + "-collection"][elementName];
            
           if(!(elements instanceof Array))
              elements = [elements];


            var elDirectory = elementName;
            if( currElement.definition.directory )
              elDirectory = currElement.definition.directory;

            var currentSchemaFolder = mainFolder + path.sep + env + path.sep + elDirectory;
            if (!fs.existsSync( currentSchemaFolder  )) {
              fs.mkdirSync( currentSchemaFolder )
            }
            elements.forEach( ( el ) => {
              //console.log(el)
              var pk;
              if( el.attributes.primaryKey )
                pk = el.attributes.primaryKey;
              //Ce con de Neolane est pas foutu de me remonter les clefs composées des éléments stockés dans xtkEntity (????). 
              //Typiquement, <node expr="@namespace + ':' + @name"/> ne renvoit rien. (alors que dans les conditions ça fonctionne => <condition expr=""@namespace + ':' + @name = 'nms:tamere"/>....)
              //On est donc obligé de passer par une décomposition de la clef dans le select pour la recomposer pour acSync....
              else
                {
                  var splitArr = primaryKeyBySchema[schema].replace(/[+' ]/g,'').split(':');
                  var pkArr = [];
                  splitArr.forEach( (key) => {pkArr.push(el.attributes[key.replace('@','')]);});
                  pk = pkArr.join(':');
                }
              //console.log( mainFolder + path.sep + env + path.sep + "  ACSync -c " + env + " -f " + schema + "=" + pk , " to fetc...");
              //acSync.fetch(mainFolder + path.sep + env + path.sep + elementName + path.sep + schema + "=" + pk );

              var fetch = { "fetchStr" : currentSchemaFolder + path.sep + schema + "=" + pk};
              if( currElement.definition.extraQuerySelector )
                fetch.extraQuerySelector = currElement.definition.extraQuerySelector;
              allEnv[env].fetches.push( fetch );
            })
          }
          //On lance X traitements en parallèle pour l'env courant
          allEnv[env].currIndex = 0;
          var nbProcess = 5;
          for(var i=0; i < Math.min(allEnv[env].fetches.length, nbProcess); i++)
            nextFetch( allEnv[env] );
          //SI pas de fetch a faire, on met que tout est fini
          if( allEnv[env].fetches.length == 0 )
            {
              allEnv[env].allFetcheExecuted = true;
              console.log('NOTHING TO SYNC FOR ' + env );
            }
          fs.writeFile( mainFolder + "/" + env + "/lastSyncDate.json" , JSON.stringify({lastSyncDate : executionDate}, null, '\t') , ()=>{} );
        }  

        //Fin Traitement (enfin, fin du lancement) on met à jour la date de traitement dans la config
        config.lastSyncDate = executionDate;
        fs.writeFile( "." + path.sep + "conf" + path.sep + "config.json" , JSON.stringify(config, null, '\t'), ()=>{} );
    }
  );
}

//WHEN WE KNOW WHAT TO TAKE, FETCH THE QUEUE
var allFetches = [];
//Token servant à vérifier qu'il y a au moins 1 modif à commité, sinon, on commit en permanence les fichier lastSyncDate.json, ce qui n'a aucun interet
var atLeastOneFetchDone = false;
function nextFetch( env ){
if( env.currIndex < env.fetches.length)
  {
    console.log(`${env.currIndex} - FECTH : ${env.fetches[env.currIndex].fetchStr}`);
    atLeastOneFetchDone = true;
    var options = {};
    if( env.fetches[env.currIndex].extraQuerySelector )
      options.extraQuerySelector = env.fetches[env.currIndex].extraQuerySelector;
    
    var currentFetch = env.acSync.fetch( env.fetches[env.currIndex].fetchStr, options );
    currentFetch.then( function(env, result){
        nextFetch( env );
      }.bind(this,env))
      .catch( function(env, error){
        console.log('error : ', error );
        nextFetch( env );
      }.bind(this,env));
    allFetches.push( currentFetch );
    env.currIndex++;
  }
  else
    {
     env.allFetcheExecuted = true;
     prepareToGitPush();
    }
}

//STEP 4 : PUSH TO GIT
//Verification que les opération de tous les environnement soient terminées
function prepareToGitPush(){
  //IF NO FETCH DONE, WE STOP
  //Si aucun fetch n'a été fait, on evite de pousser les lastSyncDate.json de chaque environnement.
  if( !atLeastOneFetchDone )
    {
      console.log("No modification since the last commit, nothing to commit");
      console.log(' ******* End of AC-GITBACKUP operation. Thank you  ******* ');
      return false;
    }

  //console.log('IS EVERYTHING FINISHED ?');

  for(var k in allEnv )
    if( !allEnv[k].allFetcheExecuted )
      return false;
  //On attend la fin de tous les ACSync.fetch
  Promise.all(allFetches).finally( result => {
      //var pushingCmd = spawn(`cd ${mainFolder} && git add . && git commit -m "auto commit from ac-gitBackup (${os.userInfo().username} @ ${os.hostname()})" && git push origin`, {
        var pushingCmd = spawn(`git -C ${mainFolder} add . && git -C ${mainFolder} commit -m "auto commit from ac-gitBackup (${os.userInfo().username} @ ${os.hostname()})" && git -C ${mainFolder} push origin`, {
        shell: true
      });
      pushingCmd.stdout.on('data', (data) => {
        console.log(data.toString());
      });

      pushingCmd.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      pushingCmd.on('exit', (code) => {
        if( code != 0 )
        console.log(`Child exited with code ${code}`);
        else
          console.log(' ******* End of AC-GITBACKUP operation. Thank you  ******* ');
      });
    }
  );
}

function formatDate( dateInt ){
  var d = new Date( dateInt );
  return `${d.toISOString().replace('T',' ')}`
}

//LET'S GO
var dateStr = (new Date()).toLocaleString();
console.log(`\n\n\n ******* WELCOME TO AC-GITBACKUP - le ${dateStr} ******* \n`);
pullGit();
//console.log('os.userInfo() ?', os.userInfo());