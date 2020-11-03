function DGEN( elementName, object ){
  this.elementName = elementName;
  this.object = object;
}
  var globalDGENI = 0;
DGEN.prototype.generateXML = function(){
  this.element = new XML( "<" + this.elementName + "/>");
    for(var name in this.object)
    {
      var child = this.object[name];
      if( child.constructor === Object)
        this.element.appendChild((new DGEN(name, child)).generateXML());
      else if( child.constructor === DGEN)
        this.element.appendChild(child.generateXML());
      else if( typeof child == 'xml' )
        this.element.appendChild(child);
      else
        this.element["@" + name] = DGEN.setValue( child );
    }
  return this.element;
};
DGEN.prototype.getPreviousXML = function(){
  if( this.element )
    return this.element;
  return null;
}
DGEN.primitiveTypes = [Number, Boolean, String];
DGEN.setValue = function( child ){
  if( DGEN.primitiveTypes.indexOf(child.constructor) != -1  )
    return child.toString();
  if( child instanceof Date)
    return formatDate(child,'%4y-%2m-%2dT%2h:%2n:%2s');
  if( child instanceof DGEN_RANDOM)
    return child.getValue();
  if( child instanceof Function)
    return child();
  return child.toString();

}

function DGEN_RANDOM(){
  this.Dtype = "string";
  this.valueLength = 3;
  this.returnedValue = '';
  var args = arguments[ 0 ] || {};
  if(args.Dtype)
    this.Dtype = args.Dtype;
  if(args.values)
    {
      this.Dtype = "table";
      this.values = args.values;
    }
  if(args.pattern)
  {
    this.pattern = args.pattern;
    this.Dtype = "pattern";
  }
  if(args.valueLength)
    this.valueLength = args.valueLength;
}
DGEN_RANDOM.prototype.RANDOM_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
DGEN_RANDOM.U_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
DGEN_RANDOM.L_CHARS = DGEN_RANDOM.U_CHARS.toLowerCase();
DGEN_RANDOM.AN_CHARS = DGEN_RANDOM.prototype.RANDOM_CHARS + "1234567890";
DGEN_RANDOM.prototype.getValue = function(){
  this.returnedValue = '';
  if( this.Dtype == 'table')
    this.returnedValue = this.values[ Math.floor( Math.random() * this.values.length )];
  else if( this.Dtype == 'integer')
    this.returnedValue = Math.floor( Math.random() * Math.pow(10, this.valueLength) );
  else if( this.Dtype == 'pattern')
    this.returnedValue = this.evalPattern();
  else
    {
    for(i=0;i<this.valueLength;i++)
      this.returnedValue += this.RANDOM_CHARS.charAt([ Math.floor( Math.random() * this.RANDOM_CHARS.length ) ]);
    } 
  return this.returnedValue;
  
}
DGEN_RANDOM.getPreviousValue = function( dgenRandom ){
  return dgenRandom.returnedValue;
}
DGEN_RANDOM.prototype.toString = DGEN_RANDOM.prototype.getValue;
DGEN_RANDOM.prototype.evalPattern = function( ){
  var rChar = this.RANDOM_CHARS;
  return this.pattern.replace(/%([0-9]*)s/gi, function(match, $1){
    var nb = $1 || 1;
    var returnStr = "";
    for(var i=0; i < nb; i++)
      returnStr += rChar.charAt([ Math.floor( Math.random() * rChar.length ) ]);
    return returnStr;
  })
  .replace(/%([0-9]*)d/gi, function(match, $1){
    var nb = $1 || 1;
    return Math.floor( Math.random() * Math.pow(10, nb) );
  });

}

/*LISTE DE DGEN*/

function DGEN_LIST( obj ){
  this.dModel = obj.dModel || {};
  this.dName = obj.dName || 'generatedData';
  this.dSize = obj.dSize || 3;

  this.xmlElements = new XML("<" + this.dName + "-collection />");
  for(var i = 0 ; i< this.dSize; i++)
  {
    //var currentElement = new XML("<" + this.dModel + " />");
    DGTABLE.currentIterator = i;
    var datas = {};
    for(var name in this.dModel)
      {
        var child = this.dModel[name];
        if( child.constructor === DGTABLE)
          datas[name] = child.getValue( i ) ;
        else if( child instanceof Array)
          datas[name] = child[ i % child.length];
        else
          datas[name] = child ;
      }

    var currentDgen = new DGEN( this.dName , datas );
    this.xmlElements.appendChild( currentDgen.generateXML() );
  }

}
DGEN_LIST.prototype.getXML = function(){
  return this.xmlElements;
}
function DGTABLE( table, formula ){
  this.table = table;
  this.formula = formula || 1;
}
DGTABLE.currentIterator = 0;
DGTABLE.prototype.getValue = function( iteratorValue ){
  return this.table[ Math.floor( eval( iteratorValue + "*" + this.formula ) ) % this.table.length ];
}
DGTABLE.prototype.toString = function (){
  return this.getValue(DGTABLE.currentIterator).toString();
}