(function( root ) {
  'use strict';
  var mp = root.mp = {};

  mp.accessToken = 'pk.eyJ1IjoiYXJpZnduIiwiYSI6ImNpbW9uMzgyNTAwZmd2OWt5YzVjdmpvbnYifQ.eXhQUTPiFMZMHSFaXRdv9Q';
  mp.googleAPIKey = 'AIzaSyCFfWP_S2TXGpFoTVWEG_2imc1Gfg3PG9c';
  mp.mapZoomLevel = 14;
  mp.mapCenterPosition = [-73.973007, 40.764226];
  mp.mapContainerID = 'map';

  var toast = mp.toast = function (message, type) {
    if (!type) {
      type = 'default';
    }

    if ($('#mp_toast_container').length == 0) {
      $('body').append('<div id="mp_toast_container" class="mp-toast-container"></div>');
    }

    var $toast = $('<div class="mp-toast mp-toast-' + type + ' animated bounceInUp">' + message + '</div>');
    $toast.appendTo('#mp_toast_container');
    $toast.one('click', function() {
      mp.removeToast($toast);
    });

    setTimeout(function() {
      mp.removeToast($toast);
    }, 3000);
  };

  var message = mp.message = function (message, type) {
    if (!type) {
      type = 'default';
    }

    if ($('#mp_toast_container').length == 0) {
      $('body').append('<div id="mp_toast_container" class="mp-toast-container"></div>');
    }

    var $toast = $('<div class="mp-toast mp-toast-' + type + ' animated bounceInUp">' + message + '</div>');
    $toast.appendTo('#mp_toast_container');

    return $toast;
  };

  var removeToast = mp.removeToast = function ($toast) {
    $toast.removeClass('bounceInUp');
    $toast.addClass('fadeOut');
    $toast.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () { $toast.remove(); });
  }


  var processDirectCommand = mp.processDirectCommand = function () {
    var initCommand = mp.getParameterByName('command');
    if (initCommand == 'show_current_location') {
      mp.showCurrentLocation();
    }

    if (initCommand == 'locate_address') {
      var address = mp.getParameterByName('address');
      if (address) {
        mp.locateAddress(address);
      }
    }
  };


  var geocode = mp.geocode = function (query, success, error) {
    $.ajax({
      url: 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + query + '.json',
      data: {
        access_token: mp.accessToken
      },
      success: function(data, status, xhr) {
        if (success) {
          success(data);
        }
      },
      error: function () {
        if (error) {
          error();
        }
      }
    });
  };


  var googleMapGeocoder = null;

  var googleMapGeocode = mp.googleMapGeocode = function (query, success, error) {
    
    $.ajax({
      url: 'https://maps.googleapis.com/maps/api/geocode/json',
      data: {
        address: query,
        key: mp.googleAPIKey
      },
      success: function(response, status, xhr) {
        if (success) {
          var data = {
            features: []
          };
          for (var i = 0; i < response.results.length; i++) {
            var result = response.results[i];
            data.features.push({
              text: result.address_components[0].long_name,
              place_name: result.formatted_address,
              geometry: {
                type: 'Point',
                coordinates: [result.geometry.location.lng, result.geometry.location.lat]
              }
            });
          }

          success(data);
        }
      },
      error: function () {
        if (error) {
          error();
        }
      }
    });

  }

  var googleMapReverseGeocode = mp.googleMapReverseGeocode = function (coordinates, success, error) {
    if (!googleMapGeocoder) {
      googleMapGeocoder = new google.maps.Geocoder;
    }

    var latlng = {lat: coordinates[1], lng: coordinates[0]};
    googleMapGeocoder.geocode({'location': latlng}, function(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        var data = {
          features: []
        };
        for (var i = 0; i < results.length; i++) {
          var result = results[i];
          data.features.push({
            text: result.address_components[0].long_name,
            place_name: result.formatted_address,
            geometry: {
              type: 'Point',
              coordinates: [result.geometry.location.lng, result.geometry.location.lat]
            }
          });
        }

        if (data.features.length > 0 ) {
          data.features.splice(0, 1);
        }
        success(data);
      } else {
        error('Geocoder failed due to: ' + status);
      }
    });
  }


  var getParameterByName = mp.getParameterByName = function (name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)", "i");
    var results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  };


  var addTooltip = mp.addTooltip = function (title, content, coordinates) {
    var tooltip = new mapboxgl.Popup({closeOnClick: false})
      .setLngLat(coordinates)
      .setHTML('<h1 class="popup-title">' + title + '</h1><div class="popup-content">' + content + '</div><div class="gmap-link"><a href="https://www.google.com/maps/preview/@' + coordinates[1] + ',' + coordinates[0] + ',12z" target="_blank">open in Google Map</a></div>')
      .addTo(mp.map);
  }


  var showCurrentLocation = mp.showCurrentLocation = function () {
    var messageBox = mp.message('Finding your position...');
    navigator.geolocation.getCurrentPosition(function(position) {
      mp.removeToast(messageBox);

      var coordinates = [position.coords.longitude, position.coords.latitude];
      mp.map.jumpTo({center: coordinates});
      mp.map.getSource('single-point').setData({ type: 'Point', coordinates: coordinates });
      mp.googleMapReverseGeocode(coordinates, function (result) {
        for (var i = 0; i < result.features.length; i++) {
          var feature = result.features[i];
          mp.addTooltip(feature.text + ' <small>(My Position)</small>', feature.place_name, coordinates);

          break;
        }
      });

    }, function(positionError) {
      mp.removeToast(messageBox);
      mp.toast('Unable to find your position', 'error');
    });
  };


  var locateAddress = mp.locateAddress = function (address) {
    var messageBox = mp.message('Locating <b>' + address + '</b>...');
    mp.googleMapGeocode(address, function (result) {
      mp.removeToast(messageBox);
      for (var i = 0; i < result.features.length; i++) {
        var feature = result.features[i];
        mp.map.jumpTo({center: feature.geometry.coordinates});
        mp.map.getSource('single-point').setData(feature.geometry);
        mp.addTooltip(feature.text, feature.place_name, feature.geometry.coordinates);

        break;
      }

      if (result.features.length == 0) {
        mp.toast('Unable lo locate <b>' + address + '</b>!', 'error');
      }

    }, function () {
      mp.removeToast(messageBox);
      mp.toast('Unable to locate address!', 'error');
    });
  };


  var mapboxReady = false;
  var googleMapReady = false;

  root.initMap = function () {
    googleMapReady = true;
    mp.mapReady();
  }

  var mapReady = mp.mapReady = function () {
    if (mapboxReady && googleMapReady) {
      mp.processDirectCommand();
    }
  }

  $(function () {

    mapboxgl.accessToken = mp.accessToken;
    var map = mp.map = new mapboxgl.Map({
        container: mp.mapContainerID,
        style: 'mapbox://styles/mapbox/bright-v8', //stylesheet location
        attributionControl: false,
        center: mp.mapCenterPosition,
        zoom: mp.mapZoomLevel
    });

    var geocoder = mp.geocoder = new mapboxgl.Geocoder({
        container: 'geocoder-container' // Optional. Specify a unique container for the control to be added to.
    });

    map.addControl(geocoder);
    map.addControl(new mapboxgl.Navigation());

    // After the map style has loaded on the page, add a source layer and default
    // styling for a single point.
    map.on('style.load', function() {
      map.addSource('single-point', {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": []
        }
      });

      map.addLayer({
        "id": "point",
        "source": "single-point",
        "type": "circle",
        "paint": {
          "circle-radius": 10,
          "circle-color": "#007cbf"
        }
      });

      mapboxReady = true;
      mp.mapReady();

      // Listen for the `geocoder.input` event that is triggered when a user
      // makes a selection and add a marker that matches the result.
      geocoder.on('result', function(ev) {
        mp.map.jumpTo({center: ev.result.geometry.coordinates});
        mp.map.getSource('single-point').setData(ev.result.geometry);
        mp.addTooltip(ev.result.text, ev.result.place_name, ev.result.geometry.coordinates);
      });
    });



    window.addEventListener("message", function(e) {
      var message = e.data;
      if (message.command == 'show_current_location') {
        mp.showCurrentLocation();
      }
      if (message.command == 'locate_address') {
        var address = message.address;
        if (address) {
          mp.locateAddress(address);
        }
      }
    });

  });

})( this );