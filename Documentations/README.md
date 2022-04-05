
### $(vars) : Xtk:form and workflow activities variables
You can uses vars in forms and severals activities like queries or enrich with the syntax :
```
$(vars/something)
```

But there are variants with this syntax :
```
$long( X ) : force the variable to be a long
$datetime( X ) : force the varibale to be a datetime
$int64( X ) : force the variable to be a 64bits interger
$noescaping( X ) : Most ineresting : avoid the escaping protection. For example, if you want to use the "IN" or "NOT IN" operator, it won't work with "@myCol IN $(vars/myvar)" because $(vars/myvar) will be protected ('my','value','as','list' become ''my','value','as','list''...). But it will work with $noescaping(vars/myvar)
$memo( X ) : I guess it will allows very long string (like memo) ?
$date( X )  : force the varibale to be a datetime
$string( X ) ...
```
