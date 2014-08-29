/*global define*/
define([
	"dojo/promise/all",
	"dojo/Deferred",
	"esri/request",
	"esri/tasks/IdentifyTask",
	"esri/tasks/IdentifyParameters",
	"esri/InfoTemplate"
], function (all, Deferred, esriRequest, IdentifyTask, IdentifyParameters, InfoTemplate) {

	// Matches a map service or map service layer URL.
	// Match results: [full-match, map-server-url, layer-id or undefined]
	var serverUrlRe = /((?:https?\:)?\/\/.+\/(?:(?:Map)|(?:Feature))Server)(?:\/(\d+))?/;

	function MapIdentifyTask(map, tolerance, ignoredUrls) {
		this.map = map;
		this.tolerance = typeof tolerance === "number" ? tolerance : 5;
		this._tasks = {};
		this.ignoredUrls = ignoredUrls || null;
		////this._htmlPopupTypes = {};
	}


	function TaskIdPair(task, id) {
		/** @property {esri/tasks/IdentifyTask} */
		this.task = task;
		/** @property {(number|null)} */
		this.id = typeof id !== "number" ? null : id;
	}

	/**
	 * Creates either an Identify or Query task. The type of task depends on the input layer type.
	 * @param {esri/layers/Layer} layer
	 * @returns {TaskIdPair}
	 */
	function createIdentifyTaskForLayer(layer) {
		var task, id, match, output;
		if (layer.url) {
			match = layer.url.match(serverUrlRe);
			if (match) {
				task = new IdentifyTask(match[1]);
				if (match[2]) {
					id = Number(match[2]);
				}
				output = new TaskIdPair(task, id);
			} else {
				throw new Error("layer does not have a valid URL");
			}
		}
		return output;
	}

	// TODO: Check to see if layers actually SUPPORT identify.
	// TODO: Use services' HTML popups if they have them.

	////function requestLayerInfo(layer) {
	////	var deferred = new Deferred();
	////	var url = typeof layer === "string" ? layer : layer.url || null;
	////	if (!url) {
	////		deferred.reject({ message: "Could not deterine URL", layer: layer });
	////	}
	////	if (urlIsMapServerLayer(layer.url)) {
	////		esriRequest({
	////			url: layer.url,
	////			content: {
	////				f: "json"
	////			}
	////		}).then(function (response) {
	////			deferred = response;
	////		});
	////	} else if (urlIsMapServer(layer.url)) {
	////		// TODO: Query all non-group sublayers.
	////		throw new Error("Not implemented");
	////	}

	////	return deferred;
	////}

	////MapIdentifyTask.prototype.getHtmlPopupTypeForLayer = function (layer) {
	////	var deferred;
	////	if (this._htmlPopupTypes[layer.id]) {
	////		deferred = new Deferred();
	////		deferred.resolve(this._htmlPopupTypes[layer.id]);
	////	} else {
	////		deferred = requestHtmlPopupType(layer);
	////	}

	////	return deferred;
	////};

	/**
	 * Gets a task for the specified layer. If corresponding task does not yet exist,
	 * it will be created.
	 * @param {esri/layers/Layer} layer
	 * @returns {(esri/tasks/IdentifyTask|esri/tasks/QueryTask)}
	 */
	MapIdentifyTask.prototype._getTaskForLayer = function (layer) {
		var task;
		// Create an identify task for this layer if it does not already exist.
		if (!this._tasks.hasOwnProperty(layer.id)) {
			task = createIdentifyTaskForLayer(layer);
			if (task) {
				// Store the task.
				this._tasks[layer.id] = task;
			}
		}

		return this._tasks[layer.id];
	};

	MapIdentifyTask.prototype.createIdentifyParametersForLayer = function (layer, geometry, id) {
		var parameters = new IdentifyParameters();
		parameters.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
		parameters.returnGeometry = true;
		parameters.tolerance = this.tolerance;
		// Set propetries of map.
		parameters.mapExtent = this.map.extent;
		parameters.width = this.map.width;
		parameters.height = this.map.height;
		parameters.geometry = geometry;
		if (typeof id === "number") {
			parameters.layerIds = [id];
		}
		return parameters;
	};

	MapIdentifyTask.prototype._identifyForLayer = function (layer, geometry) {
		var taskIdPair = this._getTaskForLayer(layer);
		var task, idParams, output;
		if (taskIdPair) {
			task = taskIdPair.task;
			idParams = this.createIdentifyParametersForLayer(layer, geometry, taskIdPair.id);
			output = task.execute(idParams);
		}
		return output || null;
	};

	/**
	 * @typedef {Object.<string, IdentifyResult[]>} MapIdentifyResults
	 * The property names correspond to the layer ids of layers in the map.
	 */

	/**
	 * Runs an Identify operation on all visible layers in the map.
	 * @returns {MapIdentifyResults}
	 */
	MapIdentifyTask.prototype.identify = function (geometry) {
		var output = {};
		var visibleLayers = this.map.getLayersVisibleAtScale();
		var self = this;

		visibleLayers.forEach(function (layer) {
			var def;
			if (!self.ignoredUrls || !self.ignoredUrls.test(layer.url)) {
				def = self._identifyForLayer(layer, geometry);
				if (def) {
					output[layer.id] = def;
				}
			}
		});


		return all(output);
	};


	function createTableFromGraphic(graphic) {
		var output = ["<table>"];
		for (var name in graphic.attributes) {
			if (graphic.attributes.hasOwnProperty(name)) {
				output.push("<tr><th>", name, "</th><td>", graphic.attributes[name], "</td></tr>");
			}
		}
		output.push("</table>");
		return output.join("");
	}

	var defaultInfoTemplate = new InfoTemplate();
	defaultInfoTemplate.setContent(createTableFromGraphic);
	MapIdentifyTask.defaultInfoTemplate = defaultInfoTemplate;

	function getFeatureFromIdResult(idResult) {
		var feature = null;
		if (idResult && idResult.feature) {
			feature = idResult.feature;
			if (!feature.infoTemplate) {
				feature.infoTemplate = defaultInfoTemplate;
			}
		}
		return feature;
	}


	/**
	 * Converts the results of MapIdentifyTask.identify into an array of graphics.
	 * @param {MapIdentifyResults} results
	 * @returns {esri/Graphic[]}
	 */
	MapIdentifyTask.resultsToGraphics = function (results) {
		var idResultsArray, output;
		for (var layerName in results) {
			if (results.hasOwnProperty(layerName)) {
				idResultsArray = results[layerName];
				idResultsArray = idResultsArray.map(getFeatureFromIdResult);
				output = output ? output.concat(idResultsArray) : idResultsArray;
			}
		}
		return output || null;
	};

	return MapIdentifyTask;
});