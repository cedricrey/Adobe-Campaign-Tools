# How to add JSSP to Navigation

With the navtree, you have to add : a <view> into <views> to define your view.
  If you want to see your entry into the overflow pannel, you have to add type="overview" :
&lt;view img="nlui-icon-nms-task" jssp="cus:myJSSP" label="My Entry" name="cusMyEntry"
          type="overview"/>
          
  
  You can also add it to a universe with &lt;universes> >  &lt;universe> > &lt;blockView> > &lt;view img="nlui-icon-nms-task" label="My Entry" name="cusMyEntry"/>

  
 # Web tool on dashboard 
  List of ACC custom function added to jQuery elements :
  - nlActionMessage: function c(g)​​
  - nlAutoComplete: function c(g)​​
  - nlBackgroundEdit: function c(g)​​
  - nlBadger: function c(g)​​
  - nlBorderEdit: function c(g)​​
  - nlBorderLayout: function c(g)​​
  - nlButton: function c(g)​​
  - nlButtonBar: function c(g)​​
  - nlCmdBar: function c(g)​​
  - nlCollapsableSection: function c(g)​​
  - nlCollection: function c(g)​​
  - nlColorPicker: function c(g)​​
  - nlCompactEditor: function c(g)​​
  - nlCustomEditor: function c(g)​​
  - nlDashboardHeader: function c(g)​​
  - nlDashboardNavigationBlock: function c(g)​​
  - nlDashboardSection: function c(g)​​
  - nlData: function nlData(a, b)​​
  - nlDateSelector: function c(g)​​
  - nlDialog: function c(g)​​
  - nlDraggable: function c(g)​​
  - nlDropdown: function c(g)​​
  - nlDroppable: function c(g)​​
  - nlExprEditor: function c(g)​​
  - nlFileDroppable: function c(g)​​
  - nlFloatToolbar: function c(g)​​
  - nlForm: function c(g)​​
  - nlFormNavController: function c(g)​​
  - nlGeometryEdit: function c(g)​​
  - nlGrid: function c(g)​​
  - nlGridLayout: function c(g)​​
  - nlInputs: function c(g)​​
  - nlInterceptor: function c(g)​​
  - nlJobProgressIndicator: function c(g)​​
  - nlJobProgressIndicatorInDialog: function c(g)​​
  - nlKPI: function c(g)​​
  - nlKPIBar: function c(g)​​
  - nlLinearLayout: function c(g)​​
  - nlLinkView: function c(g)​​
  - nlList: function c(g)​​
  - nlListInDialog: function c(g)​​
  - nlMemoInput: function c(g)​​
  - nlMessageBox: function c(g) : display a message box (replace the 'alert() native browser function) => $('<div></div>').nlMessageBox({type:"info",message:"Hello", title : "Custom title"})
  - nlMore: function c(g)​​
  - nlMultiSel: function c(g)​​
  - nlMultipleChoice: function c(g)​​
  - nlNavBar: function c(g)​​
  - nlNavController: function c(g)​​
  - nlNavigationBox: function c(g)​​
  - nlNavigator: function c(g)​​
  - nlNotebook: function c(g)​​
  - nlNumberInput: function c(g)​​
  - nlOptionSwitcher: function c(g)​​
  - nlPasswordInput: function c(g)​​
  - nlPopover: function c(g)​​
  - nlPreview: function c(g)​​
  - nlQuickForm: function c(g)​​
  - nlSearchInput: function c(g)​​
  - nlSection: function c(g)​​
  - nlSerie: function c(g)​​
  - nlSpinner: function c(g)​​
  - nlSubmenu: function c(g)​​
  - nlTextInput: function c(g)​​
  - nlTimelineList: function c(g)​​
  - nlTooltip: function c(g)​​
  - nlTreeList: function c(g)​​
  - nlURLViewer: function c(g)​​
  - nlUiDialog: function c(g)​​
  - nlViewBar: function c(g)​​
  - nlWidget: function c(g)​​
  - nlWizard: function c(g)
