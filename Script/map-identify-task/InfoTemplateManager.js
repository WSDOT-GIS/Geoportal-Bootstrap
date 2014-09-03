/*global define*/
define(["esri/request", "dojo/Deferred", "esri/InfoTemplate"], function (esriRequest, Deferred, InfoTemplate) {

	/**
	 * @external IdentifyResult
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/identifyresult-amd.html IdentifyResult}
	 */

	/**
	 * @external InfoTemplate
	 * @see {@link https://developers.arcgis.com/javascript/jsapi/infotemplate-amd.html InfoTemplate}
	 */

	/**
	 * @external RestApiLayer
	 * @see {@link http://resources.arcgis.com/en/help/arcgis-rest-api/#/Layer_Table/02r3000000zr000000/ Layer / Table}
	 */

	/**
	 * @constructor
	 */
	function InfoTemplateManager() {
		/** @member {Object.<string, InfoTemplate[]>} */
		this.infoTemplates = {};
	}

	function createContentTable(layerInfo) {
		var output = ["<table>"];

		layerInfo.fields.forEach(function (fieldInfo) {
			output.push("<tr><th>", fieldInfo.alias || fieldInfo.name, "<td");
			if (fieldInfo.type) {
				output.push(" data-type='", fieldInfo.type, "' ");
			}
			if (fieldInfo.length) {
				output.push(" data-length='", fieldInfo.length, "' ");
			}
			output.push(">${", fieldInfo.name, "}</td></tr>");
		});

		output.push("</table>");

		return output.join("");
	}

	function getHtmlBodyContent(htmlPopupResponse) {
		var parser = new DOMParser();
		var doc = parser.parseFromString(htmlPopupResponse.content, "text/html");
		var body = doc.querySelector("body");

		return body.html;
	}

	function createInfoTemplateForLayerInfo(layerInfo) {
		var popupType = layerInfo.htmlPopupType, infoTemplate;

		function getHtmlPopupContent(graphic) {
			var objectIdFieldName = layerInfo.fields.filter(function(fieldInfo){
				return fieldInfo.type === "esriFieldTypeOID";
			})[0].name;
			var url = [layerInfo.url, graphic.attributes[objectIdFieldName], "htmlPopup"].join("/");

			var format = popupType === "esriServerHTMLPopupTypeAsHTMLText" ? "json" : "html";

			var deferred;

			if (format === "json") {
				deferred = new Deferred();
				esriRequest({
					url: url,
					content: {
						f: format,
					}
				}).then(function (htmlPopupResponse) {
					deferred.resolve(getHtmlBodyContent(htmlPopupResponse.content));
				});
			} else {
				deferred = new Deferred();
				esriRequest({
					url: url,
					content: {
						f: format,
					},
					handleAs: "text"
				}).then(function (html) {
					deferred.resolve(getHtmlBodyContent(html));
				});

			}

			return deferred;
		}

		infoTemplate = new InfoTemplate();
		// set the title to show the display field.
		infoTemplate.setTitle(["${", layerInfo.displayField, "}"].join(""));

		////if (popupType === "esriServerHTMLPopupTypeAsHTMLText" || popupType === "esriServerHTMLPopupTypeAsURL") {
		////	infoTemplate.setContent(getHtmlPopupContent);
		////} else {
		////	infoTemplate.setContent(createContentTable(layerInfo));
		////}
		infoTemplate.setContent(createContentTable(layerInfo));

		return infoTemplate;
	}

	/**
	 * Gets an InfoTemplate for a layer, and creates one if one does not already exist for that layer.
	 * @param {RestApiLayer} layerInfo - Information about a layer, specified by a map layer object.
	 * @param {string} layerInfo.url - URL of the layer.
	 * @returns {InfoTemplate}
	 */
	InfoTemplateManager.prototype.getInfoTemplate = function (layerInfo) {
		var template;

		template = this.infoTemplates[layerInfo.url];

		if (!template) {
			template = createInfoTemplateForLayerInfo(layerInfo);

			this.infoTemplates[layerInfo.url] = template;
		}

		return template;
	};

	/**
	 * Extracts the feature portion of an identify result. Intended for use with the Array.prototype.map function.
	 * @param {IdentifyResult} idResult
	 * @returns {external:Graphic}
	 */
	InfoTemplateManager.prototype._getFeatureFromIdResult = function (idResult) {
		var feature = null;
		if (idResult && idResult.feature) {
			feature = idResult.feature;
			if (!feature.infoTemplate) {
				feature.infoTemplate = this.getInfoTemplate(idResult.layerInfo);
			}
		}
		return feature;
	};

	/**
	 * @typedef {Object.<string, external:IdentifyResult[]>} MapIdentifyResults
	 * The property names correspond to the layer ids of layers in the map.
	 */

	/**
	 * Converts the results of MapIdentifyTask.ide
	 * ntify into an array of graphics.
	 * @param {MapIdentifyResults} results
	 * @returns {external:Graphic[]}
	 */
	InfoTemplateManager.prototype.mapIdentifyResultsToGraphics = function (results) {
		var idResultsArray, output, self = this, mapper;
		mapper = function (result) { return self._getFeatureFromIdResult(result); };
		for (var layerName in results) {
			if (results.hasOwnProperty(layerName)) {
				idResultsArray = results[layerName];
				idResultsArray = idResultsArray.map(mapper);
				output = output ? output.concat(idResultsArray) : idResultsArray;
			}
		}
		return output || null;
	};
	

	return InfoTemplateManager;
});