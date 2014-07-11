/*global require*/
(function () {
	/**
	 * Gets the path to the configuration file from the `config` query string parameter.
	 * Returns a default config path if `config` is not provided.
	 * @returns {string}
	 */
	function getConfigPath() {
		// Get the config parameter.
		var query = window.location.search;
		var configRe = /\bconfig=([^&]+)/i;
		var config = "default";
		var configMatch;
		if (query) {
			configMatch = query.match(configRe);
			if (configMatch) {
				config = configMatch[1];
			}
		}
		config = ["./configurations/", config, ".json"].join("");
		return config;
	}

	require([
		"require",
		"esri/config",
		"esri/map",
		"esri/dijit/Legend",
		"esri/dijit/BasemapGallery",
		"esri/dijit/Scalebar",
		"layerList",
		"elc-controls",
		"dojo/text!" + getConfigPath(),
		"dojo/domReady!"
	], function (require, esriConfig, Map, Legend, BasemapGallery, ScaleBar, LayerList, ElcControls, config) {
		"use strict";
		var map, legend, layerList;

		// Add to the list of CORS enabled servers.
		(function (servers) {
			servers.push("wsdot.wa.gov");
		}(esriConfig.defaults.io.corsEnabledServers));

		config = JSON.parse(config);

		// Setup the Bootstrap tabs.
		$('#tabs a').click(function (e) {
			e.preventDefault();
			$(this).tab('show');
		});

		// Setup the off-canvas toggle button for smaller screens.
		$("[data-toggle=offcanvas]").click(function () {
			$(".row-offcanvas").toggleClass('active');
		});

		/** 
		 * Set the height of the map div.
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

		// Setup map resizing code handlers for when the browser is resized or the device is rotated.
		setMapDivHeight();
		window.addEventListener("resize", setMapDivHeight, true);
		window.addEventListener("deviceorientation", setMapDivHeight, true);

		map = new Map("map", {
			"lods": [{
				"level": 0,
				"resolution": 156543.033928,
				"scale": 591657527.591555
			}, {
				"level": 1,
				"resolution": 78271.5169639999,
				"scale": 295828763.795777
			}, {
				"level": 2,
				"resolution": 39135.7584820001,
				"scale": 147914381.897889
			}, {
				"level": 3,
				"resolution": 19567.8792409999,
				"scale": 73957190.948944
			}, {
				"level": 4,
				"resolution": 9783.93962049996,
				"scale": 36978595.474472
			}, {
				"level": 5,
				"resolution": 4891.96981024998,
				"scale": 18489297.737236
			}, {
				"level": 6,
				"resolution": 2445.98490512499,
				"scale": 9244648.868618
			},
			// Start
			{
				"level": 7,
				"resolution": 1222.99245256249,
				"scale": 4622324.434309
			}, {
				"level": 8,
				"resolution": 611.49622628138,
				"scale": 2311162.217155
			}, {
				"level": 9,
				"resolution": 305.748113140558,
				"scale": 1155581.108577
			}, {
				"level": 10,
				"resolution": 152.874056570411,
				"scale": 577790.554289
			}, {
				"level": 11,
				"resolution": 76.4370282850732,
				"scale": 288895.277144
			}, {
				"level": 12,
				"resolution": 38.2185141425366,
				"scale": 144447.638572
			}, {
				"level": 13,
				"resolution": 19.1092570712683,
				"scale": 72223.819286
			}, {
				"level": 14,
				"resolution": 9.55462853563415,
				"scale": 36111.909643
			}, {
				"level": 15,
				"resolution": 4.77731426794937,
				"scale": 18055.954822
			}, {
				"level": 16,
				"resolution": 2.38865713397468,
				"scale": 9027.977411
			}, {
				"level": 17,
				"resolution": 1.19432856685505,
				"scale": 4513.988705
			}, {
				"level": 18,
				"resolution": 0.597164283559817,
				"scale": 2256.994353
			}, {
				"level": 19,
				"resolution": 0.298582141647617,
				"scale": 1128.497176
			}],
			minZoom: 7,
			maxZoom: 19,
			center: [-120.80566406246835, 47.41322033015946],
			zoom: 7,
			showAttribution: true
		});

		(new ScaleBar({
			map: map,
			attachTo: "bottom-left",
			scalebarUnit: "dual"
		}));

		var basemapGallery = new BasemapGallery({
			map: map,
			basemapIds: map.layerIds
		}, "basemapGallery");
		basemapGallery.startup();

		basemapGallery.on("load", function () {
			var i, l, basemap;
			if (config.defaultBasemap) {
				for (i = 0, l = basemapGallery.basemaps.length; i < l; i += 1) {
					basemap = basemapGallery.basemaps[i];
					if (basemap.title === config.defaultBasemap) {
						basemapGallery.select(basemap.id);
						break;
					}
				}
			}
		});

		map.on("update-start", function () {
			document.getElementById("progressBar").hidden = false;
		});

		map.on("update-end", function () {
			document.getElementById("progressBar").hidden = true;
		});

		legend = new Legend({ map: map }, "legendWidget");
		legend.startup();

		layerList = LayerList.createLayerList(map, config.operationalLayers);
		document.getElementById("layers").appendChild(layerList);

		/**
		 * Check all of the checkboxes that have defaultVisibility data properties set to true.
		 */
		function turnOnDefaultLayers() {
			var checkboxes = layerList.querySelectorAll("[data-default-visibility]");
			if (checkboxes && checkboxes.length) {
				for (var i = 0, l = checkboxes.length; i < l; i += 1) {
					checkboxes[i].click();
				}
			}

			ElcControls(map);
		}

		// Check all of the checkboxes that have defaultVisibility data properties set to true.
		map.on("load", turnOnDefaultLayers);

	});
}());