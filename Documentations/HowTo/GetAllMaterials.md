## How to get all materials in a delivery model
```
var deliveryId = 123456; //delivery model id
var delivery = NLWS.nmsDelivery.load( deliveryId );
var html = delivery.content.html.source;

var elementToLoad = new Array();
var includeViews = new Array();

//Step 1 : retrieve all options and view in the HTML (can be changed to text or anything else)
var regInclude = /<\s*?%\s*?@\s*?include\s*?(view|option)=["']([^"']*)["'].*?%>/gm;
while( s = regInclude.exec( html ) )
  {
  elementToLoad.push( ( s[1] == 'view' ? "includeView" : s[1] ) + "|" + s[2] + "|html");  
  }
//All materials (and sub materials) needed
var material = delivery.LoadExpandedContents( elementToLoad.join(',') );

//All <materialItem> in the main <materials>
 materials = material.getElements();
 //Loop into the list (here displays the "id" attribute but the content is available too)
 materials.forEach(function(m){
  logInfo( m.getAttribute( 'id' ) );
 })
```
