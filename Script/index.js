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
		"LayerFactory",
		"print-tool/print-ui",
		"esri/tasks/PrintTask",
		"esri/tasks/PrintParameters",
		"esri/tasks/PrintTemplate",
		"dojo/text!" + getConfigPath(),
		"dojo/domReady!"
	], function (require, esriConfig, Map, Legend, BasemapGallery, ScaleBar, LayerList, ElcControls, LayerFactory, PrintUI, PrintTask, PrintParameters, PrintTemplate, config) {
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

		(function (theMap) {
			var searchWorker, layerFactory;

			function onAddClick(evt) {
				var button = evt.target;
				button.disabled = true;
				layerFactory.createLayer({ url: button.value });
			}

			function createTableOfSearchResults(searchResults) {
				var table, item, row, cell, thumb, addButton, titleElement, snippetElement, btnGroup;

				function createOptionButtons(parent) {
					var infoButton, sublayersButton, opacityButton, span;

					// Add
					addButton = document.createElement("button");
					addButton.type = "button";
					addButton.innerText = "Add to Map";
					addButton.setAttribute("class", "btn btn-primary");
					addButton.value = item.url;
					addButton.setAttribute("data-type", item.type);
					addButton.onclick = onAddClick;
					parent.appendChild(addButton);

					// Info (this is actually a link)
					infoButton = document.createElement("a");
					infoButton.href = "http://wsdot.maps.arcgis.com/home/item.html?id=" + item.id;
					infoButton.target = "layerInfo";
					infoButton.title = "Get information about this layer";
					infoButton.setAttribute("class", "btn btn-default layer-info");
					span = document.createElement("span");
					span.setAttribute("class", "glyphicon glyphicon-info-sign");
					infoButton.appendChild(span);
					parent.appendChild(infoButton);

					// Sublayers
					sublayersButton = document.createElement("button");
					sublayersButton.title = "Control the visibility of this layer's sublayers.";
					sublayersButton.setAttribute("class", "btn btn-default layer-sublayers");
					sublayersButton.disabled = true;
					span = document.createElement("span");
					span.setAttribute("class", "glyphicon glyphicon-th-list");
					sublayersButton.appendChild(span);
					parent.appendChild(sublayersButton);

					// Opacity
					opacityButton = document.createElement("button");
					opacityButton.title = "Control the layer's opacity.";
					opacityButton.setAttribute("class", "btn btn-default layer-opacity");
					opacityButton.disabled = true;
					span = document.createElement("span");
					span.setAttribute("class", "glyphicon glyphicon-eye-close");
					opacityButton.appendChild(span);
					parent.appendChild(opacityButton);
				}

				table = document.createElement("table");
				table.setAttribute("class", "table table-condensed");
				for (var i = 0, l = searchResults.length; i < l; i += 1) {
					item = searchResults[i];
					row = table.insertRow(-1);
					cell = row.insertCell(-1);
					thumb = document.createElement("img");
					thumb.setAttribute("class", "img-responsive");
					thumb.src = item.thumbnail;
					thumb.alt = "Thumb";
					cell.appendChild(thumb);
					cell = row.insertCell(-1);
					titleElement = document.createElement("div");
					titleElement.setAttribute("class", "agol-title");
					titleElement.innerText = item.title;
					cell.appendChild(titleElement);

					snippetElement = document.createElement("p");
					snippetElement.textContent = item.snippet;
					snippetElement.setAttribute("class", "agol-snippet");
					cell.appendChild(snippetElement);

					btnGroup = document.createElement("div");
					btnGroup.classList.add("btn-group");
					cell.appendChild(btnGroup);

					createOptionButtons(btnGroup);
				}
				return table;
			}

			/**
			 * Toggles the visibility of a button's associated layer.
			 * @param {Event} evt
			 * @param {HTMLButtonElement} evt.target - The button that was clicked.
			 */
			function toggleButtonLayer(evt) {
				var button, layer, iconSpan;
				button = evt.target;
				if (button) {
					layer = theMap.getLayer(button.dataset.layerId);
					iconSpan = button.querySelector("span");
					if (layer.visible) {
						layer.hide();
						iconSpan.classList.remove("glyphicon-check");
						iconSpan.classList.add("glyphicon-unchecked");
						iconSpan.nextSibling.textContent = " Show";
					} else {
						layer.show();
						iconSpan.classList.add("glyphicon-check");
						iconSpan.classList.remove("glyphicon-unchecked");
						iconSpan.nextSibling.textContent = " Hide";
					}
				}
			}

			/**
			 * Once a layer has been loaded, change the associated button
			 * so that it toggles the layer's visibility.
			 * @param {Layer} layer
			 */
			function setupLoadedLayerControls(layer) {
				var button, span;
				button = document.querySelector("button[value='" + layer.url + "']");
				button.dataset.layerId = layer.id;
				if (button) {
					button.innerHTML = "";
					span = document.createElement("span");
					span.classList.add("glyphicon");
					span.classList.add(layer.visible ? "glyphicon-check" : "glyphicon-unchecked");
					button.appendChild(span);
					button.onclick = toggleButtonLayer;
					button.disabled = false;
					//button.innerHTML = layer.visible ? "<span class='glyphicon glyphicon-check'></span> Hide" : "<span class='glyphicon glyphicon-unchecked'></span> Show";
					button.appendChild(document.createTextNode(layer.visible ? " Hide" : " Show"));
				}
			}

			

			layerFactory = new LayerFactory();
			layerFactory.on("layer-create", function (response) {
				var layer = response.layer;
				if (layer) {
					theMap.addLayer(layer);
					setupLoadedLayerControls(layer);
				}
			});
			layerFactory.on("layer-error", function (response) {
				if (response.error) {
					console.error("layer factory error", response.error);
				}
			});
			// Start the search worker
			searchWorker = new Worker("./Script/agol/search-worker.js");
			searchWorker.addEventListener("message", function (e) {
				var resultsDiv, response, table;
				response = e.data.response;
				console.log("worker message", response);
				resultsDiv = document.getElementById("agolSearchResults");
				table = createTableOfSearchResults(response.results);
				resultsDiv.appendChild(table);
			});
			searchWorker.postMessage({ operation: "search" });
		}(map));

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

			ElcControls(document.getElementById("elcPane"), map);
		}

		// Check all of the checkboxes that have defaultVisibility data properties set to true.
		map.on("load", turnOnDefaultLayers);

		// Set up print capability.
		(function () {
			var printUI, printTask, printUrl;
			printUrl = "http://www.wsdot.wa.gov/geoservices/ArcGIS/rest/services/Utilities/PrintingTools/GPServer/Export Web Map Task";
			// Create the UI.
			printUI = new PrintUI(printUrl);
			document.getElementById("print").appendChild(printUI.form);
			document.getElementById("print").appendChild(printUI.resultsList);

			// Create the print task
			printTask = new PrintTask(printUrl);

			/**
			 * @typedef {PrintResult}
			 * @property {string} url
			 */

			/**
			 * @typedef {PrintResponse}
			 * @property {PrintResult} result
			 * @property {PrintTask} target
			 */

			/**
			 * @param {PrintResponse} response
			 */
			printTask.on("complete", function (response) {
				if (response && response.result && response.result.url) {
					printUI.addResult(response.result.url);
				}
			});

			/**
			 * @param {Error} error
			 */
			printTask.on("error", function (error) {
				console.log("print error", error);
			});

			// Setup print from submit event.
			printUI.form.onsubmit = function () {
				var printParameters = new PrintParameters();
				printParameters.map = map;
				var template = new PrintTemplate();
				template.format = "PDF";
				template.layout = printUI.getSelectedTempalteName();
				template.layoutOptions = {
					//authorText: printUI.getAuthor(),
					titleText: printUI.form.querySelector("input[name=title]").value
				};
				printParameters.template = template;

				printTask.execute(printParameters);

				return false;
			};

		}());
	});
}());