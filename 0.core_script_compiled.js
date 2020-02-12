(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],{

/***/ "./src/InteractiveMap.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "runInteractiveGame", function() { return runInteractiveGame; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "modeDemandsInteractiveMap", function() { return modeDemandsInteractiveMap; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "loadMap", function() { return loadMap; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/tslib/tslib.es6.js");

var MODE_CLICK = "ClickOnStates";
function runInteractiveGame(options, svg) {
    if (options.mode == MODE_CLICK) {
        svg.querySelector(".state").classList.add("state-interactive");
    }
}
function modeDemandsInteractiveMap(mode) {
    return mode == MODE_CLICK;
}
function loadMap() {
    return Object(tslib__WEBPACK_IMPORTED_MODULE_0__[/* __awaiter */ "a"])(this, void 0, Promise, function () {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__[/* __generator */ "b"])(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var xhr = new XMLHttpRequest;
                    xhr.open('get', 'states.svg', true);
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState != 4)
                            return;
                        var svg = xhr.responseXML.documentElement;
                        svg = document.importNode(svg, true); // surprisingly optional in these browsers
                        console.log("loaded");
                        var div = document.createElement("div");
                        div.classList.add("svg-map-container");
                        div.appendChild(svg);
                        document.getElementById("game-container").appendChild(div);
                        resolve(svg);
                    };
                    xhr.send();
                })];
        });
    });
}


/***/ })

}]);
//# sourceMappingURL=0.core_script_compiled.js.map