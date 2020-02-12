
import './classlist.ts';
import stateNameHash from './states_hash';
import capitalHash from './capitals_hash';
import { shuffle } from './utils';
import tippy, { Instance, hideAll } from 'tippy.js';
import getBounds from 'svg-path-bounds';

const MODE_CLICK = "ClickOnStates";
const MODE_LEARN = "LearningLevel";
const MODE_DRAG = "DragStates";
const MAX_TRIES = 3;


/**
 * Method that checks whether cls is present in element object.
 */
function hasClass(element: Element, className: string): boolean {
    let clz: string = element.getAttribute("class");
    if(clz == null)
        clz = "";
    else if(typeof (clz as unknown as SVGAnimatedString).baseVal != 'undefined')
        clz = (clz as unknown as SVGAnimatedString).baseVal;
    return (' ' + clz + ' ').indexOf(' ' + className+ ' ') > -1;
}

let listOfStatesToRun: Array<string> = null;

let currentStateCode = null;
let currentMode = null;
let stateHash = null;
let isCapitals = false;
let instructions: HTMLSpanElement = null;
let nextTimeout = null;
let stateRoot: SVGGElement = null;

let svgMap: SVGSVGElement = null;

let numTries = 0;

let interactive: boolean = false;
function setInteractive(i: boolean) {
    interactive = i;
    if(currentMode != MODE_DRAG) {
        if(i)
            stateRoot.classList.add("state-interactive");
        else
            stateRoot.classList.remove("state-interactive");
    }
    
}


function clearTimeoutIfPresent() {
    if(nextTimeout != null) {
        clearTimeout(nextTimeout);
        nextTimeout = null;
    }
}
function customTimeout(fn: Function, timeout: number) {
    nextTimeout = setTimeout(() => {
        nextTimeout = null;
        fn();
    }, timeout);
}

const rv = (window as any).responsiveVoice;
const voice = "US English Male";

function handleCorrectness(code: string, e: SVGElement) {
    const oldE = e;
    clearTimeoutIfPresent();
    let isCorrect: boolean;
    if(currentMode == MODE_CLICK)
        isCorrect = code == currentStateCode;
    else if(currentMode == MODE_LEARN)
        isCorrect = true;
    else if(currentMode == MODE_DRAG) {
        const useElement = e as SVGUseElement;
        const target: SVGGraphicsElement = stateRoot.querySelector(`#${currentStateCode}`);
        e = target;
        const ourCenterPoint = transformBoundBox(useElement);
        const targetCenterPoint = (() => { const { x, y } = target.getBBox(); return { x, y }; })();
        const distance = Math.sqrt(Math.pow((targetCenterPoint.x - ourCenterPoint.x), 2) + Math.pow((targetCenterPoint.y - ourCenterPoint.y), 2));
        isCorrect = distance <= 30;
    } else
        throw new Error("Unexpected mode: " + currentMode);
    if(isCorrect) {
        if(currentMode == MODE_CLICK)
            instructions.textContent = `Yes, that's ${getQuestionName(currentStateCode)}.`;
        else if(currentMode == MODE_LEARN) {
            instructions.textContent = `That's ${getFullName(code)}.`;
            rv?.speak(stateHash[code], voice);
            listOfStatesToRun.splice(listOfStatesToRun.indexOf(code), 1);
        } else if(currentMode == MODE_DRAG) {
            instructions.textContent = "Great job!";
        }
        e.classList.add("state-correct");
        const stroke = stateRoot.querySelector(`#${code}-stroke`);
        stroke.classList.add("state-correct");
        if(currentMode != MODE_DRAG) {
            ((e as any)._tippy as Instance).enable();
            if(isCapitals)
                ((e as any)._tippy as Instance).setContent(getFullName(code));
        } else {
            oldE.style.display = "none";
        }
    } else {
        if(currentMode != MODE_DRAG)
            instructions.textContent = `No, that's ${getQuestionName(code)}.`;
        else
            instructions.textContent = `Try again!`;
        numTries++;
        if(numTries >= MAX_TRIES) {
            showCorrectState();
        }
    }
    setInteractive(false);
    customTimeout(() => {
        if(!isCorrect) {
            showCurrentMessage();
            setInteractive(true);
        } else
            setInteractive(loadNextState());
    }, 2000);
}

function showCorrectState() {
    [ "#" + currentStateCode + "-stroke", "#" + currentStateCode ].forEach(id => {
        const state = stateRoot.querySelector(id);
        if(state == null)
            return;
        state.parentNode.appendChild(state);
        state.classList.remove("state-incorrect-hint");
        state.classList.add("state-incorrect-hint");
    });
    
}
function onStateClick(e: MouseEvent) {
    if(!interactive)
        return;
    const t = e.currentTarget as SVGElement;
    const stateCode = t.getAttribute("id");
    if(hasClass(t, "state-correct")) {
        rv?.speak(getFullName(stateCode), voice);
        window.alert(getFullName(stateCode));
        return;
    }
    handleCorrectness(stateCode, t);
}
function getFullName(code: string): string {
    if(!isCapitals)
        return stateNameHash[code];
    else
        return `${capitalHash[code]}, ${stateNameHash[code]}`;
}
function getQuestionName(code: string): string {
    if(!isCapitals)
        return stateNameHash[code];
    else
        return `the state whose capital is ${capitalHash[code]}`;
}

function showCurrentMessage() {
    if(currentMode != MODE_DRAG)
        instructions.textContent = `Click on ${getQuestionName(currentStateCode)}.`;
    else
        instructions.textContent = `Drag ${getQuestionName(currentStateCode)} to the right place.`;
}
function loadNextState(): boolean {
    if(listOfStatesToRun.length > 0) {
        if(currentMode != MODE_LEARN) {
            currentStateCode = listOfStatesToRun.pop();
            numTries = 0;
            showCurrentMessage();
            if(currentMode == MODE_DRAG)
                resetUsePosition();
        } else
            instructions.textContent = `Click on a state to learn its ${isCapitals ? "capital" : "name"}.`;
        return true;
    } else {
        instructions.textContent = `Congratulations; you've finished the game!`;
        hideAll({ duration: 0 });
        document.querySelector(".instructions").classList.add("game-finished");
        document.querySelector(".svg-map-container").classList.add("game-finished");
        return false;
    }
}
function resetUsePosition() {
    const dragUse: SVGUseElement = svgMap.querySelector("#dragging-state");
    dragUse.style.display = "block";
    dragUse.setAttribute("href", `#${currentStateCode}-drag`);
    const dragGroup: SVGGElement = svgMap.querySelector(`#${currentStateCode}-drag`);
    const dragPathData: string = stateRoot.querySelector(`#${currentStateCode}`).getAttribute("d");
    const [left, top, right, bottom] = getBounds(dragPathData);
    /*
    const x = -(parser.commands[0] as CommandM).x + 600;
    const y = -(parser.commands[0] as CommandM).y + 600;
    */
    const x = -(left + (right - left) / 2) + 600;
    const y = -(top + (bottom - top) / 2) + 600;
    
    dragGroup.setAttribute("transform", `translate(${x} ${y})`);
    dragUse.removeAttribute("transform");
    dragUse.removeAttribute("data-transform-x");
    dragUse.removeAttribute("data-transform-y");
}

type BoundRect = { x: number; y: number; width: number; height: number; };
function getCenterPoint(rect: BoundRect): { x: number; y: number } {
    return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
    };
}
function transformBoundBox(useElement: SVGUseElement): BoundRect {
    const bbox = useElement.getBBox();
    const transformX = parseFloat(useElement.getAttribute("data-transform-x"));
    const transformY = parseFloat(useElement.getAttribute("data-transform-y"));
    return {
        x: bbox.x + transformX,
        y: bbox.y + transformY,
        width: bbox.width,
        height: bbox.height
    };
}
function handleDragFinish(useElement: SVGUseElement) {
    handleCorrectness(currentStateCode, useElement);
}

export function runInteractiveGame(options: any, svg: SVGSVGElement) {
    stateRoot = svg.querySelector(".state");
    isCapitals = options.capitals == "true";
    if(isCapitals) {
        stateHash = capitalHash;
    } else
        stateHash = stateNameHash;
    const dc = svg.querySelector("#DC");
    dc?.parentNode.removeChild(dc);
    const titles = svg.querySelectorAll("title");
    Array.from(titles).forEach(element => {
        const s = element.parentNode as SVGElement;
        if(options.mode != MODE_DRAG) {
            s.setAttribute("data-tippy-content", stateNameHash[s.getAttribute("id")]);
            const t = tippy(s, {
                hideOnClick: true
            });
            if(options.mode != MODE_LEARN || !isCapitals)
                t.disable();
        }
        element.parentNode.removeChild(element);
    });
    const stateRootChildren = Array.from(stateRoot.childNodes as NodeListOf<SVGElement>).filter(child => child.nodeType == Node.ELEMENT_NODE);
    listOfStatesToRun = [];
    const dragDefs: SVGDefsElement = svg.querySelector("#drag-defs");
    stateRootChildren.forEach(path => {
        path.classList.add("state-path");
        const newNode: SVGElement = path.cloneNode(true) as SVGElement;
        newNode.setAttribute("id", path.getAttribute("id") + "-stroke");
        newNode.classList.add("state-path-with-stroke");
        stateRoot.insertBefore(newNode, path);
        if(modeIsInteractive(options.mode)) {
            path.addEventListener("click", onStateClick);
        } else if(options.mode == MODE_DRAG) {
            const newNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const clonedPath = path.cloneNode(true) as SVGElement;
            clonedPath.removeAttribute("id");
            const secondClonedPath = clonedPath.cloneNode(true) as SVGElement;
            secondClonedPath.classList.add("state-path-with-stroke");
            newNode.appendChild(secondClonedPath);
            newNode.appendChild(clonedPath);
            newNode.setAttribute("id", path.getAttribute("id") + "-drag");
            dragDefs.appendChild(newNode);
        }
        listOfStatesToRun.push(path.getAttribute("id"));
    });
    svgMap = svg;
    listOfStatesToRun = shuffle(listOfStatesToRun);
    //listOfStatesToRun = listOfStatesToRun.slice(0, 1);
    currentMode = options.mode;
    setInteractive(true);
    if(options.mode == MODE_DRAG) {
            stateRoot.classList.add("state-hide-borders");
            var selectedElement: SVGGraphicsElement, offset, transform,
                bbox, minX, maxX, minY, maxY, confined;
    
            var boundaryX1 = 10.5;
            var boundaryX2 = 30;
            var boundaryY1 = 2.2;
            var boundaryY2 = 19.2;
            const getMousePosition = (evt) => {
                var CTM = svg.getScreenCTM();
                if (evt.touches) { evt = evt.touches[0]; }
                return {
                x: (evt.clientX - CTM.e) / CTM.a,
                y: (evt.clientY - CTM.f) / CTM.d
                };
            }
            const startDrag = (evt) => {
                let target = evt.target;
                if(typeof target.correspondingUseElement != 'undefined') {
                    target = target.correspondingUseElement;
                }
                if (interactive && hasClass(target, 'draggable')) {
                  evt.preventDefault();
                  selectedElement = target;
                  offset = getMousePosition(evt);
      
                  // Make sure the first transform on the element is a translate transform
                  var transforms = selectedElement.transform.baseVal;
                  if ((transforms as any).length === 0 || transforms.numberOfItems == 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                    // Create an transform that translates by (0, 0)
                    var translate = svg.createSVGTransform();
                    translate.setTranslate(0, 0);
                    selectedElement.setAttribute("data-transform-x", "0");
                    selectedElement.setAttribute("data-transform-y", "0");
                    selectedElement.transform.baseVal.insertItemBefore(translate, 0);
                  }
      
                  // Get initial translation
                  transform = transforms.getItem(0);
                  offset.x -= transform.matrix.e;
                  offset.y -= transform.matrix.f;
      
                  confined = hasClass(target, 'confine');
                  if (confined) {
                      bbox = selectedElement.getBBox();
                      minX = boundaryX1 - bbox.x;
                      maxX = boundaryX2 - bbox.x - bbox.width;
                      minY = boundaryY1 - bbox.y;
                      maxY = boundaryY2 - bbox.y - bbox.height;
                  }
                }
              }
      
            const drag = (evt) => {
                if (interactive && selectedElement) {
                    evt.preventDefault();
        
                    var coord = getMousePosition(evt);
                    var dx = coord.x - offset.x;
                    var dy = coord.y - offset.y;
        
                    if (confined) {
                        if (dx < minX) { dx = minX; }
                        else if (dx > maxX) { dx = maxX; }
                        if (dy < minY) { dy = minY; }
                        else if (dy > maxY) { dy = maxY; }
                    }
        
                    transform.setTranslate(dx, dy);
                    selectedElement.setAttribute("data-transform-x", dx.toString());
                    selectedElement.setAttribute("data-transform-y", dy.toString());
                }
            }
      
            const endDrag = (evt) => {
                if(interactive && selectedElement) {
                    try {
                        handleDragFinish(selectedElement as SVGUseElement);
                    } catch (e) {
                        console.error(e);
                    }
                }
                selectedElement = null;
            }

            svg.addEventListener('mousedown', startDrag);
            svg.addEventListener('mousemove', drag);
            svg.addEventListener('mouseup', endDrag);
            svg.addEventListener('mouseleave', endDrag);
            svg.addEventListener('touchstart', startDrag);
            svg.addEventListener('touchmove', drag);
            svg.addEventListener('touchend', endDrag);
            svg.addEventListener('touchleave', endDrag);
            svg.addEventListener('touchcancel', endDrag);
    }
    loadNextState();
}
function modeIsInteractive(mode: string): boolean {
    return mode == MODE_CLICK || mode == MODE_LEARN;
}
export function modeDemandsDirectMap(mode: string): boolean {
    return mode == MODE_CLICK || mode == MODE_LEARN || mode == MODE_DRAG;
}
export async function loadMap(): Promise<SVGSVGElement> {
    instructions = document.createElement("span");
    instructions.classList.add("instructions");
    instructions.textContent = "Loading...";
    document.getElementById("game-container").appendChild(instructions);
    return new Promise(resolve => {
        var xhr = new XMLHttpRequest;
        xhr.open('get','states.svg',true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState != 4) return;
            var svg = xhr.responseXML.documentElement;
            svg = document.importNode(svg,true); // surprisingly optional in these browsers
            var div = document.createElement("div");
            div.classList.add("svg-map-container");
            div.appendChild(svg);
            document.getElementById("game-container").appendChild(div);
            resolve(svg as unknown as SVGSVGElement);
        };
        xhr.send();
    });
    
}