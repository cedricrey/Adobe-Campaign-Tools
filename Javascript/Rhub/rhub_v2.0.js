/**********************************
RHUB : Request HUB
       +
     + |
    ++-+-+
+---+    +------+
    |    +-+
  +-+-+--+
      |  |
      |  +
      +
V1.1.0 - 2018-01-18
V2.0.0 - 2019-11-20 : correctif suite montée de build 8932 : 
                      le "context" utilisé lors de l'évenement de réponse n'est plus passé en argument (10000 à la place). 
                      Nous l'attachons directement à l'objet request (heuresement accessible en écriture)
                      Cédric Rey

Utilitaire surchargeant la mécanique d'appels Asynchrone d'Adobe Campaign, 
semblant présenter un léger bug sur HttpClientRequest.wait et se chargeant de la gestion de plusieurs appels HTTP en parallèle
Rhub est un classe à implémenter (var r = new Rhub( options ); ) en lui passant un objet JS d'otpion en argument
et présentant une méthode à appeler (execute()) pour lancer traitement d'une pile d'objet présentant chacun au moins 1 attribut "url" (ou bien étant une string considérer comme url)
Les options possibles sont :
  - nbParallelRequest : nombre d'objet (et donc d'appels HTTP) à traiter/executer en même temps
  - timeout : temps d'attente (en ms) d'attente pour considérer une requête HTTP en timeout
Rhub gère aussi les retry via les options :
  - retries (nombre de retry à tenter pour chaque requête)
  - stopOnRetryLimit : Booléen indiquant si il faut arrêter tout le traitement en cas de nombre limite de retry atteint pour une requête
  - retriesWaitingTime : temps d'attente entre 2 retry pour une requete  
Rub permet l'appel d'un trigger lors de la reception d'une réponse. Elle doit avoir la même signature que la fonction à placer dans le "complete" d'un HttpClientRequest (voir JS API Adobe Campaign)
On lui indique ce trigger simplement via son attribut 'complete'

Exemple :
//Au sein d'une boucle,  context.requestList est un Array
for( iteration )
{
  ..
  ..
  var http = { 
    headers : [],
    url : url,
    method : method,
    body : body,
    element : element
  };
  http.headers["Content-Type"] = "application/json; charset=utf-8";
  http.headers["Content-Length"] = contentLength;
  context.requestList.push( http );
  ...
  ...
}

//Après la boucle :
var rhub = new Rhub({nbParallelRequest : 5});
//Ajout d'un trigger de fin de requete
rhub.complete = function( req, context, status ){
  //logInfo('Got a response for ' + context.name + ' (' + status + ') ');
  if( status != "success"  )
     logInfo("KO request " + status + " -- " + JSON.stringify( req ) );
  else
    {
    logInfo("Request OK : " + status + " -- " + JSON.stringify( req ) );
    }
};
      

//Execution de la pile
rhub.execute( context.requestList );
***********************************/
var Rhub = function( options ){
  this.options = options || {};
  this.nbParallelRequest = this.options.nbParallelRequest || 3;
  this.retries = this.options.retries || null;
  this.stopOnRetryLimit = typeof this.options.stopOnRetryLimit != 'undefined' ? this.options.stopOnRetryLimit : true;
  this.timeout = this.options.timeout || 5000;
  this.retriesWaitingTime = this.options.retriesWaitingTime || 1000;
  this._requestQueue = [];
  this._runtimeException = null;
  this.complete = function( req, currentObject, status ){
    logInfo("no complete function defined for this Rhub instance");
  };
  this.list = [];
};

Rhub.TOOMANYRETRYEXCEPTION = function( req, obj ){
  this.name = "TOOMANYRETRYEXCEPTION";
  this.message = "The were too many retries for one request";
  this.request = req;
  this.obj = obj;
}

Rhub.prototype._complete = function( req, currentObject, status ){
  /*
  PROBLEME : arguments[2] = 10000 et non plus l'objet de départ....
  for(var i in arguments)
    logInfo('arguments['+i+'] = ' + arguments[i] );
  */
  //[PATCH V2] : Le currentObject a changé avec la montée de build 8932 (18.4) : ce n'est plus le "context" passé en 3ème argument de la méthode "execute", mais le chiffre 10000
  //Nous patchons en attachant le "context" directement à la requete (req) via _context (voir ligne ~214)
  //if(currentObject == 10000)
    //{
    //logInfo('currentObject == 1000 ...');
    //logInfo('req._object ? ', req._object);
    currentObject = req._context;
    //}

  if(this.options.enableLog) logInfo("[Rhub] : _complete " + status + " code : " + req.response.code );
  //logInfo('req._complete slice : ' + currentObject.element.@id );
  this._spliceRequest( req );
  //Si le retour n'est pas en succès, et qu'un nombre de retry (this.retries) est paramétré, on tente un retry
  if( status != 'success' && this.retries )
    { 
    this.retry( req, currentObject, status );    
    }
  else
    {
    this.complete( req, currentObject, status );
    }
   this._nextRequest();
}

//Fonction vérifiant si un nombre de retry n'est pas atteint pour un objet, 
//  - si oui, attend Xms (retriesWaitingTime)
//  - Remet l'objet courant au début de la liste à traiter (sera le prochain traité)
//Sinon, si le stop est démandé (stopOnRetryLimit : oui par défaut), ajoute une exception d'execution et stop la pile d'execution RHUB (s'arrêtera à la fin des traitements en cours)
Rhub.prototype.retry = function( req, currentObject, status ){ 
  if( currentObject._retries )
    currentObject._retries++;
  else
    currentObject._retries = 1;
    
  if( currentObject._retries < this.retries )
    {
    //On attend un délai avant le retry
    task.wait( this.retriesWaitingTime );
    //Reset d'un eventuel request déjà présent à l'origine dans l'objet courant 
    //(sinon, la requête ayant déjà été executé, lorsqu'elle sera remise dans la pile surveillée, HttpClientRequest.wait la considérera déjà terminée, et bug ACC, arrêtera toute la pile d'execution)
    if( currentObject.request )
      currentObject.request = this._copyRequest( currentObject.request );
    //remet l'objet en début de liste à traiter
    this.list.unshift( currentObject );
    }
  else 
    {
    if(this.options.enableLog)
      logWarning("[Rhub] : too many retries for " + req.url + "(" +  currentObject._retries + ")");
    if( this.stopOnRetryLimit ) 
      {
      this._runtimeException = new Rhub.TOOMANYRETRYEXCEPTION( req, currentObject );
      this.stop();
      }
    }
}

Rhub.prototype._nextRequest = function(){
  // Si la liste a traiter contient encore des éléments, et si aucun stop n'a été demandé
  if( this.list.length != 0 && !this._stop )
  {
    // On prend le prochain objet de la liste
    var obj = this.list.shift();
    //Si celui-ci est une chaîne, alors on considère que c'est l'url à appeler, on transforme en objet conforme à rhub
    if( typeof obj == 'string' )
      obj = { url : obj };
    
    //The object has already a request ready to send 
    //Cet objet contient déjà une requete définie, alors on la prend telle quelle
    if( obj.request )
      {
      var req = obj.request;
      }
    //Sinon on la construit nous même  
    else
      {
      //Avec son url (obj.url)
      var req = new HttpClientRequest(obj.url);
    
      //Si il y a un objet "headers", on le parcours pour construire les entêtes HTTP
      if(typeof obj.headers == 'object' )
        for(var h in obj.headers)
          req.header[h] = obj.headers[h];
      
      req.method = 'GET';
      //Si il y a un body (obj.body), on le récupère, et on met la méthode par défaut à POST, sauf si elle est spécifiée par l'attribut obj.method
      if(typeof obj.body != 'undefined' )
        {
        req.body = obj.body;
        req.method = obj.method || 'POST';
        }
      
      //Si il y a une méthode HTTP spécifiée (meme sans body), on la récupère
      if(typeof obj.method != 'undefined' )
        req.method;
      }
    //Add 'close' connection if not present
    if( !obj.headers || typeof obj.headers["Connection"] == "undefined" )
      req.header["Connection"] = "close";
    
    
    //Attach the local complete function to the request
    //On gère nous meme le complete : ce sera le _complete de rhub qui sera appelé en premier
    req.complete = this._complete.bind( this );
    
    //on execute la requête en mode asynchrone via '_sendRequest' de RHUB
    this._sendRequest( req, obj );
    
  }
}

Rhub.prototype._sendRequest = function( req, obj ){
   try
    {
      if(this.options.enableLog) logInfo("[Rhub] : Will send " + req.url)
      //on ajoute la requete à la liste surveillée par le wait principal
      this._requestQueue.push(req)            
      //logInfo('_requestQueue push : ' + this._requestQueue.length );
      //On execute la requete, en mode asynchrone
      
      //[PATCH V2] : Le second argument de la méthode complete a changé avec la montée de build 8932 (18.4) : ce n'est plus le "context" (obj) passé en 3ème argument de la méthode "execute", mais le chiffre 10000
      //Nous patchons en attachant le "context" directement à la requete (via _context)
      req._context = obj;      
      req.execute(false, true, obj, this.timeout);
      if(this.options.enableLog) logInfo("[Rhub] : Sending " + req.url );
      return;
    }
    catch(e)
    {
      if(this.options.enableLog) logWarning("[Rhub] : failed to send " + req.url);
      //En cas d'erreur, on retire la requête de la liste surveillée, et on tente un retry
      if( this.retries )
        try
        { 
          this._spliceRequest( req );     
          this.retry( req, obj, "error" );
        }
        catch( e ){
          if(this.options.enableLog) logWarning("[Rhub] : failed to send retry " + req.url + " (" + e + ")");
        }
    }
}

Rhub.prototype._copyRequest = function( reqOrigin ){
  var req = new HttpClientRequest(reqOrigin.url);
  if(typeof reqOrigin.header == 'object' )
    for(var h in reqOrigin.header)
      req.header[h] = reqOrigin.header[h];
  
  req.method = 'GET';
  if(typeof reqOrigin.body != 'undefined' )
    {
    req.body = reqOrigin.body;
    req.method = reqOrigin.method || 'POST';
    }
  
  if(typeof reqOrigin.method != 'undefined' )
    req.method;

  //Attach the local complete function to the request
  req.complete = this._complete.bind( this );
  
  return req;
}

Rhub.prototype._spliceRequest = function( req ){
  var index = this._requestQueue.indexOf(req);
  //logInfo('splice : ' + index + " / " + this._requestQueue.length );
  if( index != -1 )
    {
    //logInfo('delete : ' + index + " / " + this._requestQueue.length );    
    this._requestQueue.splice( index , 1 );
    //logInfo('deleted : ' + this._requestQueue.length );
    }
}

Rhub.prototype.execute = function( list ){
  this.list = list;
  for(var i=0; i < this.nbParallelRequest; i++)
  { 
   this._nextRequest();
  }  
  if(this.options.enableLog) logInfo('[Rhub]: ' + i + ' parallel process executing');
  //Fonction d'attente de fin de traitement de la pile 
  //(bugguée car s'arrête dès l'arrivée d'une première requête, qu'il faut retirer immédiatement de la pile)
  HttpClientRequest.wait( this._requestQueue );
  //Exception Management
  //Si une exception a été ajoutée, lève cette exception
  if( this._runtimeException )
    {
    if(this.options.enableLog) logWarning("[Rhub] : Queue job not correctly processed." );
    if(this.options.enableLog) logWarning("[Rhub] : " + (this._runtimeException.message ? this._runtimeException.message : this._runtimeException) );
    throw this._runtimeException;
    }
  if(this.options.enableLog) logInfo("[Rhub] : Queue job processed. " + this._requestQueue.length );
}

Rhub.prototype.stop = function(){
  this._stop = true;
  if(this.options.enableLog) logInfo("[Rhub] : Execution has been stopped.");
}