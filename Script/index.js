/*global require*/
require([
	"esri/map",
	"esri/dijit/Legend",
	"esri/dijit/BasemapGallery",
	"esri/layers/ArcGISTiledMapServiceLayer",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"dojo/domReady!"
], function (Map, Legend, BasemapGallery, ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer) {
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

	legend = new Legend({ map: map }, "legendWidget");
	legend.startup();

	// Setup layer list
	(function () {

		/**
		 * @param {Event} e
		 * @this {HTMLInputElement} - The clicked checkbox.
		 */
		function toggleLayer(e) {
			var checkbox, layerId, layer;
			checkbox = e.currentTarget;
			layerId = checkbox.dataset.layerId;
			layer = map.getLayer(layerId);
			if (layer) {
				if (checkbox.checked) {
					layer.show();
				} else {
					layer.hide();
				}
			} else {
				if (checkbox.checked) {
					// Create the layer and add it to the map.
					if (checkbox.dataset.layerType === "ArcGISTiledMapService") {
						layer = new ArcGISTiledMapServiceLayer(checkbox.dataset.url, {
							id: checkbox.dataset.layerId
						});
					} else if (checkbox.dataset.layerType === "ArcGISTiledMapService") {
						layer = new ArcGISDynamicMapServiceLayer(checkbox.dataset.url, {
							id: checkbox.dataset.layerId
						});
					}
					if (layer) {
						map.addLayer(layer);
					}
				}
			}
		}

		var layerListDiv, checkboxes, checkbox;

		layerListDiv = document.getElementById("layerList");
		checkboxes = layerListDiv.querySelectorAll("[type='checkbox']");
		// Attach click event handler to checkboxes.
		for (var i = 0, l = checkboxes.length; i < l; i += 1) {
			checkbox = checkboxes[i];
			checkbox.addEventListener("click", toggleLayer);
		}
	}());
});
