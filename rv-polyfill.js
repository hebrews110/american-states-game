/*
 * Uses Web Speech API on supporting browsers and ResponsiveVoice otherwise.
 */

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
      'use strict';
  
      if (search instanceof RegExp) {
        throw TypeError('first argument must not be a RegExp');
      } 
      if (start === undefined) { start = 0; }
      return this.indexOf(search, start) !== -1;
    };
  }
  if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        value: function(search, rawPos) {
            var pos = rawPos > 0 ? rawPos|0 : 0;
            return this.substring(pos, pos + search.length) === search;
        }
    });
}

if('speechSynthesis' in window) {
    console.log("Using native speech");
    var synth = window.speechSynthesis;
    var voices = [];

    function populateVoiceList() {
        voices = synth.getVoices();
    }

    populateVoiceList();
    console.log(voices);
    speechSynthesis.onvoiceschanged = populateVoiceList;
    window.responsiveVoice = {
        speak: function(text, voice, parameters) {
            if(typeof parameters == 'undefined')
                parameters = {};
            var utter = new SpeechSynthesisUtterance(text);
            utter.lang = "en-US";
            for(i = 0; i < voices.length ; i++) {
                if(voices[i].name == voice || voices[i].name.toLowerCase().includes("female") && voices[i].lang.startsWith("en-")) {
                    utter.voice = voices[i];
                    break;
                }
            }
            [ "pitch", "rate", "volume", "onend"].forEach(function(val) {
                if(typeof parameters[val] != 'undefined')
                    utter[val] = parameters[val];
            });
            synth.speak(utter);
        },
        cancel: function() {
            synth.cancel();
        },
        isPlaying: function() {
            return synth.speaking;
        },
        pause: function() {
            synth.pause();
        },
        resume: function() {
            synth.resume();
        }
    };
} else {
    /* Not available */
    console.warn("Native speech unavailable, falling back to polyfill");
    var scriptURL = currentExecutingScript().src;
    window.rvKey = getParameterByName("key", scriptURL);
    var script = document.createElement('script');
    script.src = "https://code.responsivevoice.org/responsivevoice.js?key=" + window.rvKey;
    document.body.appendChild(script);
}

