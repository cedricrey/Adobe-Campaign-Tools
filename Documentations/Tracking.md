### Download TrackingLogs
## Diffrence between -indicators and -updade options for 'nlserver tracking' command

-indicators will recompute the nms:delivery indicators (mostly into [indicators/*] sub element
-update will recompute stats into the nms:trackingStats table AND the indicators as '-indicators' command

We can just download the trackingLogs from tracking server instance just by applying -download command without -update command. It will run faster but won't update indicators
