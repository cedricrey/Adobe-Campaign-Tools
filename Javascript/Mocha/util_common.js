// CommonJS require()
function require(p){
    var path = require.resolve(p)
      , mod = require.modules[path];
    if (!mod) throw new Error('failed to require "' + p + '"');
    if (!mod.exports) {
      mod.exports = {};
      mod.call(mod.exports, mod, mod.exports, require.relative(path));
    }
    return mod.exports;
  }

require.modules = {};

require.resolve = function (path){
    var orig = path
      , reg = path + '.js'
      , index = path + '/index.js';
    return require.modules[reg] && reg
      || require.modules[index] && index
      || orig;
  };
require.register = function (path, fn){
    require.modules[path] = fn;
  };
require.relative = function (parent) {
    return function(p){
      if ('.' != p.charAt(0)) return require(p);

      var path = parent.split('/')
        , segs = p.split('/');
      path.pop();

      for (var i = 0; i < segs.length; i++) {
        var seg = segs[i];
        if ('..' == seg) path.pop();
        else if ('.' != seg) path.push(seg);
      }

      return require(path.join('/'));
    };
  };
  
/**
* Fonction permettant la copy d'un objet Javascript
 * @param {Object} obj - objet à copier
 * @return une copie profonde de l'objet passé en paramètre
*/  
function cloneObject(obj) {
    var copy;

    //logInfo("GONA CLONE :" + obj + " -- typeof obj == 'object' ?  " + ("object" != typeof obj) + " -- OBJECT ?  " + (obj instanceof Object) ); 
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = cloneObject(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
      copy = {};
      if( obj.constructor )
         copy = new obj.constructor();
      
        
      for (var attr in obj) {    
        if( obj.hasOwnProperty(attr) ) copy[attr] = cloneObject(obj[attr]);        
      }
      //logInfo(" copy is : " + JSON.stringify( copy ));
      return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}