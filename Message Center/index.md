# Some tips for Message Center manipulation

### DeployTriggerMessages
[The documentation](https://experienceleague.adobe.com/developer/campaign-api/api/sm-delivery-DeployTriggerMessages.html) doesn't provide détail on the "deliveries (XML)" parameter for this method.
So, after some research I got what needed : it's a <where> XML node to target the deliveries :
```js
nms.delivery.DeployTriggerMessages(<where><condition expr="@id IN (1234, 5678)"/></where>, false);
```
