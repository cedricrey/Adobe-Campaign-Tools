
# PhantomJS connector
This lib allows you to use the PhantomJS installation of Adobe Campaign to execute JS script and load page (or HTML content).
Plan to use unit test with mocha JS for mirror Page testing.

//TODO : use of the PhantomConnector class

Example :
  //RENDERING A WEBPAGE INTO AN XTK IMAGE
  loadLibrary('utils:phantomConnector.js');
  var tester = new PhantomConnector({
  pageURL : "http://cedricrey.fr",
  viewPort : {
    width : 600,
    height : 320
    },
  //onPageLoadedScript : "console.log(page.content);",
  onPageLoadedScript : "page.zoomFactor = 0.5;  var base64 = page.renderBase64('PNG');console.log(base64);"
  //jsToLoad : "nms:campaign.js"
  });

  var test = tester.run();
  //setOption('LOGS', test );
  newImg = xtk.image.create();
  newImg.data = test;
  newImg.name="renderedPage.png";
  newImg.namespace="cus";
  newImg.save();
