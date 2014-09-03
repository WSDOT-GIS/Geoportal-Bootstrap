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
	 * @constructor
	 */
	function InfoTemplateManager(defaultInfoTemplate) {
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

	function createInfoTemplateForLayerInfo(layerInfo) {
		var popupType = layerInfo.htmlPopupType, infoTemplate, deferred;

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
					deferred.resolve(htmlPopupResponse.content);
				});
			} else {
				deferred = esriRequest({
					url: url,
					content: {
						f: format,
						handleAs: "text"
					}
				});
			}

			return deferred;
		}

		infoTemplate = new InfoTemplate();
		// set the title to show the display field.
		infoTemplate.setTitle(["${", layerInfo.displayField, "}"].join(""));

		if (popupType === "esriServerHTMLPopupTypeAsHTMLText" || popupType === "esriServerHTMLPopupTypeAsURL") {
			infoTemplate.setContent(getHtmlPopupContent);
		} else {
			infoTemplate.setContent(createContentTable(layerInfo));
		}

		return infoTemplate;
	}

	/**
	 * 
	 * @param {string} layerId - The unique identifier of a map's layer.
	 * @param {Object} layerInfo - Information about a layer, specified by a map layer object.
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
	

	return InfoTemplateManager;
});