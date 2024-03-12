/* jshint esversion: 11 */

var isFirstSetup = true;
var scenes = [];
var numScenes = 0;
var frame = 0;
var target = 0;
var playing = false;

var smoothness = 475;

const DeviceType = getDeviceType();

function convertCSSLengthUnit(fromUnitValue, toUnit){
    let value = fromUnitValue.match(/[0-9]+\.*[0-9]*/g)[0];
    let unit = fromUnitValue.match(/[a-zA-Z]+/g)[0];

    let frag = document.createRange().createContextualFragment(`
        <div style='all: initial; pointer-events: none; display: block; position: absolute; border: none; padding: 0; margin: 0; background: rgba(0,0,0,0); color: color: rgba(0,0,0,0); width: 1${unit}; height: 1px;'></div>
    `);
    document.body.appendChild(frag);
    let measureElement = document.body.children[document.body.children.length-1];
    let toUnitValuePixel = measureElement.getBoundingClientRect().width * value; // X
    measureElement.remove();

    if(toUnit){
        let frag = document.createRange().createContextualFragment(`
      <div style='all: initial; pointer-events: none; display: block; position: absolute; border: none; padding: 0; margin: 0; background: rgba(0,0,0,0); color: color: rgba(0,0,0,0); width: 1${toUnit}; height: 1px;'></div>
    `);
        document.body.appendChild(frag);
        let measureElement = document.body.children[document.body.children.length-1];
        let valueUnit = measureElement.getBoundingClientRect().width; // Y
        measureElement.remove();

        // Given: Aem and Bmm with B=1. We know: Aem = Xpx and Bmm = Ypx.
        // Therefore: 1px = Bmm/Y
        // Result: Aem = Xpx = X * 1px = X * Bmm/Y <=> Aem = X * 1mm/Y (with B=1) <=> Aem = X/Ymm
        return (toUnitValuePixel / valueUnit);
    }
    return toUnitValuePixel;
}

let Width = window.innerWidth;
let Height = window.innerHeight;
// get random number in the range [a, b)
const R = (a, b) => Math.floor(Math.random() * (b - a)) + a;

var s = [];
// S(value, name) will store 'value' into s at index 'name'
const S = (a, i) => s[i] = a;
// L(name) will retrieve the value stored at s[name]
const L = i => s[i];

// M(a, b) will return the maximum
const M = (a, b) => Math.max(a, b);
// m(a, b) will return the minimum
const m = (a, b) => Math.min(a, b);

// C will round up
const C = (a) => Math.ceil(a);
// F will round down
const F = (a) => Math.floor(a);

const T = (v, u) => convertCSSLengthUnit(v+u, 'px');

const scrollWaitTime = 5;
const autoWaitTime = 22;
const verbose = false;

function togglePlaying(value) {
    playing = value ?? (playing + 1) % 2;
}

function setup() {
    let ap = $('.kx-auto');
    if (ap.length === 1) {
        let dtLayout = ap.find('#' + ap.attr('id') + '-desktop');
        var dtSize = -1;
        if (dtLayout.length === 1) {
            dtSize = dtLayout.data('size-threshold').split(',');
        }

        let tbLayout = ap.find('#' + ap.attr('id') + '-tablet');
        var tbSize = -1;
        if (tbLayout.length === 1) {
            tbSize = tbLayout.data('size-threshold').split(',');
        }

        let mbLayout = ap.find('#' + ap.attr('id') + '-mobile');
        var mbSize = -1;
        if (mbLayout.length === 1) {
            mbSize = mbLayout.data('size-threshold').split(',');
        }

        if (dtSize !== -1 && $(window).width()/$(window).height() > dtSize[0]/dtSize[1]) {
            if (tbLayout.length === 1) {
                tbLayout.remove();
            }
            if (mbLayout.length === 1) {
                mbLayout.remove();
            }
            setupAutoParalax(dtLayout);
        } else if (tbSize !== -1 && $(window).width()/$(window).height() > tbSize[0]/tbSize[1]) {
            if (dtLayout.length === 1) {
                dtLayout.remove();
            }
            if (mbLayout.length === 1) {
                mbLayout.remove();
            }
            setupAutoParalax(tbLayout);
        } else if (mbSize !== -1 && $(window).width()/$(window).height() > mbSize[0]/mbSize[1]) {
            if (dtLayout.length === 1) {
                dtLayout.remove();
                ap.remove(dtLayout);
            }
            if (tbLayout.length === 1) {
                tbLayout.remove();
                ap.remove(tbLayout);
            }
            setupAutoParalax(mbLayout);
        } else {
            ap.css('display', 'none');
            console.log('Your device is not supported.');
        }
    }
}

var last0 = -1;
var last1 = -1;
var touching = false;

function setupAutoParalax(e) {
    // Register Scenes
    let lastFrame = 0;
    e.find('.kx-scene').each(function (key, element) {
        var el = $(element);
        var pe = new KaralaxScene(el);
        // if (el.data('show-order') > 0)
        // el.css('display', 'none');

        // Add Animations to Scene
        registerAnimations(el, pe);

        // register trigger:
        // trigger format: selector event-type animation-duration
        var trig = (t = el.data('trigger')) !== undefined && t !== '' ? t : 'body mousewheel 0:' + pe.mainDuration;
        var [triggerElement, triggerEvent, triggerDuration] = trig.split(' ');
        var tel = $(triggerElement), ev = triggerEvent, stt = triggerDuration.split(':')[0],
            end = triggerDuration.split(':')[1];
        if (ev !== 'mousewheel') {
            tel.bind(ev, async () => {
                if (!playing) {
                    playing = 1;
                    for (frame = stt; frame <= end; frame++) {
                        pe.update(frame);
                        await sleep(autoWaitTime);
                    }
                    playing = 0;
                    target = end;
                }
            });
        }

        scenes[el.data('show-order')] = pe;
    });

    if (isFirstSetup) {
        isFirstSetup = false;

        // Initialize First Scene
        scenes[0].playInAnimation();
        let body = $('body');
        body.on('mousewheel', async (e) => {
            target = Math.max(0, Math.min(target - scenes[0].inFinished * !playing * e.originalEvent.wheelDelta / 20, scenes[0].mainDuration));
            for (; frame !== Math.round(target); await sleep(scrollWaitTime)) scenes[0].update(frame += (target - frame) / Math.abs(target - frame));
        });
        body.on('touchstart', async (e) => {
            touching = true;
            last0 = last1 = e.changedTouches[0].pageY;
        });
        body.on('touchmove', async (e) => {
            let delta = e.changedTouches[0].pageY - last1;
            last0 = last1;
            last1 = e.changedTouches[0].pageY;
            target = Math.max(0, Math.min(target - scenes[0].inFinished * !playing * delta / 10, scenes[0].mainDuration));
            for (; touching && frame !== Math.round(target); await sleep(scrollWaitTime)) scenes[0].update(frame += (target - frame) / Math.abs(target - frame));
        });
        body.on('touchend', async () => {
            touching = false;
            let momentum = (target - frame) * 100;
            for (; !touching && frame !== Math.round(target); await sleep(scrollWaitTime)) {
                target = Math.max(0, target - scenes[0].inFinished * !playing * momentum / 20);
                scenes[0].update(frame += (target - frame) / Math.abs(target - frame));
                momentum *= 0.995;
            }
        });
    }
}


function registerAnimations(el, pe) {
    el = $(el);
    el.find(':not(.kx-ignore').each(function (key, cel) {
        cel = $(cel);
        // In-Transition Animations
        pe.addInTransition(regAnimsHelper(cel, 'it-'));

        if (!cel.hasClass('repeating')) {
            // On-Scroll Animations
            pe.addElement(regAnimsHelper(cel, ''));

            // Out-Transition Animations
            // pe.addOutTransision(regAnimsHelper(cel, "ot-"));
        } else {
            pe.addRepeating();
        }
    });
}

function regAnimsHelper(cel, pref) {
    var ke = new KaralaxElement(cel);
    var last = "";
    addChanges(cel, pref + 'move', [(pc) => {
        ke.addChange('left', pc);
    },
        (pc) => {
            ke.addChange('top', pc);
        }]);
    addChanges(cel, pref + 'move-x', [(pc) => {
        ke.addChange('left', pc);
    }]);
    addChanges(cel, pref + 'move-y', [(pc) => {
        ke.addChange('top', pc);
    }]);
    addChanges(cel, pref + 'opacity', [(pc) => {
        ke.addChange('opacity', pc);
    }]);
    addChanges(cel, pref + 'size', [(pc) => {
        ke.addChange('width', pc);
    },
        (pc) => {
            ke.addChange('height', pc);
        }]);
    addChanges(cel, pref + 'size-x', [(pc) => {
        ke.addChange('width', pc);
    }]);
    addChanges(cel, pref + 'size-y', [(pc) => {
        ke.addChange('height', pc);
    }]);
    addChanges(cel, pref + 'ft-sz', [(pc) => {
        ke.addChange('font-size', pc);
    }]);
    addChanges(cel, pref + 'back-r', [(pc) => {
        ke.addChange('br', pc);
    }]);
    addChanges(cel, pref + 'back-g', [(pc) => {
        ke.addChange('bg', pc);
    }]);
    addChanges(cel, pref + 'back-b', [(pc) => {
        ke.addChange('bb', pc);
    }]);
    addChanges(cel, pref + 'fore-r', [(pc) => {
        ke.addChange('fr', pc);
    }]);
    addChanges(cel, pref + 'fore-g', [(pc) => {
        ke.addChange('fg', pc);
    }]);
    addChanges(cel, pref + 'fore-b', [(pc) => {
        ke.addChange('fb', pc);
    }]);

    // Transforms
    addTransforms(ke, cel, pref + 'matrix', 'matrix');
    addTransforms(ke, cel, pref + 'matrix3d', 'matrix3d');
    addTransforms(ke, cel, pref + 'perspective', 'perspective');
    addTransforms(ke, cel, pref + 'rot', 'rotate');
    addTransforms(ke, cel, pref + 'rot3d', 'rotate3d');
    addTransforms(ke, cel, pref + 'rot-x', 'rotateX');
    addTransforms(ke, cel, pref + 'rot-y', 'rotateY');
    addTransforms(ke, cel, pref + 'rot-z', 'rotateZ');
    addTransforms(ke, cel, pref + 'trans', 'translate');
    addTransforms(ke, cel, pref + 'trans3d', 'translate3d');
    addTransforms(ke, cel, pref + 'trans-x', 'translateX');
    addTransforms(ke, cel, pref + 'trans-y', 'translateY');
    addTransforms(ke, cel, pref + 'trans-z', 'translateZ');
    addTransforms(ke, cel, pref + 'scale', 'scale');
    addTransforms(ke, cel, pref + 'scale3d', 'scale3d');
    addTransforms(ke, cel, pref + 'scaleX', 'scaleX');
    addTransforms(ke, cel, pref + 'scaleY', 'scaleY');
    addTransforms(ke, cel, pref + 'scaleZ', 'scaleZ');
    addTransforms(ke, cel, pref + 'skew', 'skew');
    addTransforms(ke, cel, pref + 'skewX', 'skewX');
    addTransforms(ke, cel, pref + 'skewY', 'skewY');

    return ke;
}

function addChanges(el, dataName, addFunctions) {
    let ch = parseData($(el), dataName);
    for (let str of ch) {
        if (str.trim() !== '') {
            let sp = str.trim().split(' ');
            let dur = sp[0] === 'def' ? [0, 1] : sp[0].split(`:`);
            let stt = sp[0] === 'def' ? sp[1].split(',,') : sp[1].split('--')[0].split(',,');
            if (stt === 'Last') stt = last;
            last = stt;
            let end = sp[0] === 'def' ? stt : sp[1].split("--")[1].split(",,");
            if (end === 'Last') end = last;
            last = end;
            let pfc = sp.length == 3 ? pickPF(sp[2]) : lPF;
            for (let f in addFunctions) {
                addFunctions[f](new PropertyChange(dur[0], dur[1], stt[f], end[f], pfc));
            }
        }
    }
}

function addTransforms(ke, el, dataName, type) {
    ch = parseData($(el), dataName);

    for (let str of ch) {
        if (str.trim() !== "") {
            var sp = str.trim().split(" ");
            var info = sp[0].split(",");
            var dur = sp[1] === "def" ? [0, 1] : sp[1].split(":");
            var stt = sp[1] === "def" ? sp[2] : sp[2].split("--")[0];
            if (stt === "Last") stt = last;
            last = stt;
            var end = sp[1] === "def" ? stt : sp[2].split("--")[1];
            if (end === "Last") end = last;
            last = end;
            var pfc = sp.length === 4 ? pickPF(sp[3]) : lPF;
            ke.addTransform(type, info[0], info[1], new PropertyChange(dur[0], dur[1], stt, end, pfc));
        }
    }
}

function parseData(el, transition) {
    return el.data(transition) !== undefined ? el.data(transition).split(";") : [];
}

class KaralaxScene {
    constructor(e) {
        this.e = e;
        scenes[numScenes] = this;
        numScenes++;

        this.inTransition = [];
        this.inTransitionDuration = 0;
        this.inFinished = false;

        this.children = [];
        this.mainDuration = 0;

        this.repeating = [];
        this.loopDuration = 0;
    }

    addInTransition(ke) {
        this.inTransition.push(ke);
        this.inTransitionDuration = Math.max(this.inTransitionDuration, ke.lastFrame);
    }

    addElement(ke) {
        this.children.push(ke);
        this.mainDuration = Math.max(this.mainDuration, ke.lastFrame);
    }

    // addOutTransision(ke) {
    // if (typeof ke != "KaralaxElement") throw "Element must be a KaralaxElement";
    // this.outTransition.push(ke);
    // this.outTransitionDuration = max(this.inTransitionDuration, ke.lastFrame);
    // }

    async playInAnimation() {
        for (let f = 0; f <= this.inTransitionDuration; f++) {
            for (var el in this.inTransition) {
                this.inTransition[el].update(f);
            }
            await sleep(autoWaitTime);
            if (verbose) console.log("Frame: " + f);
        }
        this.inFinished = true;
    }

    async update(frame) {
        frame = Math.max(0, Math.min(frame, this.mainDuration));
        if (this.inFinished)
            for (var el in this.children) this.children[el].update(frame);
        if (verbose) console.log("Frame:", frame);
    }
}

class KaralaxElement {
    constructor(e) {
        this.e = e;
        this.changeLists = [];
        this.changes = [];

        this.transformManager = new TransformManager(e);

        this.firstFrame = 0;
        this.lastFrame = 0;
    }

    update(frame) {
        // Simple Properties
        this.updateProperty("opacity", frame);
        this.updateProperty("left", frame);
        this.updateProperty("top", frame);
        this.updateProperty("width", frame);
        this.updateProperty("height", frame);
        this.updateProperty("font-size", frame);

        this.updateRgbBack(frame);
        this.updaterGbBack(frame);
        this.updatergBBack(frame);
        this.updateRgbFore(frame);
        this.updaterGbFore(frame);
        this.updatergBFore(frame);

        // Transforms
        this.transformManager.update(frame);
    }

    addChange(kw, pc) {
        if (this.changeLists[kw] === undefined) {
            this.changeLists[kw] = [];
            this.changes[kw] = 0;
        }

        var index = this.insertPC(this.changeLists[kw], this.changes[kw], pc);

        this.changeLists[kw][index] = pc;
        this.changes[kw]++;
    }

    addTransform(type, index, param, pc) {
        // params & format
        let par = 0;
        let form = p => {
        };
        switch (type) {
            case "matrix":
                par = 6;
                form = (p) => "matrix(" + p.join(",") + ")";
                break;
            case "matrix3D":
                par = 16;
                form = (p) => "matrix3d(" + p.join(",") + ")";
                break;
            case "perspective":
                par = 1;
                form = (p) => "perspective(" + p[0] + "px)";
                break;
            case "rotate":
                par = 1;
                form = (p) => "rotate(" + p[0] + "deg)";
                break;
            case "rotate3D":
                par = 4;
                form = (p) => "rotate3d(" + p[0] + ", " + p[1] + ", " + p[2] + ", " + p[3] + "deg)";
                break;
            case "rotateX":
                par = 1;
                form = (p) => "rotateX(" + p[0] + "deg)";
                break;
            case "rotateY":
                par = 1;
                form = (p) => "rotateY(" + p[0] + "deg)";
                break;
            case "rotateZ":
                par = 1;
                form = (p) => "rotateZ(" + p[0] + "deg)";
                break;
            case "translate":
                par = 2;
                form = (p) => "translate(" + p[0] + "px, " + p[1] + "px)";
                break;
            case "translate3d":
                par = 3;
                form = (p) => "translate3d(" + p[0] + "px, " + p[1] + "px, " + p[2] + "px)";
                break;
            case "translateX":
                par = 1;
                form = (p) => "translateX(" + p[0] + "px)";
                break;
            case "translateY":
                par = 1;
                form = (p) => "translateY(" + p[0] + "px)";
                break;
            case "translateZ":
                par = 1;
                form = (p) => "translateZ(" + p[0] + "px)";
                break;
            case "scale":
                par = 2;
                form = (p) => "scale(" + p[0] + "px, " + p[1] + "px)";
                break;
            case "scale3d":
                par = 3;
                form = (p) => "scale3d(" + p[0] + "px, " + p[1] + "px, " + p[2] + "px)";
                break;
            case "scaleX":
                par = 1;
                form = (p) => "scaleX(" + p[0] + "px)";
                break;
            case "scaleY":
                par = 1;
                form = (p) => "scaleY(" + p[0] + "px)";
                break;
            case "scaleZ":
                par = 1;
                form = (p) => "scaleZ(" + p[0] + "px)";
                break;
            case "skew":
                par = 2;
                form = (p) => "skew(" + p[0] + "deg, " + p[1] + "deg)";
                break;
            case "skewX":
                par = 1;
                form = (p) => "skewX(" + p[0] + "deg)";
                break;
            case "skewY":
                par = 1;
                form = (p) => "skewY(" + p[0] + "deg)";
                break;
        }

        this.transformManager.addTransform(type, index, par, form);
        this.transformManager.addChange(index, param, pc);

        this.lastFrame = this.transformManager.maxFrame;
    }

    updateProperty(kw, frame, func) {
        this.changeVal(frame, this.changeLists[kw], this.changes[kw], kw,
            func === undefined ? val => val : func);
    }

    // Background R
    updateRgbBack(frame) {
        this.changeVal(frame, this.changeLists["br"], this.changes["br"], "background-color", (val) => {
            var col = [...this.e.css("background-color").matchAll(/\d+/g)];
            return "rgb(" + val + ", " + col[1] + ", " + col[2] + ")";
        });
    }

    // Background G
    updaterGbBack(frame) {
        this.changeVal(frame, this.changeLists["bg"], this.changes["bg"], "background-color", (val) => {
            var col = [...this.e.css("background-color").matchAll(/\d+/g)];
            return "rgb(" + col[0] + ", " + val + ", " + col[2] + ")";
        });
    }

    // Background B
    updatergBBack(frame) {
        this.changeVal(frame, this.changeLists["bb"], this.changes["bb"], "background-color", (val) => {
            var col = [...this.e.css("background-color").matchAll(/\d+/g)];
            return "rgb(" + col[0] + ", " + col[1] + ", " + val + ")";
        });
    }

    // Foreground R
    updateRgbFore(frame) {
        this.changeVal(frame, this.changeLists["fr"], this.changes["fr"], this.e.prop("tagName") === "svg" ? "fill" : "color", (val) => {
            var col = [...this.e.css("color").matchAll(/\d+/g)];
            return "rgb(" + val + ", " + col[1] + ", " + col[2] + ")";
        });
    }

    // Foreground G
    updaterGbFore(frame) {
        this.changeVal(frame, this.changeLists["fg"], this.changes["fg"], this.e.prop("tagName") === "svg" ? "fill" : "color", (val) => {
            var col = [...this.e.css("color").matchAll(/\d+/g)];
            return "rgb(" + col[0] + ", " + val + ", " + col[2] + ")";
        });
    }

    // Foreground B
    updatergBFore(frame) {
        this.changeVal(frame, this.changeLists["fb"], this.changes["fb"], this.e.prop("tagName") === "svg" ? "fill" : "color", (val) => {
            var col = [...this.e.css("color").matchAll(/\d+/g)];
            return "rgb(" + col[0] + ", " + col[1] + ", " + val + ")";
        });
    }

    changeVal(frame, changeList, numChanges, style, valForm) {
        var chg = findPC(changeList, numChanges, frame);

        if (chg !== undefined) {
            var sV = chg.startValue;
            var eV = chg.endValue;
            var prog = chg.progFunc((frame - chg.startFrame) / (chg.endFrame - chg.startFrame));
            var val = sV + (eV - sV) * prog;
            this.e.css(style, valForm(val));
        }
    }

    insertPC(changes, numChanges, pc) {
        var index = 0;
        for (var i = 0; i < numChanges; i++) {
            if ((pc.startFrame <= changes[i].endFrame && pc.startFrame >= changes[i].startFrame)
                || (pc.endFrame >= changes[i].startFrame && pc.endFrame <= changes[i].endFrame))
                throw "Progression cannot overlap another progression";
            else if (pc.endFrame <= changes[i].startFrame) break;
            index = i + 1;
        }

        for (var i = index; i < numChanges; i++) changes[i + 1] = changes[i];

        this.firstFrame = Math.min(this.firstFrame, pc.startFrame);
        this.lastFrame = Math.max(this.lastFrame, pc.endFrame);

        return index;
    }
}

function PropertyChange(startFrame, endFrame, startValue, endValue, progFunc) {
    if (eval(endFrame) <= eval(startFrame))
        throw "endFrame must be greater than startFrame.";

    this.startFrame = eval(startFrame);
    this.endFrame = eval(endFrame);
    this.startValue = eval(startValue);
    this.endValue = eval(endValue);
    this.progFunc = progFunc === undefined ? lPF : progFunc;
}

class TransformManager {
    constructor(e) {
        this.e = e;
        this.transforms = [];

        this.maxFrame = 0;
    }

    update(frame) {
        let str = ""
        for (var i in this.transforms) str += this.transforms[i].getFormatted(frame) + " ";
        this.e.css("transform", str);
    }

    addTransform(type, index, params, format) {
        if (verbose) console.log(type);
        if (this.transforms[index] === undefined) {
            this.transforms[index] = new Transform(type, params, format);
        }
    }

    addChange(index, param, pc) {
        this.transforms[index].addChange(param, pc);
        this.maxFrame = Math.max(this.maxFrame, pc.endFrame);
    }
}

class Transform {
    constructor(type, params, format) {
        this.type = type;
        this.params = params;
        (this.changes = []).length = params;
        this.changes.fill([]);
        (this.nums = []).length = params;
        this.nums.fill(0);
        (this.last = []).length = params;
        this.last.fill(0);
        this.format = format;
        this.maxFrame = 0;
    }

    getFormatted(frame) {
        let temp = new Array(this.params);
        for (var i in this.changes) {
            var chg = findPC(this.changes[i], this.nums[i], frame);

            if (chg !== undefined) {
                var sV = chg.startValue;
                var eV = chg.endValue;
                var prog = chg.progFunc((frame - chg.startFrame) / (chg.endFrame - chg.startFrame));
                temp[i] = sV + (eV - sV) * prog;
            } else {
                temp[i] = this.last[i];
            }
        }
        this.last = temp;
        return this.format(temp);
    }

    addChange(param, pc) {
        var index = insertPC(this.changes[param], this.nums[param], pc);

        this.maxFrame = Math.max(this.maxFrame, pc.endFrame);
        this.changes[param][index] = pc;
        this.nums[param]++;
    }
}

function findPC(changes, numChanges, frame) {
    for (var i = 0; i < numChanges; i++)
        if (frame >= changes[i].startFrame && frame <= changes[i].endFrame) return changes[i];
    return undefined;
}

function insertPC(changes, numChanges, pc) {
    var index = 0;
    for (var i = 0; i < numChanges; i++) {
        if ((pc.startFrame <= changes[i].endFrame && pc.startFrame >= changes[i].startFrame)
            || (pc.endFrame >= changes[i].startFrame && pc.endFrame <= changes[i].endFrame))
            throw "Progression cannot overlap another progression";
        else if (pc.endFrame <= changes[i].startFrame) break;
        index = i + 1;
    }

    for (var i = index; i < numChanges; i++) changes[i + 1] = changes[i];

    return index;
}

function pickPF(key) {
    switch (key) {
        case "linear":
            return lPF;
        case "parabolic":
            return pPF;
        case "revPara":
            return rpPF;
        case "hyperbolic":
            return hPF;
        case "cosine":
            return cPF;
        case "invCos":
            return icPF;
        case "sqrRt":
            return srPF;
        default:
            throw "Unknown Prog Function";
    }
}

const lPF = (prog) => {
    return pLim(prog);
}
const pPF = (prog) => {
    return Math.pow(pLim(prog), 2);
}
const rpPF = (prog) => {
    return 2 * prog - Math.pow(pLim(prog), 2);
}
const hPF = (prog) => {
    var phi = (1 + Math.sqrt(5)) / 2;
    return -1 / (pLim(prog) - phi) - phi + 1;
}
const cPF = (prog) => {
    return (1 - Math.cos(pLim(prog) * Math.PI)) / 2;
}
const icPF = (prog) => {
    return Math.acos(1 - 2 * pLim(prog)) / Math.PI;
}
const srPF = (prog) => {
    return Math.sqrt(pLim(prog));
}

const pLim = (prog) => {
    return Math.min(Math.max(0, prog), 1);
}

function addDivButton(p, n, t, w, h, a) {
    var b = cE("div", n, "div-button noselect");
    b.html("<p>" + t + "</p>");
    b.css("width", w + "px");
    b.css("height", h + "px");

    $("#" + n + ":hover").css("width", (w - 4) + "px");
    $("#" + n + ":hover").css("height", (h - 4) + "px");

    $("#" + n + ":active").css("width", (w - 4) + "px");
    $("#" + n + ":active").css("height", (h - 4) + "px");

    p.append(b);

    $(p).on('click', '#' + n, function () {
        if (!$('#' + n).hasClass("dsbld")) a()
    });

    return b;
}

function sleep(t) {
    return new Promise(resolve => setTimeout(resolve, t));
}

function cE(t, i, c, h) {
    var e = $("<" + t + "></" + t + ">");
    if (i !== "") {
        e.attr("id", i);
    }
    if (c !== "") {
        e.attr("class", c);
    }
    if (h !== undefined) {
        e.html(h)
    }
    return e;
}

function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return "t";
    }
    if (
        /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
            ua
        )
    ) {
        return "m";
    }
    return "d";
}

$(setup);