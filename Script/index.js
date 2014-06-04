/*global require*/
require([
	"require",
	"esri/map",
	"esri/dijit/Legend",
	"esri/dijit/BasemapGallery",
	"layerList",
	"dojo/domReady!"
], function (require, Map, Legend, BasemapGallery, LayerList) {
	"use strict";

	$('#tabs a').click(function (e) {
		e.preventDefault();
		$(this).tab('show');
	});

	$("[data-toggle=offcanvas]").click(function () {
		$(".row-offcanvas").toggleClass('active');
	});

	var map, legend;

	/** Set the height of the map div.
*/
	function setMapDivHeight() {
		var topNavBar, mapDiv, desiredHeight, sidebarDiv;

		topNavBar = document.getElementById("topNavBar");
		mapDiv = document.getElementById("map");
		sidebarDiv = document.getElementById("sidebar");

		desiredHeight = window.innerHeight - topNavBar.clientHeight - 40;
		desiredHeight = [desiredHeight, "px"].join("");

		mapDiv.style.height = desiredHeight;
		sidebarDiv.style.height = desiredHeight;

		var tabPanes = document.querySelectorAll(".tab-pane");

		desiredHeight = window.innerHeight - topNavBar.clientHeight - 80;
		desiredHeight = [desiredHeight, "px"].join("");

		for (var i = 0, l = tabPanes.length; i < l; i += 1) {
			tabPanes[i].style.height = desiredHeight;
		}
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

	map.on("update-start", function () {
		document.getElementById("progressBar").hidden = false;
	});

	map.on("update-end", function () {
		document.getElementById("progressBar").hidden = true;
	});

	legend = new Legend({ map: map }, "legendWidget");
	legend.startup();

	var layerList = LayerList.createLayerList(map, [
		{
			"url": "http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/CityLimits/MapServer",
			"type": "ArcGISTiledMapServiceLayer",
			"id": "city_limits",
			"title": "City Limits"
		},
		{
			"url": "http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/CongressionalDistricts/MapServer",
			"type": "ArcGISDynamicMapServiceLayer",
			"id": "congressional_districts",
			"title": "Congressional Districts"
		}
	]);

	document.getElementById("layers").appendChild(layerList);

});
