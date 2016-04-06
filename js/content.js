(function( root ) {
  'use strict';
  var mp = root.mp = {};

  var createElementFromHTML = mp.createElementFromHTML = function (html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return div.firstChild;
  };


  var injectPopup = mp.injectPopup = function (query) {
    if (!query) {
      query = '';
    }
    var iframe = createElementFromHTML('<div class="mp_popup_container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">' +
      '<div class="mp_popup_backdrop" style="width: 100%; height: 100%; background: rgba(0,0,0,0.5); pointer-events: auto;">&nbsp;</div>' +
      '<div class="mp_popup_content" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"><div style="position: relative; width: 50%; height: 80%; margin-top: 20px; margin-left: auto; margin-right: auto; padding: 20px; box-sizing: border-box; background: #fff; border-radius: 3px; pointer-events: none;">' +
      '<iframe style="width: 100%; height: 100%; border: solid 1px #bcbcbc; pointer-events: auto;" src="' + chrome.extension.getURL('map.html') + query + '"></iframe></div></div></div>');

    var backdrop = iframe.querySelector('.mp_popup_backdrop');
    backdrop.onclick = function (e) {
      iframe.remove();
    }

    root.iframe = iframe;
    document.body.appendChild(iframe);
  };


  var locateSelectedText = mp.locateSelectedText = function () {
    var selectedText = window.getSelection().toString();
    mp.injectPopup('?command=locate_address&address=' + selectedText);
  }


  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (msg.command === 'mp_locate_selected_text') {
        locateSelectedText();
      }
  });


})( this );