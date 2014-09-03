﻿/*global define*/
define([
	"dojo/promise/all",
	"dojo/Deferred",
	"esri/request",
	"esri/tasks/IdentifyTask",
	"esri/tasks/IdentifyParameters"
], function (all, Deferred, esriRequest, IdentifyTask, IdentifyParameters) {

	/**
	 * A module that creates MapIdentifyTasks.
	 * @module MapIdentifyTask
	 */

	/**
	 * @external dojo/promise/Promise
	 * @see {@link http://dojotoolkit.org/reference-guide/1.10/dojo/promise/Promise.html dojo/promise/Promise
	 */

	/**
	 * @external Deferred
	 * @see {@link http://dojotoolkit.org/reference-guide/dojo/Deferred.html Deferred}
	 */

	/**
	 * @external Geometry
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/geometry-amd.html Geometry}
	 */

	/**
	 * @external Graphic
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/graphic-amd.html Graphic}
	 */

	/**
	 * @external IdentifyParameters
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/identifyparameters-amd.html IdentifyParameters}
	 */

	/**
	 * @external IdentifyResult
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/identifyresult-amd.html IdentifyResult}
	 */

	/**
	 * @external IdentifyTask
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/identifytask-amd.html IdentifyTask}
	 */

	/**
	 * @external Layer
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/layer-amd.html Layer}
	 */

	/**
	 * @external Map
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/map-amd.html Map}
	 */

	/**
	 * @external RestApiLayer
	 * @see {@link http://resources.arcgis.com/en/help/arcgis-rest-api/#/Layer_Table/02r3000000zr000000/ Layer / Table}
	 */


	// Matches a map service or map service layer URL.
	// Match results: [full-match, map-server-url, layer-id or undefined]
	var serverUrlRe = /((?:https?\:)?\/\/.+\/(?:(?:Map)|(?:Feature))Server)(?:\/(\d+))?/;

	/**
	 * A task that will execute multiple IdentifyTasks for the layers in a map.
	 * @constructor
	 * @param {external:Map} map
	 * @param {number} [tolerance=5]
	 * @param {RegExp} [ignoredUrls=null] - Any map services with URLs that match this RegExp will not participate in the map's Identify operation.
	 */
	function MapIdentifyTask(map, tolerance, ignoredUrls) {
		/** @member {external:Map} */
		this.map = map;
		/** @member {number} */
		this.tolerance = typeof tolerance === "number" ? tolerance : 5;
		/** @member {Object.<string, TaskIdPair>} */
		this._tasks = {};
		/** @member {RegExp} */
		this.ignoredUrls = ignoredUrls || null;
		/** @member {Object.<string, ({RestApiLayer}|{Object.<string, RestApiLayer>})>}*/
		this._layerInfos = {};
	}

	/**
	 * A pair of task and optional layer ID. A layer ID will only be present for layer types where 
	 * that would be applicable (e.g., FeatureLayer but not ArcGISDynamicMapServiceLayer).
	 * @constructor
	 * @param {external:IdentifyTask} task
	 * @param {?number} [id] - Only certain layer types (e.g., FeatureLayer) will have an ID value.
	 */
	function TaskIdPair(task, id) {
		/** @member {external:IdentifyTask} */
		this.task = task;
		/** @member {?number} */
		this.id = typeof id !== "number" ? null : id;
	}

	/**
	 * Creates either an Identify or Query task. The type of task depends on the input layer type.
	 * @param {external:Layer} layer
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

	/**
	 * Gets information about a layer from the REST API.
	 * @param {external:Layer} layer
	 * @returns {external:dojo/promise/Promise}
	 */
	function requestLayerInfo(layer) {
		var promise;
		var url = typeof layer === "string" ? layer : layer.url || null;
		var match;
		var deferreds;
		if (!url) {
			promise = new Deferred();
			promise.reject({ message: "Could not deterine URL", layer: layer });
		}
		else {
			match = url.match(serverUrlRe);
			// URL is for a map service sub layer.
			if (match) { // Valid map service or map service layer URL.
				if (match[2]) { // Layer ID is part of URL.
					promise = new Deferred();
					esriRequest({
						url: url,
						content: {
							f: "json"
						}
					}).then(function (result) {
						result.url = url;
						promise.resolve(result);
					}, function (error) {
						promise.reject(error);
					});
				} else if (layer.layerInfos) {
					deferreds = {};
					layer.layerInfos.forEach(function (layerInfo) {
						var subUrl, subDeferred;
						if (!layerInfo.subLayerIds) { // Only non-group layers...
							// Create the sublayer's URL.
							subUrl = [url, layerInfo.id].join("/");
							// Request the information about the sublayer's URL.
							// Keyed by layerID_sublayerID. (E.g., "mylayer_0": {Promise object})
							subDeferred = new Deferred();
							deferreds[String(layerInfo.id)] = subDeferred;

							esriRequest({
								url: subUrl,
								content: {
									f: "json"
								}
							}).then(function (result) {
								result.url = subUrl;
								subDeferred.resolve(result);
							}, function (err) {
								subDeferred.reject(err);
							});
						}
					});
					promise = new Deferred();
					all(deferreds).then(function (response) {
						// Convert object with property names that are numbers as string into an array.
						var output = [], re = /\d+$/, match;
						for (var propName in response) {
							if (response.hasOwnProperty(propName)) {
								match = propName.match(re);
								if (match) {
									output[Number(match[0])] = response[propName];
								}
							}
						}
						promise.resolve(output);
					}, function (error) {
						promise.reject(error);
					});
				}
			}
		}

		// If the promise return object has not been initialized, create one and then reject it.
		if (!promise) {
			promise = new Deferred();
			promise.reject({
				message: "Could not retrieve information about the layer.",
				layer: layer
			});
		}

		return promise;
	}

	/**
	 * 
	 * @param {external:Layer} layer
	 * @returns {external:dojo/promise/Promise}
	 */
	MapIdentifyTask.prototype.getLayerInfo = function (layer) {
		var promise, self = this;
		if (self._layerInfos[layer.id]) {
			promise = new Deferred();
			promise.resolve(self._layerInfos[layer.id]);
		} else {
			promise = requestLayerInfo(layer);
			promise.then(function (/** {(RestApiLayer)|(Object.<string, RestApiLayer>)} */ response) {
				self._layerInfos[layer.id] = response;
			});
		}

		return promise;
	};

	/**
	 * Gets a task for the specified layer. If corresponding task does not yet exist,
	 * it will be created.
	 * @param {external:Layer} layer
	 * @returns {TaskIdPair}
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

	/**
	 * Creates identify parameters for a given map service layer and geometry.
	 * @param {external:Layer} layer
	 * @param {external:Geometry} geometry
	 * @param {number} [id] - For feature layers, sublayer ID.
	 * @returns {external:IdentifyParameters}
	 */
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

	/**
	 * Runs the corresponding Identify task for a map service layer.
	 * @param {external:Layer} layer
	 * @param {external:Geometry} geometry
	 * @returns {external:Deferred}
	 */
	MapIdentifyTask.prototype._identifyForLayer = function (layer, geometry) {
		var taskIdPair = this._getTaskForLayer(layer);
		var task, idParams, output, taskDeferred, layerInfoDeferred, promise;
		if (taskIdPair) {
			task = taskIdPair.task;
			idParams = this.createIdentifyParametersForLayer(layer, geometry, taskIdPair.id);
			taskDeferred = task.execute(idParams);
			layerInfoDeferred = this.getLayerInfo(layer);
			output = new Deferred();
			promise = all({
				layerInfo: layerInfoDeferred,
				results: taskDeferred
			}).then(function (response) {
				var layerInfos = response.layerInfo;
				// Loop through all identify results.
				// Add associated layer info to the results object.
				response.results.forEach(function (result) {
					var layerInfo = layerInfos[result.layerId];
					if (layerInfo) {
						result.layerInfo = layerInfo;
					}
				});
				output.resolve(response.results);
			}, function (error) {
				output.reject(error);
			});
		}
		return output || null;
	};

	/**
	 * @typedef {Object.<string, external:IdentifyResult[]>} MapIdentifyResults
	 * The property names correspond to the layer ids of layers in the map.
	 */

	/**
	 * Runs an Identify operation on all visible layers in the map.
	 * @returns {external:dojo/promise/Promise>} - When the promise is completed, the result object will be MapIdentifyResults.
	 */
	MapIdentifyTask.prototype.identify = function (geometry) {
		var output = {};
		// Note that "visible" according to getLayersVisibleAtScale does not check to see if the visible
		// property is set to true or false. This will be checked in the loop later.
		var visibleLayers = this.map.getLayersVisibleAtScale(); 
		var self = this;

		visibleLayers.forEach(function (layer) {
			var def;
			if (layer.visible && (!self.ignoredUrls || !self.ignoredUrls.test(layer.url))) {
				def = self._identifyForLayer(layer, geometry);
				if (def) {
					output[layer.id] = def;
				}
			}
		});

		return all(output);
	};

	return MapIdentifyTask;
});