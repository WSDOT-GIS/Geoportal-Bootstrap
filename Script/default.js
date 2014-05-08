/*global require*/
require(["esri/map", "dojo/domReady!"], function (Map) {
	"use strict";

	var map;
	map = new Map("map", {
		center: [-56.049, 38.485],
		zoom: 3,
		basemap: "streets"
	});
});
