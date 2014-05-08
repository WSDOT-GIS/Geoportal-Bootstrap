/*global require*/
require(["esri/map", "esri/dijit/Legend", "esri/dijit/BasemapGallery", "dojo/domReady!"], function (Map, Legend, BasemapGallery) {
	"use strict";

	$('#tabs a').click(function (e) {
		e.preventDefault();
		$(this).tab('show');
	});

	var map, legend;

	/** Set the height of the map div.
*/
	function setMapDivHeight() {
		var topNavBar, mapDiv, desiredHeight;

		topNavBar = document.getElementById("topNavBar");
		mapDiv = document.getElementById("map");

		desiredHeight = window.innerHeight - topNavBar.clientHeight - 40;

		mapDiv.style.height = [desiredHeight, "px"].join("");

		//if (map) {
		//	map.resize();
		//}
	}

	setMapDivHeight();

	window.addEventListener("resize", setMapDivHeight, true);
	window.addEventListener("deviceorientation", setMapDivHeight, true);

	map = new Map("map", {
		basemap: "hybrid",
		center: [-120.80566406246835, 47.41322033015946],
		zoom: 7,
		showAttribution: true
	});

	map.on("load", function () {
		var basemapGallery = new BasemapGallery({
			map: map,
			basemapIds: map.layerIds
		}, "basemapGallery");
		basemapGallery.startup();
	});

	legend = new Legend({ map: map }, "legendWidget");
	legend.startup();


});
