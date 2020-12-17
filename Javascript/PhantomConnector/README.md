
# PhantomJS connector
This lib allows you to use the PhantomJS installation of Adobe Campaign to execute JS script and load page (or HTML content).
Plan to use unit test with mocha JS for mirror Page testing.

//TODO : use of the PhantomConnector class

Please, save the utils_phantomConnector.js as 'utils:phantomConnector.js' xtk:javascript object
ad utils_phantomConnector.js as 'utils:phantomScriptConnector.jst' xtk:jst object (everything should be located at least in /Administration/Configuration, or /Administration/Paramétrage in french install )

The class must be instanciate with parameters : new PhantomConnector( object );

then, the function "run" should be call and it return is what have been log (usually by 'console.log' in your script, or error). You can produce file and return the file name for example.

Example :
```javascript
  //RENDERING A WEBPAGE INTO AN XTK IMAGE
  loadLibrary('utils:phantomConnector.js');
  var tester = new PhantomConnector({
  pageURL : "http://cedricrey.fr",
  viewPort : {
    width : 600,
    height : 320
    },
  onPageLoadedScript : "page.zoomFactor = 0.5;  var base64 = page.renderBase64('PNG');console.log(base64);"
  //jsToLoad : "nms:campaign.js" //this is an example, but don't do this, nms:campaign.js as it will crash the browser...
  });


  var test = tester.run();
  //setOption('LOGS', test );
  newImg = xtk.image.create();
  newImg.data = test;
  newImg.name="renderedPage.png";
  newImg.namespace="cus";
  newImg.save();
```