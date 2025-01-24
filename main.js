import './style.css';
import {Feature, Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import StadiaMaps from 'ol/source/StadiaMaps'
import VectorSource from 'ol/source/Vector';
import {fromLonLat} from "ol/proj";
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from "ol/layer/Vector";
import {Circle as CircleStyle, Fill, Icon, Stroke, Style} from 'ol/style';
import {Point, Polygon} from "ol/geom";
import {Heatmap as HeatmapLayer} from 'ol/layer.js';
import KML from 'ol/format/KML.js';
import {getVectorContext} from 'ol/render.js';

const image = new CircleStyle({
    radius: 5,
    fill: null,
    stroke: new Stroke({color: 'purple', width: 10}),
});


const styles = (feature) => {
    const isActive = feature.get('isActive') === true;
    return ({
        'Polygon': new Style({
            stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.5)',
                width: isActive ? 4 : 1,
            }),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
        }),
    'MultiPolygon': new Style({
            stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.5)',
                width: isActive ? 4 : 1,
            }),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
        }),

    });
}

const styleFunction = function (feature) {
    return styles(feature)[feature.getGeometry().getType()];
};

const style = new Style({
    fill: new Fill({
      color: 'black',
    }),
  });
  

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }  

const fetchData = async () => {
    // const response = await fetch('./static/Moscow.geojson');
    const baseResponse = await fetch('./static/Moscow.geojson');
    const baseGeoJson = await baseResponse.json();


    const baseVectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(baseGeoJson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        }),
    });

    const baseVectorLayer = new VectorLayer({
        source: baseVectorSource,
        style: styleFunction,
    });

    

    const baseTile = new TileLayer({
        source: new OSM(),
        // source: new StadiaMaps({
        //   layer: 'alidade_smooth_dark',
        //   retina: true,
        //   // apiKey: 'OPTIONAL'
        // }),
    });

    baseTile.on('prerender', (evt) => {
        // return
        if (evt.context) {
            const context = evt.context;
            context.filter = 'grayscale(80%) invert(100%) hue-rotate(0deg)';
            context.globalCompositeOperation = 'source-over';
        }
    });

    baseTile.on('postrender', (evt) => {
        if (evt.context) {
            const context = evt.context;
            context.filter = 'none';
        }
    });

    


    

const clipTile = new TileLayer({
    source: new OSM(),
    
});

clipTile.on('prerender', (evt) => {
    // return
    if (evt.context) {
        const context = evt.context;
        context.filter = 'grayscale(80%) invert(100%) hue-rotate(0deg)';
        context.globalCompositeOperation = 'source-over';
    }
});

clipTile.on('postrender', (evt) => {
    if (evt.context) {
        const context = evt.context;
        context.filter = 'none';
    }
});


const vector = new HeatmapLayer({
    source: new VectorSource({
      url: './static/2012_Earthquakes_Mag5.kml',
      format: new KML({
        extractStyles: false,
      }),
    }),
    blur: 100,
    radius: 200,
    weight: function (feature) {
      // 2012_Earthquakes_Mag5.kml stores the magnitude of each earthquake in a
      // standards-violating <magnitude> tag in each Placemark.  We extract it from
      // the Placemark's name instead.
      const name = feature.get('name');
      const magnitude = parseFloat(name.substr(2));
      return magnitude - 5;
    },
  });



  

  vector.setGradient(['#ffffff', '#00ff00', '#0000ff'])

  
  const clipResponse = await fetch('./static/moscow_full.geojson');
    const clipGeoJson = await clipResponse.json();


    const clipVectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(clipGeoJson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        }),
    });

    const clipVectorLayer = new VectorLayer({
        source: clipVectorSource,
        style: styleFunction,
    });

    clipVectorLayer.getSource().on('addfeature', function () {
        clipTile.setExtent(clipVectorLayer.getSource().getExtent());
      });

      baseTile.on('postrender', function (e) {
        const vectorContext = getVectorContext(e);
        e.context.globalCompositeOperation = 'destination-out';
        clipVectorLayer.getSource().forEachFeature(function (feature) {
          vectorContext.drawFeature(feature, style);
        });
        e.context.globalCompositeOperation = 'source-over';
      });

      clipTile.on('postrender', function (e) {
        const vectorContext = getVectorContext(e);
        e.context.globalCompositeOperation = 'destination-in';
        clipVectorLayer.getSource().forEachFeature(function (feature) {
          vectorContext.drawFeature(feature, style);
        });
        e.context.globalCompositeOperation = 'source-over';
      });
      


    const map = new Map({
        target: 'map',
        layers: [
            clipTile,
            vector, 
            baseTile,
            clipVectorLayer,
            baseVectorLayer,
        ],
        view: new View({
            center: fromLonLat([37.618423, 55.751244]),
            zoom: 11,
            minZoom: 11
        }),
    });

    baseVectorSource.getFeatures().forEach((feature, idx) => {
        if (feature.getGeometry().getType() === 'Polygon') {
            const coords = feature.getGeometry().getExtent();
            const iconFeature = new Feature({
                geometry: new Point([(coords[0] + coords[2]) / 2, (coords[1] + coords[3]) / 2])
            })

            const svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" height="150px" width="150px" viewBox="0 0 20 20">

<circle r="5" cx="10" cy="10" fill="bisque" /> 
<circle r="5" cx="10" cy="10" fill="transparent"
      stroke="tomato"
      stroke-width="10"
      stroke-dasharray="10.99 31.4" />
<circle r="5" cx="10" cy="10" fill="transparent"
      stroke="dodgerblue"
      stroke-width="10"
      stroke-dasharray="4.71 31.4"
stroke-dashoffset="-10.99"
/>
<circle r="5" cx="10" cy="10" fill="transparent"
      stroke="gold"
      stroke-width="10"
      stroke-dasharray="9.42 31.4"
stroke-dashoffset="-15.7"
/>
<circle r="5" cx="10" cy="10" fill="transparent"
      stroke="yellowgreen"
      stroke-width="10"
      stroke-dasharray="6.28 31.4"
stroke-dashoffset="-25.12"
/>
<circle r="8" cx="10" cy="10"/>
<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="5px" fill="white" >${getRandomInt(1000)}</text>
</svg>`;

            const style = new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'data:image/svg+xml;utf8,' + svg,
                    scale: 0.3
                })
            });

            iconFeature.setStyle(style)

            const vectorSource = new VectorSource({
                features: [iconFeature],
            });

            const vectorLayer = new VectorLayer({
                source: vectorSource,
            });

            map.addLayer(vectorLayer);
        }
    }
)

    let lastFeature = null;

    map.on('pointermove', (evt) => {
        if (lastFeature) {
            lastFeature.set('isActive', false);
        }
        baseVectorSource.forEachFeatureAtCoordinateDirect(evt.coordinate, feature => {
            lastFeature = feature;
            feature.set('isActive', true)
        })
    })

    map.on('click', (evt) => {
        baseVectorSource.forEachFeatureAtCoordinateDirect(evt.coordinate, feature => {
            map.getView().fit(feature.getGeometry());
            // lastFeature = feature;
            
            feature.set('isActive', true);
        })
    })
}

fetchData();






