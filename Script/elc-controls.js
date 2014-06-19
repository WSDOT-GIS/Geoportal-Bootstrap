/*global define*/
define([
	"esri/graphic",
	"esri/geometry/jsonUtils",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleMarkerSymbol",
	"elc",
], function (Graphic, geometryJsonUtils, GraphicsLayer, SimpleRenderer, SimpleMarkerSymbol, Elc) {
	"use strict";

	// Setup ELC controls
	function ElcControls(map) {
		var elc = new Elc.RouteLocator();
		var pointsLayer, linesLayer;
		var findRouteLocationForm = document.forms.findRouteLocation, findNearestRouteLocationForm = document.forms.findNearestRouteLocation;

		var mpTypeRadios = findRouteLocationForm["mp-type"];
		var gTypeRadios = findRouteLocationForm["geometry-type"];

		// Setup the layers.
		(function () {
			var pointRenderer, pointSymbol;
			pointsLayer = new GraphicsLayer({
				id: "elcPoints"
			});

			pointSymbol = new SimpleMarkerSymbol().setColor("green");
			pointRenderer = new SimpleRenderer(pointSymbol);
			pointsLayer.setRenderer(pointRenderer);

			linesLayer = new GraphicsLayer({
				id: "elcLines",
				className: "elc-lines",
				styling: false
			});

			map.addLayers([pointsLayer, linesLayer]);
		}());

		function routeLocationToGraphic(routeLocation) {
			var graphic = null, geometry;
			if (routeLocation) {
				geometry = geometryJsonUtils.fromJson(routeLocation.RouteGeometry);
				graphic = new Graphic(geometry);
			}
			return graphic;
		}

		function addResultToMap(routeLocations) {
			// TODO: Implement.
			var graphic;
			for (var i = 0; i < routeLocations.length; i++) {
				graphic = routeLocationToGraphic(routeLocations[i]);
				if (graphic && graphic.geometry) {
					if (graphic.geometry.x) {
						pointsLayer.add(graphic);
					} else {
						linesLayer.add(graphic);
					}
				}
			}
		}

		/**
			* Adds or removes the "mp-type-arm" class to the form based on the value of the ARM / SRMP radio buttons.
			*/
		function setFormMPType() {
			var mpType = findRouteLocationForm.querySelector("[name='mp-type']:checked").value;
			var mpClass = "mp-type-arm";
			if (mpType === "ARM") {
				findRouteLocationForm.classList.add(mpClass);
			} else {
				findRouteLocationForm.classList.remove(mpClass);
			}
		}

		/**
			* Adds or removes the "geometry-type-point" class to the form based on the which geometry type radio button is checked.
			*/
		function setGeometryType() {
			var gType = findRouteLocationForm.querySelector("[name='geometry-type']:checked").value;
			var gClass = "geometry-type-point";
			if (gType === "point") {
				findRouteLocationForm.classList.add(gClass);
			} else {
				findRouteLocationForm.classList.remove(gClass);
			}
		}

		// Populates the route suggestion list for the input box.
		elc.getRouteList(function (routeList) {
			var routeListElement, docFrag;
			if (routeList && routeList.Current && routeList.Current.length) {
				routeListElement = document.getElementById("routeList");
				docFrag = document.createDocumentFragment();
				routeList.Current.forEach(function (/**{Elc.Route}*/ route) {
					var option = document.createElement("option");
					option.value = route.name;
					docFrag.appendChild(option);
				});
				routeListElement.appendChild(docFrag);
			}
		}, function (error) {
			console.error("Error loading route list", error);
		}, true);

		setFormMPType();
		setGeometryType();

		// Setup click events for radio buttons.
		var i, l;

		for (i = 0, l = mpTypeRadios.length; i < l; i += 1) {
			mpTypeRadios[i].onchange = setFormMPType;
		}

		for (i = 0, l = gTypeRadios.length; i < l; i += 1) {
			gTypeRadios[i].onchange = setGeometryType;
		}

		findRouteLocationForm.onsubmit = function () {

			var routeLocation, mpType, form = this, milepost, gType, endMP, isSrmp;

			mpType = form["mp-type"].value;
			gType = form["geometry-type"].value;
			milepost = parseFloat(form.milepost.value);
			isSrmp = mpType === "SRMP";

			routeLocation = new Elc.RouteLocation({
				Route: form.route.value,
				Arm: !isSrmp ? milepost : null,
				Srmp: isSrmp ? milepost : null,
				Back: isSrmp ? form["is-back"].checked : null
			});

			if (gType === "line") {
				endMP = parseFloat(form["end-milepost"].value);
				if (isSrmp) {
					routeLocation.EndSrmp = endMP;
					routeLocation.EndBack = form["end-is-back"].checked;
				} else {
					routeLocation.EndArm = endMP;
				}
			}

			var rlParams = {
				locations: [routeLocation],
				referenceDate: form["reference-date"].value,
				outSR: map.spatialReference.wkid,
				successHandler: function (/**{Elc.RouteLocation[]}*/ routeLocations) {
					addResultToMap(routeLocations);
				},
				errorHandler: function (error) {
					console.error(error);
				},
				useCors: true
			};

			elc.findRouteLocations(rlParams);

			// Return false to prevent the page from reloading.
			return false;
		};

		// Add an event handler for reset.
		// Must programatically "click" the unchecked default radio buttons. Otherwise user will have to click "Reset" button twice.
		findRouteLocationForm.addEventListener("reset", function () {
			var defaultRadios = this.querySelectorAll("[value='SRMP']:not(:checked),[value='point']:not(:checked)");
			for (var i = 0, l = defaultRadios.length; i < l; i += 1) {
				defaultRadios[i].click();
			}
		});

		findNearestRouteLocationForm.onsubmit = function () {
			// Return false to prevent the page from reloading.
			return false;
		};
	}

	return ElcControls;
});