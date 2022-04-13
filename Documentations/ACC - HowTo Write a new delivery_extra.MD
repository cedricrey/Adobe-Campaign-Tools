## Not in the documentation, but you'll need extra informations

### Delivery shcema extension
First, you can create your own channel value : into the nms:delivery:mappingType enum, add the new custom channel
Reminder: to add a value into an existing and native enumeration, you have to extend the native schema, and extend the enum :
  ```
  <enumeration name="messageType">
    <value desc="My custom channel" img="nms:other.png" label="Custom Channel 1" name="myChannel1"
           value="101"/>
  </enumeration>
  ```
  
This way, you can select this new channel into the externalAccount. This channel will be the one selected to any new delivery that use this account.

Then, you have to add the source of content for this channel into delivery schema, by using the exact same name of the channel
```
  <element name="content">
      <element label="My custom channel Content" name="myChannel1" template="nms:delivery:contentDef"/>
  </element>
```
You can add additionnal element using the channel name as prefix : 
```
      <element label="My custom channel (title)" name="myChannel1Title" ref="contentDef"/>
      <element label="My custom channel (subtitle)" name="myChannel1SubTitle" ref="contentDef"/>
```

### Delivery Mapping extension
You won't be able to find target for your new channel if you don't add the mapping into the mapping schema. The mapping allows Adobe Campaign deliveries to use different kinds of schema as target.
In the mapping extension, you'll need to add the exact name of your channel as attribute of the root element :
```
  <element name="deliveryMapping">
    <attribute label="My custom channel identifier" name="myChannel1" xml="true"/>
  </element>
```
You can add this new attribute in the form (builtin forms are editable without problem)
Then, in a fresh new mapping, used by the deliveries of the new channel, you have to identify the address field of your target schema (like @email for nms:recipient in Email message type etc.)
