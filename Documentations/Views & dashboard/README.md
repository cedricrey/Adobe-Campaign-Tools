##How to add JSSP to Navigation##

With the navtree, you have to add : a <view> into <views> to define your view.
  If you want to see your entry into the overflow pannel, you have to add type="overview" :
&lt;view img="nlui-icon-nms-task" jssp="cus:myJSSP" label="My Entry" name="cusMyEntry"
          type="overview"/>
          
  
  You can also add it to a universe with &lt;universes> >  &lt;universe> > &lt;blockView> > &lt;view img="nlui-icon-nms-task" label="My Entry" name="cusMyEntry"/>
