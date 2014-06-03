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
		/** Creates the layer options div.
		 * @param {esri/layers/Layer} layer
		 * @returns {HTMLDivElement}
		 */
		function createLayerOptions(layer) {

			/*
			<div class="layer-options">
				<label>opacity</label> <input type="range" min="0" max="1" step="0.1" value="1" />
			</div>
			 */
			var div = document.createElement("div");
			div.classList.add("layer-options");
			div.classList.add("well");
			var label = document.createElement("label");
			label.textContent = "Opacity";
			var slider = document.createElement("input");
			slider.type = "range";
			slider.min = 0;
			slider.max = 1;
			slider.step = 0.1;
			slider.value = layer.opacity;
			div.appendChild(label);
			div.appendChild(slider);

			slider.onchange = function () {
				layer.setOpacity(slider.value);
			};

			return div;
		}

		/**
		 * Creates the link to toggle the layer options div's visiblitly.
		 * @param {HTMLDivElement} optionsDiv - The div that will have it's visibility controlled by this link.
		 * @returns {HTMLAnchorElement}
		 */
		function createOptionsToggleLink(optionsDiv) {
			var link, span;
			if (!optionsDiv) {
				throw new TypeError("Options div was not provided.");
			}
			link = document.createElement("a");
			link.href = "#";
			span = document.createElement("span");
			span.classList.add("glyphicon");
			span.classList.add("glyphicon-collapse-up");
			link.appendChild(span);

			link.onclick =  function () {
				if (span.classList.contains("glyphicon-collapse-up")) {
					span.classList.remove("glyphicon-collapse-up");
					span.classList.add("glyphicon-collapse-down");
					optionsDiv.classList.add("hidden");
				} else {
					span.classList.remove("glyphicon-collapse-down");
					span.classList.add("glyphicon-collapse-up");
					optionsDiv.classList.remove("hidden");
				}
				return false;
			};

			return link;
		}

		function createListItem(layerInfos, id) {
			var layerInfo = layerInfos[id], li, ul;
			// Create the output list item.
			li = document.createElement("li");
			// Add class for bootstrap styling.
			li.classList.add("list-group-item");
			// Add sublayer lists.
			// Set data-has-sublayers.
			if (layerInfo.subLayerIds && layerInfo.subLayerIds.length) {
				ul = document.createElement("ul");
				// Add class for bootstrap styling.
				ul.classList.add("list-group");
				// For each child layer id, make a recursive call to this function.
				layerInfo.forEach(function (layerId) {
					var subli = createListItem(layerInfos, layerId);
					ul.appendChild(subli);
				});
			}
			var label = document.createElement("label");
			var checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.checked = layerInfo.defaultVisibility;
			//checkbox.dataset.layerId = id;
			checkbox.value = id;
			checkbox.dataset.subLayerIds = layerInfo.subLayerIds ? layerInfo.subLayerIds.join(",") : "";
			checkbox.dataset.parentLayerId = layerInfo.parentLayerId === -1 ? "" : layerInfo.parentLayerId;
			label.appendChild(checkbox);
			// label.textContent = layerInfo.name;
			var labelText = document.createElement("span");
			labelText.textContent = layerInfo.name;
			label.appendChild(labelText);
			li.appendChild(label);
			if (ul) {
				li.appendChild(ul);
			}
			return li;
		}

		/**
		 * Creates a div with sublayer list.
		 * @param {esri/layers/Layer} layer
		 * @returns {HTMLDivElement}
		 */
		function createSublayerDiv(layer) {
			var div = null, ul, applyButton;



			if (layer.setVisibleLayers && layer.layerInfos) {
				div = document.createElement("div");
				div.setAttribute("class", "well sublayer-list");
				ul = document.createElement("ul");
				ul.classList.add("list-group");

				layer.layerInfos.forEach(function (layerInfo) {
					/*jshint eqnull:true*/
					if (layerInfo.parentLayerId < 0) {
						ul.appendChild(createListItem(layer.layerInfos, layerInfo.id));
					}
					/*jshint eqnull:false*/
				});
				div.appendChild(ul);
				applyButton = document.createElement("button");
				applyButton.type = "button";
				applyButton.innerText = "Apply";
				applyButton.classList.add("btn");
				div.appendChild(applyButton);

				applyButton.onclick = function () {
					// Select all checked checkboxes without a sublayer ID.
					var checkboxes = ul.querySelectorAll("input[data-sub-layer-ids='']:checked");
					// Get the sublayer IDs.
					var sublayers = [];
					for (var i = 0, l = checkboxes.length; i < l; i += 1) {
						sublayers.push(parseInt(checkboxes[i].value, 10));
					}
					if (sublayers.length < 1) {
						sublayers.push(-1);
					}
					layer.setVisibleLayers(sublayers);
				};
			}

			return div;
		}

		/** Toggles a layers visibility.
		 * The first time the checkbox is checked, the corresponding layer will be created and added to the map.
		 * @param {Event} e
		 * @this {HTMLInputElement} - The clicked checkbox.
		 */
		function toggleLayer(e) {
			var checkbox, layerId, layer, listItem, checkboxLabel;
			checkbox = e.currentTarget;
			checkboxLabel = checkbox.parentElement;
			// Get the li that contains the checkbox.
			listItem = checkboxLabel.parentElement;

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
					if (checkbox.dataset.layerType === "ArcGISTiledMapServiceLayer") {
						layer = new ArcGISTiledMapServiceLayer(checkbox.dataset.url, {
							id: checkbox.dataset.layerId
						});
					} else if (checkbox.dataset.layerType === "ArcGISDynamicMapServiceLayer") {
						layer = new ArcGISDynamicMapServiceLayer(checkbox.dataset.url, {
							id: checkbox.dataset.layerId
						});
					}
					if (layer) {
						map.addLayer(layer);
						layer.on("load", function () {
							// Add the layer options section.
							var optionsDiv, link, sublayerLabel, sublayerDiv;
							optionsDiv = createLayerOptions(layer);
							link = createOptionsToggleLink(optionsDiv);
							checkboxLabel.appendChild(link);
							sublayerDiv = createSublayerDiv(layer);
							if (sublayerDiv) {
								sublayerLabel = document.createElement("label");
								sublayerLabel.innerText = "Sublayers";
								optionsDiv.appendChild(sublayerLabel);
								optionsDiv.appendChild(sublayerDiv);
							}
							listItem.appendChild(optionsDiv);
						});
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
	}()); // End setup layer list.
});
